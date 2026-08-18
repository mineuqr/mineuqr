/**
 * ORDER-SETTLEMENT-INTEGRATION-1 — Check Aggregate consistency + transaction rollback.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSessionById: vi.fn(),
  findOpenCheckBySessionId: vi.fn(),
  findCheckById: vi.fn(),
  insertOperationalCheck: vi.fn(),
  updateSessionActiveCheckId: vi.fn(),
  updateCheckMoney: vi.fn(),
  finalizeCheckOutcome: vi.fn(),
  insertSettlementTransactions: vi.fn(),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
  getDb: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  enrollOrderInCheck: vi.fn(),
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  ensureOrderSettlementForEnrollment: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  refundOrderSettlementsForCheck: vi.fn(),
  cancelOrderSettlementForOrder: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
}));

const fakeTx = { __tx: true };

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrdersByIds: (...a: unknown[]) => mocks.getOrdersByIds(...a),
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: (...a: unknown[]) => mocks.findSessionById(...a),
  updateSessionActiveCheckId: (...a: unknown[]) =>
    mocks.updateSessionActiveCheckId(...a),
}));

vi.mock("../checkRepository", () => ({
  findOpenCheckBySessionId: (...a: unknown[]) =>
    mocks.findOpenCheckBySessionId(...a),
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
  insertOperationalCheck: (...a: unknown[]) => mocks.insertOperationalCheck(...a),
  updateCheckMoney: (...a: unknown[]) => mocks.updateCheckMoney(...a),
  finalizeCheckOutcome: (...a: unknown[]) => mocks.finalizeCheckOutcome(...a),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
}));

vi.mock("../checkMembershipService", () => ({
  syncSessionOrdersToCheck: (...a: unknown[]) =>
    mocks.syncSessionOrdersToCheck(...a),
  deactivateMembershipsOnCheckVoid: (...a: unknown[]) =>
    mocks.deactivateMembershipsOnCheckVoid(...a),
  enrollOrderInCheck: (...a: unknown[]) => mocks.enrollOrderInCheck(...a),
  CheckMembershipError: class CheckMembershipError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CheckMembershipError";
    }
  },
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
  findBlockingMembershipForOrder: (...a: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...a),
}));

vi.mock("../checkOrderSettlementIntegration", () => ({
  ensureOrderSettlementForEnrollment: (...a: unknown[]) =>
    mocks.ensureOrderSettlementForEnrollment(...a),
  recalculateOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.recalculateOrderSettlementsForCheck(...a),
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
  applyComplimentaryToCheckOrders: (...a: unknown[]) =>
    mocks.applyComplimentaryToCheckOrders(...a),
  voidOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.voidOrderSettlementsForCheck(...a),
  refundOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.refundOrderSettlementsForCheck(...a),
  cancelOrderSettlementForOrder: (...a: unknown[]) =>
    mocks.cancelOrderSettlementForOrder(...a),
  applyPartialSettlementForOrder: (...a: unknown[]) =>
    mocks.applyPartialSettlementForOrder(...a),
  ensureOrderSettlementsForCheck: vi.fn(),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

import {
  applyPartialOrderSettlementOnCheck,
  cancelOrderSettlementOnCheck,
  refundOrderSettlementsOnCheck,
  settleCheckPaidById,
  settleCheckPaidByIdDetailed,
  voidCheckById,
} from "../CheckService";

const openCheck = {
  id: 100,
  restaurantId: 1,
  sessionId: 10,
  outcome: "open" as const,
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    taxEnabled: false,
    taxMode: "exclusive" as const,
    rates: [],
  },
  subtotal: "20.00",
  taxAmount: "0.00",
  taxBreakdown: [],
  grandTotal: "20.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-07-22 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

describe("ORDER-SETTLEMENT-INTEGRATION-1 Check Aggregate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
    });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "served", totalAmount: "20.00" },
    ]);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);
    mocks.deactivateMembershipsOnCheckVoid.mockResolvedValue(undefined);
    mocks.applyFullSettlementToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [{ eventType: "OrderSettlementSettled" }],
      outcomes: ["applied"],
    });
    mocks.applyComplimentaryToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.voidOrderSettlementsForCheck.mockResolvedValue({
      settlements: [],
      events: [{ eventType: "OrderSettlementVoided" }],
      outcomes: ["applied"],
    });
    mocks.cancelOrderSettlementForOrder.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.applyPartialSettlementForOrder.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.refundOrderSettlementsForCheck.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:100:settlement:1" },
      events: [{ eventType: "SettlementRecordCreated" }],
      outcome: "applied",
    });
  });

  it("paid settle runs Check + tenders + OS inside one transaction client", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
    });

    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "paid" }),
      fakeTx
    );
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ checkId: 100 }),
      fakeTx
    );
    expect(mocks.applyFullSettlementToCheckOrders).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      fakeTx
    );
    expect(detailed.orderSettlementEvents[0]?.eventType).toBe(
      "OrderSettlementSettled"
    );
    expect(mocks.createSettlementRecordForCheckFinalize).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        outcome: "paid",
      }),
      fakeTx
    );
    expect(detailed.settlementRecordEvents[0]?.eventType).toBe(
      "SettlementRecordCreated"
    );
    expect(detailed.check.outcome).toBe("paid");
    expect(detailed.finalizeStageMs.checkReloadMs).toBeGreaterThanOrEqual(0);
    expect(detailed.finalizeStageMs.orderDiscoveryMs).toBeGreaterThanOrEqual(0);
    expect(detailed.finalizeStageMs.contextResolveMs).toBeGreaterThanOrEqual(0);
    expect(detailed.finalizeStageMs.moneyTxMs).toBeGreaterThanOrEqual(0);
    expect(detailed.finalizeStageMs.attributionMs).toBeGreaterThanOrEqual(0);
  });

  it("rolls back complete financial operation when OS apply fails", async () => {
    mocks.findCheckById.mockResolvedValue(openCheck);
    mocks.applyFullSettlementToCheckOrders.mockRejectedValue(
      new Error("OS CAS conflict")
    );

    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/OS CAS conflict/);

    // All mutations were attempted inside the same tx callback; failure aborts commit.
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalled();
    expect(mocks.insertSettlementTransactions).toHaveBeenCalled();
    expect(mocks.applyFullSettlementToCheckOrders).toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
  });

  it("rolls back complete financial operation when Settlement Record insert fails", async () => {
    mocks.findCheckById.mockResolvedValue(openCheck);
    mocks.createSettlementRecordForCheckFinalize.mockRejectedValue(
      new Error("SR insert failed")
    );

    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/SR insert failed/);

    expect(mocks.finalizeCheckOutcome).toHaveBeenCalled();
    expect(mocks.applyFullSettlementToCheckOrders).toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "paid" }),
      fakeTx
    );
  });

  it("rolls back when membership void fails after OS void", async () => {
    mocks.findCheckById.mockResolvedValue(openCheck);
    mocks.deactivateMembershipsOnCheckVoid.mockRejectedValue(
      new Error("membership deactivate failed")
    );

    await expect(
      voidCheckById({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/membership deactivate failed/);

    expect(mocks.voidOrderSettlementsForCheck).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      fakeTx
    );
    expect(mocks.deactivateMembershipsOnCheckVoid).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      fakeTx
    );
  });

  it("exposes Aggregate cancel / partial / refund commands", async () => {
    await cancelOrderSettlementOnCheck({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });
    expect(mocks.cancelOrderSettlementForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 55 }),
      fakeTx
    );

    mocks.findCheckById.mockResolvedValue(openCheck);
    await applyPartialOrderSettlementOnCheck({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
      coverageAmount: "5.00",
    });
    expect(mocks.applyPartialSettlementForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ coverageAmount: "5.00" }),
      fakeTx
    );

    await refundOrderSettlementsOnCheck({
      restaurantId: 1,
      checkId: 100,
    });
    expect(mocks.refundOrderSettlementsForCheck).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      fakeTx
    );
  });
});
