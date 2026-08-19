/**
 * PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1
 * Observability-only: stage timers at existing ensureCheckForOrder boundaries.
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
  getOrderById: vi.fn(),
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
  createSettlementRecordForCheckFinalize: vi.fn(),
  loadChargesSubtotal: vi.fn(),
  ensureOpenCheckChargeComposition: vi.fn(),
}));

const fakeTx = { __tx: true };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrdersByIds: (...a: unknown[]) => mocks.getOrdersByIds(...a),
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
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
  touchOpenCheck: vi.fn(async () => 1),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
  listSettlementTransactionsForCheck: vi.fn(async () => []),
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

vi.mock("../checkChargeComposition", () => ({
  loadChargesSubtotal: (...a: unknown[]) => mocks.loadChargesSubtotal(...a),
  ensureOpenCheckChargeComposition: (...a: unknown[]) =>
    mocks.ensureOpenCheckChargeComposition(...a),
  ensureOpenCheckChargesSubtotal: async (...a: unknown[]) => {
    await mocks.ensureOpenCheckChargeComposition(...a);
    return mocks.loadChargesSubtotal(...a);
  },
  snapshotChargesForEnrolledOrder: vi.fn(),
  compensateChargesForCancelledOrder: vi.fn(),
  reconcileOpenOrderCharges: vi.fn(),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import { ensureCheckForOrder } from "../CheckService";
import {
  createEmptyEnsureCheckForOrderStageMs,
  type ChargeInsertTiming,
} from "../ensureCheckForOrderStageMs";

const sessionlessOpenCheck = {
  id: 200,
  restaurantId: 1,
  sessionId: null,
  outcome: "open" as const,
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    taxEnabled: false,
    taxMode: "exclusive" as const,
    rates: [],
  },
  subtotal: "0.00",
  taxAmount: "0.00",
  taxBreakdown: [],
  grandTotal: "0.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-07-22 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

describe("PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.updateCheckMoney.mockResolvedValue(undefined);
    mocks.findSessionById.mockResolvedValue(null);
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
    });
    mocks.ensureOrderSettlementForEnrollment.mockImplementation(async () => {
      await delay(12);
      return { settlements: [], events: [], outcomes: ["applied"] };
    });
    mocks.recalculateOrderSettlementsForCheck.mockImplementation(async () => {
      await delay(8);
      return { settlements: [], events: [], outcomes: [] };
    });
    mocks.ensureOpenCheckChargeComposition.mockImplementation(async () => {
      await delay(6);
    });
    mocks.loadChargesSubtotal.mockImplementation(async () => {
      await delay(6);
      return "10.00";
    });
    mocks.enrollOrderInCheck.mockImplementation(
      async (_input, _tx, timing?: ChargeInsertTiming) => {
        await delay(10);
        if (timing) {
          timing.createMs = 9;
          timing.count = 2;
          timing.insertMs = 7;
          timing.maxInsertMs = 4;
        }
        return "enrolled";
      }
    );
  });

  it("records create and financial-transaction stages for a new Check", async () => {
    mocks.findBlockingMembershipForOrder.mockImplementation(async () => {
      await delay(15);
      return null;
    });
    mocks.insertOperationalCheck.mockImplementation(async () => {
      await delay(15);
      return 200;
    });
    mocks.findCheckById.mockResolvedValue({
      ...sessionlessOpenCheck,
      subtotal: "10.00",
      grandTotal: "10.00",
    });

    const sequence: string[] = [];
    mocks.enrollOrderInCheck.mockImplementation(
      async (_input, _tx, timing?: ChargeInsertTiming) => {
        sequence.push("enroll");
        if (timing) {
          timing.createMs = 9;
          timing.count = 2;
          timing.insertMs = 7;
          timing.maxInsertMs = 4;
        }
        return "enrolled";
      }
    );
    mocks.ensureOrderSettlementForEnrollment.mockImplementation(async () => {
      sequence.push("os-insert");
      return { settlements: [], events: [], outcomes: ["applied"] };
    });
    mocks.ensureOpenCheckChargeComposition.mockImplementation(async () => {
      sequence.push("charge-list-1");
    });
    mocks.loadChargesSubtotal.mockImplementation(async () => {
      sequence.push("charge-list-2");
      return "10.00";
    });
    mocks.updateCheckMoney.mockImplementation(async () => {
      sequence.push("persist");
    });
    mocks.recalculateOrderSettlementsForCheck.mockImplementation(async () => {
      sequence.push("os-recalc");
      return { settlements: [], events: [], outcomes: [] };
    });

    const stageMs = createEmptyEnsureCheckForOrderStageMs();
    const check = await ensureCheckForOrder({
      restaurantId: 1,
      orderId: 55,
      stageMs,
      terminalId: "term-1",
    });

    expect(check.id).toBe(200);
    expect(stageMs.checkCreated).toBe(true);
    expect(stageMs.totalMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.membershipLookupMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.createOpenCheckMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.taxSnapshotMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.checkInsertMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.txPreparationMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.txWallMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.txWriteMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.enrollMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.chargeCreateMs).toBe(9);
    expect(stageMs.chargeInsertCount).toBe(2);
    expect(stageMs.chargeInsertMs).toBe(7);
    expect(stageMs.chargeInsertMaxMs).toBe(4);
    expect(stageMs.orderSettlementInsertMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.chargeListEnsureMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.chargeListSumMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.computeCheckMoneyMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.checkMoneyPersistMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.orderSettlementRecalcMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.checkReloadMs).toBeGreaterThanOrEqual(0);
    expect(stageMs.unaccountedMs).toBeGreaterThanOrEqual(0);
    expect(
      stageMs.membershipLookupMs +
        (stageMs.createOpenCheckMs ?? 0) +
        (stageMs.txPreparationMs ?? 0) +
        (stageMs.txWallMs ?? 0) +
        (stageMs.unaccountedMs ?? 0)
    ).toBe(stageMs.totalMs);

    expect(sequence).toEqual([
      "enroll",
      "os-insert",
      "charge-list-1",
      "charge-list-2",
      "persist",
      "os-recalc",
    ]);
    expect(mocks.getDb).toHaveBeenCalledTimes(1);
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
    expect(mocks.insertOperationalCheck).toHaveBeenCalledTimes(1);

    const event = vi.mocked(opsLog).mock.calls
      .map((call) => call[0])
      .find((row) => row?.type === OPS_EVENT.check_ensure_for_order);
    expect(event).toBeDefined();
    expect(event?.category).toBe("ORDER");
    expect(event?.severity).toBe("info");
    expect(event?.metadata).toEqual(
      expect.objectContaining({
        restaurantId: 1,
        orderId: 55,
        checkId: 200,
        terminalId: "term-1",
        ensureTotalMs: stageMs.totalMs,
        checkCreated: true,
        membershipLookupMs: stageMs.membershipLookupMs,
        createOpenCheckMs: stageMs.createOpenCheckMs,
        txWallMs: stageMs.txWallMs,
        unaccountedMs: stageMs.unaccountedMs,
      })
    );
    expect(event?.metadata).not.toHaveProperty("grandTotal");
    expect(event?.metadata).not.toHaveProperty("taxAmount");
    expect(event?.metadata).not.toHaveProperty("subtotal");
  });

  it("leaves createOpenCheck stages null when the Check already exists", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      checkOutcome: "open",
      membership: { checkId: 200, orderId: 55 },
    });
    mocks.findCheckById.mockResolvedValue({
      ...sessionlessOpenCheck,
      subtotal: "10.00",
      grandTotal: "10.00",
    });

    const stageMs = createEmptyEnsureCheckForOrderStageMs();
    await ensureCheckForOrder({
      restaurantId: 1,
      orderId: 55,
      stageMs,
    });

    expect(stageMs.checkCreated).toBe(false);
    expect(stageMs.createOpenCheckMs).toBeNull();
    expect(stageMs.taxSnapshotMs).toBeNull();
    expect(stageMs.checkInsertMs).toBeNull();
    expect(stageMs.computeCheckMoneySeedMs).toBeNull();
    expect(stageMs.txWallMs).not.toBeNull();
    expect(stageMs.enrollMs).not.toBeNull();
    expect(stageMs.orderSettlementInsertMs).not.toBeNull();
    expect(stageMs.computeCheckMoneyMs).not.toBeNull();
    expect(stageMs.totalMs).toBeGreaterThanOrEqual(0);
    expect(mocks.insertOperationalCheck).not.toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
    expect(mocks.getDb).toHaveBeenCalledTimes(1);
  });
});
