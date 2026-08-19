/**
 * CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1
 * Observability-only: stage timers at existing finalizeOpenCheckById boundaries.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { skippedAttribution } from "@shared/crmp";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  finalizeCheckOutcome: vi.fn(),
  insertSettlementTransactions: vi.fn(),
  getOrdersByIds: vi.fn(),
  getDb: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
  resolveSettlementContextForSettle: vi.fn(),
  adoptSettlementAttributionAfterFinalize: vi.fn(),
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
  getRestaurantById: vi.fn(),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: vi.fn(),
  updateSessionActiveCheckId: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findOpenCheckBySessionId: vi.fn(),
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
  insertOperationalCheck: vi.fn(),
  updateCheckMoney: vi.fn(),
  finalizeCheckOutcome: (...a: unknown[]) => mocks.finalizeCheckOutcome(...a),
  touchOpenCheck: vi.fn(async () => 1),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
  listSettlementTransactionsForCheck: vi.fn(async () => []),
}));

vi.mock("../checkMembershipService", () => ({
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  enrollOrderInCheck: vi.fn(),
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
  findBlockingMembershipForOrder: vi.fn(),
}));

vi.mock("../checkChargeComposition", () => ({
  loadChargesSubtotal: (...a: unknown[]) => mocks.loadChargesSubtotal(...a),
  ensureOpenCheckChargeComposition: (...a: unknown[]) =>
    mocks.ensureOpenCheckChargeComposition(...a),
  snapshotChargesForEnrolledOrder: vi.fn(),
  compensateChargesForCancelledOrder: vi.fn(),
  reconcileOpenOrderCharges: vi.fn(),
}));

vi.mock("../checkOrderSettlementIntegration", () => ({
  ensureOrderSettlementForEnrollment: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  refundOrderSettlementsForCheck: vi.fn(),
  cancelOrderSettlementForOrder: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
  ensureOrderSettlementsForCheck: vi.fn(),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

vi.mock("../../../crmp/SettlementContextResolver", () => ({
  resolveSettlementContextForSettle: (...a: unknown[]) =>
    mocks.resolveSettlementContextForSettle(...a),
}));

vi.mock("../checkSettlementAttributionAdoption", () => ({
  adoptSettlementAttributionAfterFinalize: (...a: unknown[]) =>
    mocks.adoptSettlementAttributionAfterFinalize(...a),
}));

import { settleCheckPaidById, settleCheckPaidByIdDetailed } from "../CheckService";

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

const resolvedContext = {
  restaurantId: 1,
  registerId: "reg_1",
  financialShiftId: "fsh_1",
  operatorUserId: 10,
  deviceId: "dev_1",
  operationalScreenId: null,
  resolvedAt: "2026-07-22 10:00:00",
  status: "resolved" as const,
  gaps: [],
};

const hints = {
  registerId: "reg_1",
  operatorUserId: 10,
  deviceId: "dev_1",
};

describe("CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const callOrder: string[] = [];
    mocks.getDb.mockImplementation(async () => ({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        callOrder.push("tx-enter");
        const result = await fn(fakeTx);
        callOrder.push("tx-return");
        return result;
      },
    }));
    (mocks.getDb as typeof mocks.getDb & { callOrder: string[] }).callOrder =
      callOrder;
    mocks.ensureOpenCheckChargeComposition.mockResolvedValue(undefined);
    mocks.loadChargesSubtotal.mockResolvedValue("20.00");
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "served", totalAmount: "20.00" },
    ]);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);
    mocks.applyFullSettlementToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [{ eventType: "OrderSettlementSettled" }],
      outcomes: ["applied"],
    });
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:100:settlement:1" },
      events: [{ eventType: "SettlementRecordCreated" }],
      outcome: "applied",
    });
    mocks.resolveSettlementContextForSettle.mockResolvedValue(resolvedContext);
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      callOrder.push("attribution");
      return {
        attribution: skippedAttribution({
          gaps: ["instrumentation_test"],
          reason: "test",
        }),
        events: [],
      };
    });
  });

  it("starts and stops each required stage at the existing source boundary", async () => {
    let findCalls = 0;
    mocks.findCheckById.mockImplementation(async () => {
      findCalls += 1;
      if (findCalls === 1) await delay(40);
      return findCalls === 1
        ? openCheck
        : { ...openCheck, outcome: "paid" as const };
    });
    mocks.loadChargesSubtotal.mockImplementation(async () => {
      await delay(40);
      return "20.00";
    });
    mocks.resolveSettlementContextForSettle.mockImplementation(async () => {
      await delay(40);
      return resolvedContext;
    });
    mocks.finalizeCheckOutcome.mockImplementation(async () => {
      await delay(40);
      return 1;
    });
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      await delay(40);
      return {
        attribution: skippedAttribution({
          gaps: ["instrumentation_test"],
          reason: "test",
        }),
        events: [],
      };
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    expect(detailed.finalizeStageMs.checkReloadMs).toBeGreaterThanOrEqual(30);
    expect(detailed.finalizeStageMs.orderDiscoveryMs).toBeGreaterThanOrEqual(30);
    expect(detailed.finalizeStageMs.contextResolveMs).toBeGreaterThanOrEqual(30);
    expect(detailed.finalizeStageMs.moneyTxMs).toBeGreaterThanOrEqual(30);
    expect(detailed.finalizeStageMs.attributionMs).toBeGreaterThanOrEqual(30);
    expect(detailed.finalizeStageMs.validationMs).toBeGreaterThanOrEqual(0);
    expect(detailed.finalizeStageMs.financialTransactionWriteMs).toBeGreaterThanOrEqual(
      0
    );
    expect(mocks.resolveSettlementContextForSettle).toHaveBeenCalledTimes(1);
    expect(mocks.adoptSettlementAttributionAfterFinalize).toHaveBeenCalledTimes(
      1
    );
  });

  it("does not include pre-TX work in moneyTxMs", async () => {
    let findCalls = 0;
    mocks.findCheckById.mockImplementation(async () => {
      findCalls += 1;
      if (findCalls === 1) await delay(50);
      return findCalls === 1
        ? openCheck
        : { ...openCheck, outcome: "paid" as const };
    });
    mocks.loadChargesSubtotal.mockImplementation(async (_input, client) => {
      if (client == null) await delay(50);
      return "20.00";
    });
    mocks.resolveSettlementContextForSettle.mockImplementation(async () => {
      await delay(50);
      return resolvedContext;
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    expect(detailed.finalizeStageMs.checkReloadMs).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.orderDiscoveryMs).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.contextResolveMs).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.moneyTxMs).toBeLessThan(40);
  });

  it("does not include post-commit Attribution in moneyTxMs", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      await delay(50);
      return {
        attribution: skippedAttribution({
          gaps: ["instrumentation_test"],
          reason: "test",
        }),
        events: [],
      };
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    expect(detailed.finalizeStageMs.attributionMs).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.moneyTxMs).toBeLessThan(40);
    expect(detailed.finalizeStageMs.financialTransactionWriteMs).toBeLessThan(40);
  });

  it("does not include getDb preparation in financialTransactionWriteMs", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.getDb.mockImplementation(async () => {
      await delay(50);
      return {
        transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
      };
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    expect(
      detailed.finalizeStageMs.financialTransactionPreparationMs
    ).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.financialTransactionWriteMs).toBeLessThan(40);
    expect(detailed.finalizeStageMs.moneyTxMs).toBeGreaterThanOrEqual(40);
  });

  it("puts in-TX writes in financialTransactionWriteMs, not attributionMs", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.finalizeCheckOutcome.mockImplementation(async () => {
      await delay(50);
      return 1;
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    expect(detailed.finalizeStageMs.financialTransactionWriteMs).toBeGreaterThanOrEqual(
      40
    );
    expect(detailed.finalizeStageMs.attributionMs).toBeLessThan(40);
    expect(
      (detailed.finalizeStageMs as { financialTransactionCommitMs?: number })
        .financialTransactionCommitMs
    ).toBeUndefined();
  });

  it("starts attributionMs only after the financial transaction returns", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });

    await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    const callOrder = (
      mocks.getDb as typeof mocks.getDb & { callOrder: string[] }
    ).callOrder;
    expect(callOrder).toEqual(["tx-enter", "tx-return", "attribution"]);
  });

  it("keeps Check-owned transaction behavior unchanged on success", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
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
    expect(mocks.createSettlementRecordForCheckFinalize).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: 1, outcome: "paid" }),
      fakeTx
    );
    expect(detailed.check.outcome).toBe("paid");
    expect(detailed.settlementRecord.record?.settlementRecordId).toBe(
      "sr:1:100:settlement:1"
    );
  });

  it("propagates existing settlement failure without fabricating stage success", async () => {
    mocks.findCheckById.mockResolvedValue(openCheck);
    mocks.applyFullSettlementToCheckOrders.mockRejectedValue(
      new Error("OS CAS conflict")
    );

    await expect(
      settleCheckPaidById({
        restaurantId: 1,
        checkId: 100,
        settlementContextHints: hints,
      })
    ).rejects.toThrow(/OS CAS conflict/);

    expect(mocks.finalizeCheckOutcome).toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
    expect(mocks.adoptSettlementAttributionAfterFinalize).not.toHaveBeenCalled();
  });

  it("does not pass a pre-resolved Settlement Context from the POS hints-only path", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });

    await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });

    expect(mocks.resolveSettlementContextForSettle).toHaveBeenCalledTimes(1);
  });

  describe("CASHIER-SETTLEMENT-HTTP-AT-FINANCIAL-COMMIT-1", () => {
  it("does not wait for slow Attribution when awaitAttribution is false", async () => {
    let attributionFinished = false;
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      await delay(80);
      attributionFinished = true;
      return {
        attribution: skippedAttribution({
          gaps: ["instrumentation_test"],
          reason: "test",
        }),
        events: [],
      };
    });

    const started = Date.now();
    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
      awaitAttribution: false,
    });
    const elapsed = Date.now() - started;

    expect(detailed.check.outcome).toBe("paid");
    expect(detailed.settlementRecord.record?.settlementRecordId).toBe(
      "sr:1:100:settlement:1"
    );
    expect(detailed.finalizeStageMs.attributionMs).toBe(0);
    expect(detailed.finalizeStageMs.attributionCompletedAt).toBeNull();
    expect(detailed.settlementAttribution.outcome).toBe("skipped");
    expect(detailed.settlementAttribution.gaps).toContain("deferred_post_commit");
    expect(elapsed).toBeLessThan(70);
    expect(attributionFinished).toBe(false);
    expect(mocks.adoptSettlementAttributionAfterFinalize).toHaveBeenCalled();

    await delay(120);
    expect(attributionFinished).toBe(true);
  });

  it("still waits for Attribution by default", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      await delay(50);
      return {
        attribution: skippedAttribution({
          gaps: ["instrumentation_test"],
          reason: "test",
        }),
        events: [],
      };
    });

    const started = Date.now();
    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
    });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.attributionMs).toBeGreaterThanOrEqual(40);
    expect(detailed.finalizeStageMs.attributionCompletedAt).toEqual(
      expect.any(String)
    );
  });

  it("returns financial success when deferred Attribution throws", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      await delay(10);
      throw new Error("attribution boom");
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
      awaitAttribution: false,
    });

    expect(detailed.check.outcome).toBe("paid");
    expect(detailed.settlementRecord.record?.settlementRecordId).toBe(
      "sr:1:100:settlement:1"
    );
    expect(detailed.finalizeStageMs.attributionMs).toBe(0);

    await delay(40);
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).toHaveBeenCalled();
  });

  it("starts deferred Attribution only after the financial transaction returns", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });
    mocks.adoptSettlementAttributionAfterFinalize.mockImplementation(async () => {
      await delay(50);
      (
        mocks.getDb as typeof mocks.getDb & { callOrder: string[] }
      ).callOrder.push("attribution");
      return {
        attribution: skippedAttribution({
          gaps: ["instrumentation_test"],
          reason: "test",
        }),
        events: [],
      };
    });

    const detailed = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
      settlementContextHints: hints,
      awaitAttribution: false,
    });

    const callOrder = (
      mocks.getDb as typeof mocks.getDb & { callOrder: string[] }
    ).callOrder;
    expect(detailed.check.outcome).toBe("paid");
    expect(callOrder).toEqual(["tx-enter", "tx-return"]);

    await delay(80);
    expect(callOrder).toEqual(["tx-enter", "tx-return", "attribution"]);
  });
  });
});
