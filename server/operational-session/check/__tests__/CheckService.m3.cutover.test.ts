/**
 * CHECK-GENERALIZATION-M3 — membership-authoritative Check money discovery.
 * COMPATIBILITY-CLEANUP-1 — Session-scan rollback path removed.
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
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
  loadChargesSubtotal: vi.fn(),
  ensureOpenCheckChargeComposition: vi.fn(),
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

vi.mock("../checkOrderSettlementIntegration", () => ({
  recalculateOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.recalculateOrderSettlementsForCheck(...a),
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
  applyComplimentaryToCheckOrders: (...a: unknown[]) =>
    mocks.applyComplimentaryToCheckOrders(...a),
  voidOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.voidOrderSettlementsForCheck(...a),
  ensureOrderSettlementForEnrollment: vi.fn(),
  ensureOrderSettlementsForCheck: vi.fn(),
  refundOrderSettlementsForCheck: vi.fn(),
  cancelOrderSettlementForOrder: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
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
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

vi.mock("../checkChargeComposition", () => ({
  loadChargesSubtotal: (...a: unknown[]) => mocks.loadChargesSubtotal(...a),
  ensureOpenCheckChargeComposition: (...a: unknown[]) =>
    mocks.ensureOpenCheckChargeComposition(...a),
  snapshotChargesForEnrolledOrder: vi.fn(),
  compensateChargesForCancelledOrder: vi.fn(),
  reconcileOpenOrderCharges: vi.fn(),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

import {
  createOpenCheckForSession,
  recalculateOpenCheckForSession,
  settleCheckPaidById,
  voidCheckById,
} from "../CheckService";

const openCheckRow = {
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
  subtotal: "10.00",
  taxAmount: "0.00",
  taxBreakdown: [],
  grandTotal: "10.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-07-22 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

describe("CHECK-GENERALIZATION-M3 CheckService cutover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findSessionById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      status: "open",
      activeCheckId: 100,
    });
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.syncSessionOrdersToCheck.mockResolvedValue(undefined);
    mocks.updateCheckMoney.mockResolvedValue(undefined);
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
    });
    mocks.recalculateOrderSettlementsForCheck.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: [],
    });
    mocks.applyFullSettlementToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.applyComplimentaryToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.voidOrderSettlementsForCheck.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:100:settlement:1" },
      events: [],
      outcome: "applied",
    });
    mocks.ensureOpenCheckChargeComposition.mockResolvedValue(undefined);
    mocks.loadChargesSubtotal.mockResolvedValue("0.00");
  });

  it("recalculate uses Charge composition", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.loadChargesSubtotal.mockResolvedValue("15.00");

    await recalculateOpenCheckForSession({ restaurantId: 1, sessionId: 10 });

    expect(mocks.loadChargesSubtotal).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      undefined
    );
    expect(mocks.getOrdersByIds).not.toHaveBeenCalled();
    expect(mocks.updateCheckMoney).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 100,
        subtotal: "15.00",
        grandTotal: "15.00",
      }),
      undefined
    );
  });

  it("create syncs membership then refreshes money from Charges", async () => {
    mocks.findSessionById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      status: "open",
      activeCheckId: null,
    });
    mocks.findOpenCheckBySessionId.mockResolvedValue(null);
    mocks.insertOperationalCheck.mockResolvedValue(100);
    mocks.loadChargesSubtotal.mockResolvedValue("10.00");
    mocks.findCheckById.mockResolvedValue(openCheckRow);

    await createOpenCheckForSession({ restaurantId: 1, sessionId: 10 });

    expect(mocks.syncSessionOrdersToCheck).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        sessionId: 10,
        checkId: 100,
      },
      undefined
    );
    expect(mocks.loadChargesSubtotal).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      undefined
    );
    expect(mocks.updateCheckMoney).toHaveBeenCalled();
    expect(mocks.recalculateOrderSettlementsForCheck).toHaveBeenCalled();
  });

  it("settleCheckPaidById freezes membership-derived totals", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce({
        ...openCheckRow,
        outcome: "paid",
        totalsFrozenAt: "2026-07-22 11:00:00",
        settledAt: "2026-07-22 11:00:00",
        grandTotal: "10.00",
      });
    mocks.loadChargesSubtotal.mockResolvedValue("10.00");
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);

    const result = await settleCheckPaidById({ restaurantId: 1, checkId: 100 });

    expect(mocks.loadChargesSubtotal).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 100,
    });
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "paid",
        grandTotal: "10.00",
      }),
      fakeTx
    );
    expect(mocks.applyFullSettlementToCheckOrders).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      fakeTx
    );
    expect(result.outcome).toBe("paid");
  });

  it("voidCheckById uses Charge composition then deactivates memberships", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce({
        ...openCheckRow,
        outcome: "voided",
        voidedAt: "2026-07-22 11:00:00",
        totalsFrozenAt: "2026-07-22 11:00:00",
      });
    mocks.loadChargesSubtotal.mockResolvedValue("0.00");
    mocks.finalizeCheckOutcome.mockResolvedValue(1);

    await voidCheckById({ restaurantId: 1, checkId: 100 });

    expect(mocks.loadChargesSubtotal).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 100,
    });
    expect(mocks.voidOrderSettlementsForCheck).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100 },
      fakeTx
    );
    expect(mocks.deactivateMembershipsOnCheckVoid).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        checkId: 100,
      },
      fakeTx
    );
  });
});
