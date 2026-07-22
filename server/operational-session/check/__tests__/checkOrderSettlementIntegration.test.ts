/**
 * ORDER-SETTLEMENT-INTEGRATION-1 — Aggregate orchestration + Domain + Repository.
 * Domain is real; repository / order lookup / Check finalize deps are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderSettlement } from "@shared/operational-session";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  findOrderSettlementByIdentity: vi.fn(),
  existsOrderSettlement: vi.fn(),
  listOrderSettlementsForCheck: vi.fn(),
  insertOrderSettlement: vi.fn(),
  updateOrderSettlement: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
}));

vi.mock("../orderSettlementRepository", () => {
  class OrderSettlementPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "OrderSettlementPersistenceError";
      this.code = code;
    }
  }
  return {
    OrderSettlementPersistenceError,
    findOrderSettlementByIdentity: (...a: unknown[]) =>
      mocks.findOrderSettlementByIdentity(...a),
    existsOrderSettlement: (...a: unknown[]) => mocks.existsOrderSettlement(...a),
    listOrderSettlementsForCheck: (...a: unknown[]) =>
      mocks.listOrderSettlementsForCheck(...a),
    insertOrderSettlement: (...a: unknown[]) => mocks.insertOrderSettlement(...a),
    updateOrderSettlement: (...a: unknown[]) => mocks.updateOrderSettlement(...a),
  };
});

import {
  applyComplimentaryToCheckOrders,
  applyFullSettlementToCheckOrders,
  applyPartialSettlementForOrder,
  cancelOrderSettlementForOrder,
  ensureOrderSettlementForEnrollment,
  recalculateOrderSettlementsForCheck,
  refundOrderSettlementsForCheck,
  voidOrderSettlementsForCheck,
} from "../checkOrderSettlementIntegration";

const AT = "2026-07-22 12:00:00";

function pendingSettlement(
  overrides: Partial<OrderSettlement> = {}
): OrderSettlement {
  return {
    restaurantId: 1,
    checkId: 100,
    orderId: 55,
    status: "pending",
    orderTotalSnapshot: "20.00",
    allocatedAmount: "20.00",
    settledAmount: "0.00",
    outstandingAmount: "20.00",
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

describe("ORDER-SETTLEMENT-INTEGRATION-1 orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listOrderSettlementsForCheck.mockResolvedValue([]);
    mocks.insertOrderSettlement.mockResolvedValue(1);
    mocks.updateOrderSettlement.mockResolvedValue(undefined);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      totalAmount: "20.00",
    });
  });

  it("creates Order Settlement on enrollment", async () => {
    mocks.findOrderSettlementByIdentity.mockResolvedValue(null);

    const result = await ensureOrderSettlementForEnrollment({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });

    expect(result.outcomes).toEqual(["applied"]);
    expect(result.settlements[0]?.status).toBe("pending");
    expect(result.events[0]?.eventType).toBe("OrderSettlementCreated");
    expect(mocks.insertOrderSettlement).toHaveBeenCalledTimes(1);
  });

  it("idempotent enrollment does not duplicate create", async () => {
    const existing = pendingSettlement();
    mocks.findOrderSettlementByIdentity.mockResolvedValue(existing);

    const result = await ensureOrderSettlementForEnrollment({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });

    expect(result.outcomes).toEqual(["already_in_state"]);
    expect(mocks.insertOrderSettlement).not.toHaveBeenCalled();
    expect(result.events).toEqual([]);
  });

  it("applies partial then full settlement via repository CAS", async () => {
    const pending = pendingSettlement();
    mocks.findOrderSettlementByIdentity.mockResolvedValue(pending);

    const partial = await applyPartialSettlementForOrder({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
      coverageAmount: "8.00",
    });

    expect(partial.outcomes).toEqual(["applied"]);
    expect(partial.settlements[0]?.status).toBe("partially_settled");
    expect(partial.settlements[0]?.settledAmount).toBe("8.00");
    expect(mocks.updateOrderSettlement).toHaveBeenCalledWith(
      expect.objectContaining({ status: "partially_settled" }),
      { expectedStatus: "pending" },
      undefined
    );

    const afterPartial = partial.settlements[0]!;
    mocks.listOrderSettlementsForCheck.mockResolvedValue([afterPartial]);

    const full = await applyFullSettlementToCheckOrders({
      restaurantId: 1,
      checkId: 100,
    });

    expect(full.outcomes).toEqual(["applied"]);
    expect(full.settlements[0]?.status).toBe("settled");
    expect(full.settlements[0]?.outstandingAmount).toBe("0.00");
    expect(mocks.updateOrderSettlement).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "settled" }),
      { expectedStatus: "partially_settled" },
      undefined
    );
  });

  it("applies complimentary settlement", async () => {
    mocks.listOrderSettlementsForCheck.mockResolvedValue([pendingSettlement()]);

    const result = await applyComplimentaryToCheckOrders({
      restaurantId: 1,
      checkId: 100,
    });

    expect(result.settlements[0]?.status).toBe("complimentary");
    expect(result.events[0]?.eventType).toBe("OrderSettlementComplimentary");
  });

  it("cancels Order Settlement", async () => {
    mocks.findOrderSettlementByIdentity.mockResolvedValue(pendingSettlement());

    const result = await cancelOrderSettlementForOrder({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });

    expect(result.settlements[0]?.status).toBe("cancelled");
    expect(result.settlements[0]?.settledAmount).toBe("0.00");
  });

  it("voids Order Settlements on Check", async () => {
    mocks.listOrderSettlementsForCheck.mockResolvedValue([pendingSettlement()]);

    const result = await voidOrderSettlementsForCheck({
      restaurantId: 1,
      checkId: 100,
    });

    expect(result.settlements[0]?.status).toBe("voided");
    expect(result.events[0]?.eventType).toBe("OrderSettlementVoided");
  });

  it("refunds settled Order Settlements", async () => {
    mocks.listOrderSettlementsForCheck.mockResolvedValue([
      pendingSettlement({
        status: "settled",
        settledAmount: "20.00",
        outstandingAmount: "0.00",
      }),
    ]);

    const result = await refundOrderSettlementsForCheck({
      restaurantId: 1,
      checkId: 100,
    });

    expect(result.settlements[0]?.status).toBe("refunded");
    expect(result.settlements[0]?.settledAmount).toBe("0.00");
  });

  it("duplicate full settle is already_in_state (no persist)", async () => {
    mocks.listOrderSettlementsForCheck.mockResolvedValue([
      pendingSettlement({
        status: "settled",
        settledAmount: "20.00",
        outstandingAmount: "0.00",
      }),
    ]);

    const result = await applyFullSettlementToCheckOrders({
      restaurantId: 1,
      checkId: 100,
    });

    expect(result.outcomes).toEqual(["already_in_state"]);
    expect(mocks.updateOrderSettlement).not.toHaveBeenCalled();
    expect(result.events).toEqual([]);
  });

  it("recalculates pending settlements from Order totals", async () => {
    mocks.listOrderSettlementsForCheck.mockResolvedValue([pendingSettlement()]);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      totalAmount: "25.00",
    });

    const result = await recalculateOrderSettlementsForCheck({
      restaurantId: 1,
      checkId: 100,
    });

    expect(result.outcomes).toEqual(["applied"]);
    expect(result.settlements[0]?.orderTotalSnapshot).toBe("25.00");
    expect(result.settlements[0]?.outstandingAmount).toBe("25.00");
  });
});
