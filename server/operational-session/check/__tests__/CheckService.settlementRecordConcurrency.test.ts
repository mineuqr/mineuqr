/**
 * SETTLEMENT-RECORD-CONCURRENCY-VALIDATION-1
 * SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 — permanent certification gates.
 *
 * Concurrent finalize races against the SAME Check.
 * Models production semantics only — no extra locks beyond the implementation.
 *
 * Production facts:
 * - finalizeCheckOutcome: UPDATE WHERE outcome='open'; returns affectedRows
 * - CheckService aborts with CheckTransitionError when affectedRows === 0
 *   BEFORE Settlement Transactions / OS / Settlement Record
 * - Settlement Record: UNIQUE business key → already_applied
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSettlementRecord,
  recordKindForCheckOutcome,
  type SettlementRecord,
  type SettlementRecordDomainEvent,
} from "@shared/operational-session";

type TimelineEntry = Readonly<{
  t: number;
  actor: string;
  step: string;
  detail?: string;
}>;

type ConcurrentStore = {
  outcome: "open" | "paid" | "complimentary" | "voided";
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  billDiscountAmount: string;
  settledAt: string | null;
  totalsFrozenAt: string | null;
  taxBreakdown: { totalTaxAmount: string; lines: unknown[] };
  settlementTxBatches: number;
  settlementTxLines: Array<{ amount: string; paymentMethod: string; actor: string }>;
  orderSettlementStatus: "pending" | "settled";
  orderSettlementApplyCalls: number;
  orderSettlementAppliedTransitions: number;
  settlementRecords: SettlementRecord[];
  settlementRecordInsertAttempts: number;
  settlementRecordCreatedEvents: SettlementRecordDomainEvent[];
  finalizeOutcomeCalls: number;
  finalizeOutcomeApplied: number;
  finalizeOutcomeNoops: number;
  committedTx: number;
  rolledBackTx: number;
  timeline: TimelineEntry[];
};

const harness = vi.hoisted(() => {
  let clock = 0;
  let raceSize = 2;
  let txSeq = 0;

  const store: ConcurrentStore = {
    outcome: "open",
    subtotal: "20.00",
    taxAmount: "0.00",
    grandTotal: "20.00",
    billDiscountAmount: "0.00",
    settledAt: null,
    totalsFrozenAt: null,
    taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    settlementTxBatches: 0,
    settlementTxLines: [],
    orderSettlementStatus: "pending",
    orderSettlementApplyCalls: 0,
    orderSettlementAppliedTransitions: 0,
    settlementRecords: [],
    settlementRecordInsertAttempts: 0,
    settlementRecordCreatedEvents: [],
    finalizeOutcomeCalls: 0,
    finalizeOutcomeApplied: 0,
    finalizeOutcomeNoops: 0,
    committedTx: 0,
    rolledBackTx: 0,
    timeline: [],
  };

  let preTxArrivals = 0;
  let preTxRelease!: () => void;
  let preTxBarrier = new Promise<void>((resolve) => {
    preTxRelease = resolve;
  });

  let txArrivals = 0;
  let txRelease!: () => void;
  let txBarrier = new Promise<void>((resolve) => {
    txRelease = resolve;
  });

  let finalizeArrivals = 0;
  let finalizeRelease!: () => void;
  let finalizeBarrier = new Promise<void>((resolve) => {
    finalizeRelease = resolve;
  });

  function resetBarriers() {
    preTxArrivals = 0;
    preTxBarrier = new Promise<void>((resolve) => {
      preTxRelease = resolve;
    });
    txArrivals = 0;
    txBarrier = new Promise<void>((resolve) => {
      txRelease = resolve;
    });
    finalizeArrivals = 0;
    finalizeBarrier = new Promise<void>((resolve) => {
      finalizeRelease = resolve;
    });
  }

  function setRaceSize(n: number) {
    raceSize = n;
  }

  function getRaceSize() {
    return raceSize;
  }

  function mark(actor: string, step: string, detail?: string) {
    store.timeline.push({ t: ++clock, actor, step, detail });
  }

  function snapshotCheck() {
    return {
      id: 100,
      restaurantId: 1,
      sessionId: 10,
      outcome: store.outcome,
      currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
      taxPolicySnapshot: {
        version: 1,
        enabled: false,
        mode: "exclusive" as const,
        components: [],
      },
      serviceChargeSnapshot: null,
      billDiscountAmount: store.billDiscountAmount,
      subtotal: store.subtotal,
      taxAmount: store.taxAmount,
      taxBreakdown: store.taxBreakdown,
      grandTotal: store.grandTotal,
      snapshotsFrozenAt: "2026-07-23 10:00:00",
      totalsFrozenAt: store.totalsFrozenAt,
      settledAt: store.settledAt,
      voidedAt: null,
      createdAt: "2026-07-23 10:00:00",
      updatedAt: "2026-07-23 10:00:00",
    };
  }

  function cloneFinancialState() {
    return {
      outcome: store.outcome,
      subtotal: store.subtotal,
      taxAmount: store.taxAmount,
      grandTotal: store.grandTotal,
      settledAt: store.settledAt,
      totalsFrozenAt: store.totalsFrozenAt,
      taxBreakdown: structuredClone(store.taxBreakdown),
      settlementTxBatches: store.settlementTxBatches,
      settlementTxLines: store.settlementTxLines.map((l) => ({ ...l })),
      orderSettlementStatus: store.orderSettlementStatus,
      orderSettlementApplyCalls: store.orderSettlementApplyCalls,
      orderSettlementAppliedTransitions: store.orderSettlementAppliedTransitions,
      settlementRecords: [...store.settlementRecords],
      settlementRecordInsertAttempts: store.settlementRecordInsertAttempts,
      finalizeOutcomeCalls: store.finalizeOutcomeCalls,
      finalizeOutcomeApplied: store.finalizeOutcomeApplied,
      finalizeOutcomeNoops: store.finalizeOutcomeNoops,
    };
  }

  function restoreFinancialState(
    snap: ReturnType<typeof cloneFinancialState>
  ) {
    Object.assign(store, {
      ...snap,
      settlementTxLines: snap.settlementTxLines.map((l) => ({ ...l })),
      settlementRecords: [...snap.settlementRecords],
      taxBreakdown: structuredClone(snap.taxBreakdown),
    });
  }

  function resetStore() {
    clock = 0;
    txSeq = 0;
    store.outcome = "open";
    store.subtotal = "20.00";
    store.taxAmount = "0.00";
    store.grandTotal = "20.00";
    store.billDiscountAmount = "0.00";
    store.settledAt = null;
    store.totalsFrozenAt = null;
    store.taxBreakdown = { totalTaxAmount: "0.00", lines: [] };
    store.settlementTxBatches = 0;
    store.settlementTxLines = [];
    store.orderSettlementStatus = "pending";
    store.orderSettlementApplyCalls = 0;
    store.orderSettlementAppliedTransitions = 0;
    store.settlementRecords = [];
    store.settlementRecordInsertAttempts = 0;
    store.settlementRecordCreatedEvents = [];
    store.finalizeOutcomeCalls = 0;
    store.finalizeOutcomeApplied = 0;
    store.finalizeOutcomeNoops = 0;
    store.committedTx = 0;
    store.rolledBackTx = 0;
    store.timeline = [];
    resetBarriers();
  }

  class SettlementRecordPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "SettlementRecordPersistenceError";
      this.code = code;
    }
  }

  return {
    store,
    setRaceSize,
    getRaceSize,
    nextTxActor() {
      txSeq += 1;
      return `tx-${txSeq}`;
    },
    mark,
    snapshotCheck,
    cloneFinancialState,
    restoreFinancialState,
    resetStore,
    SettlementRecordPersistenceError,
    async awaitPreTxBarrier(actor: string) {
      preTxArrivals += 1;
      mark(actor, "pre_tx_read_open");
      if (preTxArrivals >= raceSize) preTxRelease();
      await preTxBarrier;
    },
    async awaitTxBarrier(actor: string) {
      txArrivals += 1;
      mark(actor, "tx_entered");
      if (txArrivals >= raceSize) txRelease();
      await txBarrier;
    },
    async awaitFinalizeBarrier(actor: string) {
      finalizeArrivals += 1;
      mark(actor, "finalize_gate");
      if (finalizeArrivals >= raceSize) finalizeRelease();
      await finalizeBarrier;
    },
  };
});

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrdersByIds: vi.fn(async () => [
    { id: 55, status: "served", totalAmount: "20.00" },
  ]),
  getRestaurantById: vi.fn(async () => ({
    id: 1,
    currencyCode: "SAR",
    currencySymbol: "ر.س",
  })),
  getDb: vi.fn(async () => ({
    transaction: async (fn: (tx: { __tx: string }) => Promise<unknown>) => {
      const actor = harness.nextTxActor();
      const tx = { __tx: actor };
      // Single-flight failure injection uses global snapshot restore.
      // Concurrent races must NOT global-restore (would undo the winner).
      const useGlobalSnapshot = harness.getRaceSize() === 1;
      const snap = useGlobalSnapshot ? harness.cloneFinancialState() : null;
      try {
        await harness.awaitTxBarrier(actor);
        const result = await fn(tx);
        harness.store.committedTx += 1;
        harness.mark(actor, "tx_commit");
        return result;
      } catch (error) {
        if (snap) {
          harness.restoreFinancialState(snap);
        }
        harness.store.rolledBackTx += 1;
        harness.mark(actor, "tx_rollback", String(error));
        throw error;
      }
    },
  })),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: vi.fn(),
  updateSessionActiveCheckId: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findOpenCheckBySessionId: vi.fn(),
  insertOperationalCheck: vi.fn(),
  updateCheckMoney: vi.fn(),
  touchOpenCheck: vi.fn(async () =>
    harness.store.outcome === "open" ? 1 : 0
  ),
  findCheckById: vi.fn(async (_id: number, client?: { __tx?: string }) => {
    if (!client) {
      await harness.awaitPreTxBarrier("pre-tx");
      // Concurrent racers all observe open before any TX mutates.
      if (harness.getRaceSize() > 1) {
        return { ...harness.snapshotCheck(), outcome: "open" as const };
      }
      return harness.snapshotCheck();
    }
    return harness.snapshotCheck();
  }),
  finalizeCheckOutcome: vi.fn(async (input: {
    outcome: "paid" | "complimentary" | "voided";
    subtotal: string;
    taxAmount: string;
    grandTotal: string;
    totalsFrozenAt: string;
    settledAt?: string | null;
  }, client?: { __tx?: string }) => {
    const actor = client?.__tx ?? "finalize";
    await harness.awaitFinalizeBarrier(actor);
    harness.store.finalizeOutcomeCalls += 1;
    // Production: WHERE outcome='open' → affectedRows 0|1
    if (harness.store.outcome === "open") {
      harness.store.outcome = input.outcome;
      harness.store.subtotal = input.subtotal;
      harness.store.taxAmount = input.taxAmount;
      harness.store.grandTotal = input.grandTotal;
      harness.store.totalsFrozenAt = input.totalsFrozenAt;
      harness.store.settledAt = input.settledAt ?? null;
      harness.store.finalizeOutcomeApplied += 1;
      harness.mark(actor, "finalize_applied", input.outcome);
      return 1;
    }
    harness.store.finalizeOutcomeNoops += 1;
    harness.mark(actor, "finalize_noop", `already=${harness.store.outcome}`);
    return 0;
  }),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: vi.fn(async (input: {
    lines: Array<{ amount: string; paymentMethod: string }>;
  }, client?: { __tx?: string }) => {
    const actor = client?.__tx ?? "st";
    harness.store.settlementTxBatches += 1;
    for (const line of input.lines) {
      harness.store.settlementTxLines.push({
        amount: String(line.amount),
        paymentMethod: line.paymentMethod,
        actor,
      });
    }
    harness.mark(
      actor,
      "st_insert",
      `batch=${harness.store.settlementTxBatches} lines=${input.lines.length}`
    );
  }),
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
  listActiveOrderIdsForCheck: vi.fn(async () => [55]),
  findBlockingMembershipForOrder: vi.fn(),
}));

vi.mock("../checkChargeComposition", () => ({
  loadChargesSubtotal: vi.fn(async () => "20.00"),
  ensureOpenCheckChargeComposition: vi.fn(async () => undefined),
  ensureOpenCheckChargesSubtotal: vi.fn(async () => "20.00"),
  snapshotChargesForEnrolledOrder: vi.fn(),
  compensateChargesForCancelledOrder: vi.fn(),
  reconcileOpenOrderCharges: vi.fn(),
}));

vi.mock("../checkOrderSettlementIntegration", () => ({
  ensureOrderSettlementForEnrollment: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(async (
    _input: unknown,
    client?: { __tx?: string }
  ) => {
    const actor = client?.__tx ?? "os";
    harness.store.orderSettlementApplyCalls += 1;
    if (harness.store.orderSettlementStatus === "pending") {
      harness.store.orderSettlementStatus = "settled";
      harness.store.orderSettlementAppliedTransitions += 1;
      harness.mark(actor, "os_applied");
      return {
        settlements: [
          {
            restaurantId: 1,
            checkId: 100,
            orderId: 55,
            status: "settled",
            orderTotalSnapshot: "20.00",
            allocatedAmount: "20.00",
            settledAmount: "20.00",
            outstandingAmount: "0.00",
            createdAt: "2026-07-23 10:00:00",
            updatedAt: "2026-07-23 13:00:00",
          },
        ],
        events: [{ eventType: "OrderSettlementSettled" }],
        outcomes: ["applied"],
      };
    }
    harness.mark(actor, "os_already_in_state");
    return {
      settlements: [
        {
          restaurantId: 1,
          checkId: 100,
          orderId: 55,
          status: "settled",
          orderTotalSnapshot: "20.00",
          allocatedAmount: "20.00",
          settledAmount: "20.00",
          outstandingAmount: "0.00",
          createdAt: "2026-07-23 10:00:00",
          updatedAt: "2026-07-23 13:00:00",
        },
      ],
      events: [],
      outcomes: ["already_in_state"],
    };
  }),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  refundOrderSettlementsForCheck: vi.fn(),
  cancelOrderSettlementForOrder: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
  ensureOrderSettlementsForCheck: vi.fn(),
}));

vi.mock("../settlementRecordRepository", () => ({
  SettlementRecordPersistenceError: harness.SettlementRecordPersistenceError,
  findSettlementRecordByIdentity: vi.fn(async (identity: {
    restaurantId: number;
    checkId: number;
    recordKind: string;
    recordGeneration: number;
  }) => {
    return (
      harness.store.settlementRecords.find(
        (r) =>
          r.restaurantId === identity.restaurantId &&
          r.checkId === identity.checkId &&
          r.recordKind === identity.recordKind &&
          r.recordGeneration === identity.recordGeneration
      ) ?? null
    );
  }),
  insertSettlementRecord: vi.fn(async (
    record: SettlementRecord,
    client?: { __tx?: string }
  ) => {
    const actor = client?.__tx ?? "sr";
    harness.store.settlementRecordInsertAttempts += 1;
    const dup = harness.store.settlementRecords.find(
      (r) =>
        r.restaurantId === record.restaurantId &&
        r.checkId === record.checkId &&
        r.recordKind === record.recordKind &&
        r.recordGeneration === record.recordGeneration
    );
    if (dup) {
      harness.mark(actor, "sr_duplicate");
      throw new harness.SettlementRecordPersistenceError(
        "DUPLICATE",
        "Settlement Record already persisted"
      );
    }
    harness.store.settlementRecords.push(record);
    harness.mark(actor, "sr_insert", record.settlementRecordId);
    return harness.store.settlementRecords.length;
  }),
  existsSettlementRecord: vi.fn(async () => harness.store.settlementRecords.length > 0),
}));

import {
  CheckTransitionError,
  settleCheckPaidByIdDetailed,
} from "../CheckService";
import { createSettlementRecordForCheckFinalize } from "../checkSettlementRecordIntegration";

describe("SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 concurrency gates", () => {
  beforeEach(() => {
    harness.resetStore();
    vi.clearAllMocks();
  });

  async function runConcurrentPaidFinalizeRace(concurrency: number) {
    harness.setRaceSize(concurrency);
    const before = {
      outcome: harness.store.outcome,
      stLines: harness.store.settlementTxLines.length,
      srCount: harness.store.settlementRecords.length,
      osStatus: harness.store.orderSettlementStatus,
    };

    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, () =>
        settleCheckPaidByIdDetailed({ restaurantId: 1, checkId: 100 })
      )
    );

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof settleCheckPaidByIdDetailed>>
      > => r.status === "fulfilled"
    );
    const rejected = results.filter((r) => r.status === "rejected");
    const createdEvents = fulfilled.flatMap((r) => r.value.settlementRecordEvents);
    const createdCount = createdEvents.filter(
      (e) => e.eventType === "SettlementRecordCreated"
    ).length;

    const criteria = {
      exactlyOneCheckFinalization: harness.store.finalizeOutcomeApplied === 1,
      checkTerminalOnce: harness.store.outcome === "paid",
      exactlyOneSettlementRecord: harness.store.settlementRecords.length === 1,
      srMatchesCheckFreeze:
        harness.store.settlementRecords[0]?.grandTotal ===
          harness.store.grandTotal &&
        harness.store.settlementRecords[0]?.outcome === "paid",
      exactlyOneOrderSettlementTransition:
        harness.store.orderSettlementAppliedTransitions === 1,
      exactlyOneSettlementTransactionSet:
        harness.store.settlementTxBatches === 1,
      exactlyOneSettlementRecordCreatedEvent: createdCount === 1,
      exactlyOneSuccessfulFinancialCommit: fulfilled.length === 1,
      losersTerminateWithoutSuccess: rejected.length === concurrency - 1,
      noOrphanSettlementRecord:
        harness.store.outcome === "paid" &&
        harness.store.settlementRecords.length === 1,
      losersAreCheckTransitionErrors: rejected.every(
        (r) =>
          r.status === "rejected" &&
          r.reason instanceof CheckTransitionError
      ),
    };
    const failedCriteria = Object.entries(criteria)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    const evidence = {
      concurrency,
      before,
      after: {
        outcome: harness.store.outcome,
        finalizeOutcomeCalls: harness.store.finalizeOutcomeCalls,
        finalizeOutcomeApplied: harness.store.finalizeOutcomeApplied,
        finalizeOutcomeNoops: harness.store.finalizeOutcomeNoops,
        settlementTxBatches: harness.store.settlementTxBatches,
        settlementTxLines: harness.store.settlementTxLines.length,
        orderSettlementApplyCalls: harness.store.orderSettlementApplyCalls,
        orderSettlementAppliedTransitions:
          harness.store.orderSettlementAppliedTransitions,
        orderSettlementStatus: harness.store.orderSettlementStatus,
        settlementRecords: harness.store.settlementRecords.length,
        settlementRecordInsertAttempts:
          harness.store.settlementRecordInsertAttempts,
        settlementRecordCreatedEvents: createdEvents.map((e) => e.eventType),
        committedTx: harness.store.committedTx,
        rolledBackTx: harness.store.rolledBackTx,
        fulfilled: fulfilled.length,
        rejected: rejected.length,
      },
      criteria,
      failedCriteria,
      timeline: harness.store.timeline,
      settlementRecordIds: harness.store.settlementRecords.map(
        (r) => r.settlementRecordId
      ),
    };

    // eslint-disable-next-line no-console
    console.log(
      "CONCURRENCY_EVIDENCE_JSON=" + JSON.stringify(evidence, null, 2)
    );

    return evidence;
  }

  it("CERTIFICATION: 2 concurrent finalizes → exactly one financial commit", async () => {
    const evidence = await runConcurrentPaidFinalizeRace(2);
    expect(evidence.failedCriteria).toEqual([]);
    expect(evidence.after.settlementTxBatches).toBe(1);
    expect(evidence.after.fulfilled).toBe(1);
    expect(evidence.after.rejected).toBe(1);
    expect(evidence.after.finalizeOutcomeNoops).toBe(1);
    expect(evidence.after.rolledBackTx).toBe(1);
  });

  it("CERTIFICATION: 5 concurrent finalizes → exactly one financial commit", async () => {
    const evidence = await runConcurrentPaidFinalizeRace(5);
    expect(evidence.failedCriteria).toEqual([]);
    expect(evidence.after.fulfilled).toBe(1);
    expect(evidence.after.rejected).toBe(4);
    expect(evidence.after.settlementTxBatches).toBe(1);
    expect(evidence.after.settlementRecords).toBe(1);
  });

  it("CERTIFICATION: 10 concurrent finalizes → exactly one financial commit", async () => {
    const evidence = await runConcurrentPaidFinalizeRace(10);
    expect(evidence.failedCriteria).toEqual([]);
    expect(evidence.after.fulfilled).toBe(1);
    expect(evidence.after.rejected).toBe(9);
    expect(evidence.after.settlementTxBatches).toBe(1);
    expect(evidence.after.settlementRecordCreatedEvents).toEqual([
      "SettlementRecordCreated",
    ]);
  });

  it("CERTIFICATION: retry after successful completion creates no additional artifacts", async () => {
    harness.setRaceSize(1);
    const first = await settleCheckPaidByIdDetailed({
      restaurantId: 1,
      checkId: 100,
    });
    expect(first.check.outcome).toBe("paid");
    expect(harness.store.settlementTxBatches).toBe(1);
    expect(harness.store.settlementRecords).toHaveLength(1);

    await expect(
      settleCheckPaidByIdDetailed({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);

    expect(harness.store.settlementTxBatches).toBe(1);
    expect(harness.store.settlementTxLines).toHaveLength(1);
    expect(harness.store.settlementRecords).toHaveLength(1);
    expect(harness.store.finalizeOutcomeApplied).toBe(1);
    expect(harness.store.orderSettlementAppliedTransitions).toBe(1);
  });

  it("CERTIFICATION: SR insert failure rolls back with zero committed financial artifacts", async () => {
    harness.setRaceSize(1);
    const { insertSettlementRecord } = await import(
      "../settlementRecordRepository"
    );
    vi.mocked(insertSettlementRecord).mockImplementationOnce(async () => {
      throw new Error("injected SR repository failure");
    });

    await expect(
      settleCheckPaidByIdDetailed({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/injected SR repository failure/);

    expect(harness.store.rolledBackTx).toBeGreaterThanOrEqual(1);
    expect(harness.store.settlementRecords).toHaveLength(0);
    expect(harness.store.settlementTxBatches).toBe(0);
    expect(harness.store.outcome).toBe("open");
  });

  it("Settlement Record layer alone remains idempotent under concurrent insert", async () => {
    harness.setRaceSize(1);
    const check = {
      ...harness.snapshotCheck(),
      outcome: "open" as const,
    };
    const freeze = {
      subtotal: "20.00",
      billDiscountAmount: "0.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] as const },
      grandTotal: "20.00",
      settledAt: "2026-07-23 13:00:00",
    };

    const results = await Promise.all([
      createSettlementRecordForCheckFinalize({
        restaurantId: 1,
        check,
        outcome: "paid",
        freeze,
        settlementLines: [
          { paymentMethod: "cash", amount: "20.00", status: "captured" },
        ],
        orderSettlements: [],
        createdAt: "2026-07-23 13:00:00",
      }),
      createSettlementRecordForCheckFinalize({
        restaurantId: 1,
        check,
        outcome: "paid",
        freeze,
        settlementLines: [
          { paymentMethod: "cash", amount: "20.00", status: "captured" },
        ],
        orderSettlements: [],
        createdAt: "2026-07-23 13:00:00",
      }),
    ]);

    expect(results.filter((r) => r.outcome === "applied")).toHaveLength(1);
    expect(results.filter((r) => r.outcome === "already_applied")).toHaveLength(
      1
    );
    expect(harness.store.settlementRecords).toHaveLength(1);
  });

  it("domain uniqueness rejects duplicate business identity without persistence", () => {
    harness.setRaceSize(1);
    const check = harness.snapshotCheck();
    const first = createSettlementRecord({
      check: { ...check, outcome: "open" },
      outcome: "paid",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [55],
    });
    expect(first.outcome).toBe("applied");
    expect(() =>
      createSettlementRecord({
        check: { ...check, outcome: "open" },
        outcome: "paid",
        createdAt: "2026-07-23 13:00:00",
        orderIds: [55],
        existingIdentities: [
          {
            restaurantId: 1,
            checkId: 100,
            recordKind: recordKindForCheckOutcome("paid"),
            recordGeneration: 1,
          },
        ],
      })
    ).toThrow(/SR-INV-05|already exists/i);
  });
});
