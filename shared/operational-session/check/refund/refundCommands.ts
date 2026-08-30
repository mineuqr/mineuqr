/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — pure domain commands.
 *
 * Deterministic. Framework-independent. ADR-ARCH-021 compatible:
 * - applied | already_applied outcomes
 * - Business claim via RefundId / recordGeneration
 * - No dependence on transport eventId
 *
 * Check Aggregate remains the only mutation authority at persistence/integration.
 * This module transforms Refund state and composes OS + compensating SR commands.
 */

import type { CheckTerminalOutcome, OperationalCheck } from "../checkContract";
import {
  buildSettlementRecordRefundedEvent,
  createCompensatingSettlementRecord,
  type SettlementRecord,
  type SettlementRecordCommandResult,
  type SettlementRecordDomainEvent,
} from "../settlementRecord/index";
import { refundOrderSettlement } from "../orderSettlement/orderSettlementCommands";
import type { OrderSettlement } from "../orderSettlement/orderSettlementContract";
import type {
  OrderSettlementCommandResult,
} from "../orderSettlement/orderSettlementCommands";
import type { OrderSettlementDomainEvent } from "../orderSettlement/orderSettlementEvents";
import type {
  Refund,
  RefundAllocation,
  RefundBudget,
  RefundId,
} from "./refundContract";
import {
  buildRefundAllocationCreatedEvent,
  buildRefundAppliedEvent,
  buildRefundCompletedEvent,
  buildRefundRequestedEvent,
  buildRefundSettlementRecordPublishedEvent,
  buildRefundValidatedEvent,
  type RefundDomainEvent,
} from "./refundEvents";
import {
  ConcurrentRefundGenerationError,
  InvalidRefundStateError,
  NoPriorSettlementError,
} from "./refundErrors";
import type { RefundOriginalSaleAnchor } from "./refundOriginalSaleAnchor";
import {
  assertRefundId,
  assertTenantMatch,
  assertUniqueRefundId,
  buildRefundId,
  buildRefundReference,
} from "./refundIdentity";
import {
  assertAllocationsWithinRefund,
  assertCheckOutcomeRefundable,
  assertNotReopenCheck,
  assertRefundValid,
  assertRefundWithinBudget,
} from "./refundInvariants";
import { assertRefundTransitionAllowed } from "./refundLifecycle";
import {
  assertPositiveRefundAmount,
  formatRefundMoney,
  parseRefundMoney,
  refundMoneySub,
} from "./refundMoney";
import {
  buildRefundReverseSnapshot,
  calculateRefundBudget,
} from "./refundBudget";

export type RefundCommandOutcome = "applied" | "already_applied";

export type RefundCommandResult = Readonly<{
  outcome: RefundCommandOutcome;
  refund: Refund;
  events: readonly RefundDomainEvent[];
}>;

export type ExecuteRefundOnCheckResult = Readonly<{
  outcome: RefundCommandOutcome;
  refund: Refund;
  budget: RefundBudget;
  remainingBudget: string;
  orderSettlementResults: readonly OrderSettlementCommandResult[];
  settlementRecordResult: SettlementRecordCommandResult | null;
  events: readonly (
    | RefundDomainEvent
    | OrderSettlementDomainEvent
    | SettlementRecordDomainEvent
  )[];
  /** Order Settlements after refund transitions (I-OS-14). */
  orderSettlements: readonly OrderSettlement[];
}>;

function touch(refund: Refund, patch: Partial<Refund>, at: string): Refund {
  const next: Refund = { ...refund, ...patch, updatedAt: at };
  assertRefundValid(next);
  return next;
}

function already(refund: Refund): RefundCommandResult {
  return { outcome: "already_applied", refund, events: [] };
}

// ─── RequestRefund ───────────────────────────────────────────────────

export type RequestRefundCommand = Readonly<{
  restaurantId: number;
  checkId: number;
  checkRestaurantId: number;
  checkOutcome: string;
  amount: string;
  currencyCode: string;
  priorSettlementRecordId: string;
  priorSettlementRecordRestaurantId: number;
  priorSettlementGeneration: number;
  recordGeneration: number;
  originalCollectionFactId?: string | null;
  allocations?: readonly Omit<RefundAllocation, "allocationId">[];
  reason?: string | null;
  refundId?: RefundId;
  at: string;
  existingIdentities?: readonly {
    restaurantId: number;
    checkId: number;
    refundId: string;
  }[];
  existingRefund?: Refund | null;
}>;

export function requestRefund(cmd: RequestRefundCommand): RefundCommandResult {
  assertCheckOutcomeRefundable(cmd.checkOutcome);
  assertNotReopenCheck(cmd.checkOutcome);
  assertTenantMatch({
    refundRestaurantId: cmd.restaurantId,
    checkRestaurantId: cmd.checkRestaurantId,
    priorRecordRestaurantId: cmd.priorSettlementRecordRestaurantId,
  });

  const amount = assertPositiveRefundAmount(cmd.amount);
  const refundId =
    cmd.refundId ??
    buildRefundId({
      restaurantId: cmd.restaurantId,
      checkId: cmd.checkId,
      recordGeneration: cmd.recordGeneration,
    });
  assertRefundId(refundId);

  if (cmd.existingRefund && cmd.existingRefund.refundId === refundId) {
    return already(cmd.existingRefund);
  }

  assertUniqueRefundId(
    { restaurantId: cmd.restaurantId, checkId: cmd.checkId, refundId },
    cmd.existingIdentities ?? []
  );

  const allocations: RefundAllocation[] = (cmd.allocations ?? []).map(
    (a, index) => ({
      allocationId: `rfa:${refundId}:${index + 1}`,
      orderId: a.orderId,
      amount: assertPositiveRefundAmount(a.amount),
      tenderMethod: a.tenderMethod ?? null,
    })
  );
  assertAllocationsWithinRefund(amount, allocations);

  const reverseSnapshot = buildRefundReverseSnapshot(amount);
  const refund: Refund = {
    refundId,
    restaurantId: cmd.restaurantId,
    checkId: cmd.checkId,
    status: "requested",
    amount,
    currencyCode: cmd.currencyCode,
    refundReference: buildRefundReference({
      checkId: cmd.checkId,
      recordGeneration: cmd.recordGeneration,
    }),
    referenceLink: {
      priorSettlementRecordId: cmd.priorSettlementRecordId,
      settlementRecordGeneration: cmd.priorSettlementGeneration,
      checkId: cmd.checkId,
      originalCollectionFactId: cmd.originalCollectionFactId ?? null,
    },
    allocations,
    reverseSnapshot,
    recordGeneration: cmd.recordGeneration,
    refundSettlementRecordId: null,
    reason: cmd.reason ?? null,
    createdAt: cmd.at,
    updatedAt: cmd.at,
    completedAt: null,
  };
  assertRefundValid(refund);

  return {
    outcome: "applied",
    refund,
    events: [buildRefundRequestedEvent(refund, cmd.at)],
  };
}

// ─── ValidateRefund ──────────────────────────────────────────────────

export type ValidateRefundCommand = Readonly<{
  refund: Refund;
  budget: RefundBudget;
  at: string;
}>;

export function validateRefund(cmd: ValidateRefundCommand): RefundCommandResult {
  const { refund, budget, at } = cmd;
  if (refund.status === "validated" || refund.status === "applied" || refund.status === "completed") {
    return already(refund);
  }
  assertRefundTransitionAllowed(refund.status, "validated");
  assertRefundWithinBudget({
    amount: refund.amount,
    refundableBalance: budget.refundableBalance,
  });
  if (refund.referenceLink.priorSettlementRecordId !== budget.priorSettlementRecordId) {
    throw new NoPriorSettlementError(
      "RF-INV-P02: Refund priorSettlementRecordId must match budget prior settlement"
    );
  }

  const next = touch(refund, { status: "validated" }, at);
  return {
    outcome: "applied",
    refund: next,
    events: [
      buildRefundValidatedEvent(next, budget.refundableBalance, at),
    ],
  };
}

// ─── ApplyRefund ─────────────────────────────────────────────────────

export type ApplyRefundCommand = Readonly<{
  refund: Refund;
  budget: RefundBudget;
  at: string;
}>;

export function applyRefund(cmd: ApplyRefundCommand): RefundCommandResult {
  const { budget, at } = cmd;
  let refund = cmd.refund;
  const prefixEvents: RefundDomainEvent[] = [];

  if (refund.status === "applied" || refund.status === "completed") {
    return already(refund);
  }
  if (refund.status === "requested") {
    const validated = validateRefund({ refund, budget, at });
    if (validated.outcome === "already_applied") {
      refund = validated.refund;
    } else {
      refund = validated.refund;
      prefixEvents.push(...validated.events);
    }
  }
  assertRefundTransitionAllowed(refund.status, "applied");
  assertRefundWithinBudget({
    amount: refund.amount,
    refundableBalance: budget.refundableBalance,
  });

  const remainingBudget = refundMoneySub(
    budget.refundableBalance,
    refund.amount
  );
  const next = touch(refund, { status: "applied" }, at);
  const events: RefundDomainEvent[] = [
    ...prefixEvents,
    buildRefundAppliedEvent(next, remainingBudget, at),
  ];
  for (const allocation of next.allocations) {
    events.push(buildRefundAllocationCreatedEvent(next, allocation, at));
  }
  return { outcome: "applied", refund: next, events };
}

// ─── PublishCompensatingSettlementRecord (domain compose) ────────────

export type PublishCompensatingSettlementRecordCommand = Readonly<{
  refund: Refund;
  check: OperationalCheck;
  outcome: CheckTerminalOutcome;
  orderIds: readonly number[];
  orderSettlements?: readonly OrderSettlement[];
  existingSettlementIdentities?: readonly {
    restaurantId: number;
    checkId: number;
    recordKind: "settlement" | "refund" | "void" | "reversal" | "correction";
    recordGeneration: number;
  }[];
  existingRecord?: SettlementRecord | null;
  tenderMethod?: string;
  at: string;
}>;

export type PublishCompensatingSettlementRecordResult = Readonly<{
  outcome: RefundCommandOutcome;
  refund: Refund;
  settlementRecordResult: SettlementRecordCommandResult;
  events: readonly (RefundDomainEvent | SettlementRecordDomainEvent)[];
}>;

/**
 * Publish append-only compensating Settlement Record (recordKind=refund).
 * Never mutates the prior Settlement Record (SR-INV-02 / RF-LAW-05).
 */
export function publishCompensatingSettlementRecord(
  cmd: PublishCompensatingSettlementRecordCommand
): PublishCompensatingSettlementRecordResult {
  const { refund, check, outcome, at } = cmd;
  if (refund.status !== "applied" && refund.status !== "completed") {
    throw new InvalidRefundStateError(
      "PublishCompensatingSettlementRecord requires applied Refund"
    );
  }
  if (refund.refundSettlementRecordId && cmd.existingRecord) {
    return {
      outcome: "already_applied",
      refund,
      settlementRecordResult: {
        outcome: "already_applied",
        record: cmd.existingRecord,
        events: [],
      },
      events: [],
    };
  }

  const recordGeneration = refund.recordGeneration;
  if (recordGeneration == null) {
    throw new InvalidRefundStateError(
      "RF-GEN-01: Refund recordGeneration required before publish"
    );
  }

  const reverseFreezeCheck: OperationalCheck = {
    ...check,
    outcome,
    subtotal: refund.reverseSnapshot.subtotal,
    billDiscountAmount: refund.reverseSnapshot.discountAmount,
    taxAmount: refund.reverseSnapshot.taxAmount,
    taxBreakdown: refund.reverseSnapshot.taxBreakdown,
    grandTotal: refund.reverseSnapshot.grandTotal,
  };

  const srResult = createCompensatingSettlementRecord({
    check: reverseFreezeCheck,
    outcome,
    recordKind: "refund",
    recordGeneration,
    priorSettlementRecordId: refund.referenceLink.priorSettlementRecordId,
    createdAt: at,
    orderIds: cmd.orderIds,
    orderSettlements: cmd.orderSettlements,
    paymentSnapshotOverride: [
      {
        settlementTransactionId: null,
        paymentMethod: cmd.tenderMethod ?? "other",
        amount: refund.amount,
        currencyCode: refund.currencyCode,
        status: "refunded",
        businessTimestamp: at,
        reference: refund.refundReference,
        externalReference: null,
      },
    ],
    existingIdentities: cmd.existingSettlementIdentities,
    existingRecord: cmd.existingRecord ?? null,
  });

  if (srResult.outcome === "already_applied") {
    const next = touch(
      refund,
      {
        refundSettlementRecordId: srResult.record.settlementRecordId,
      },
      at
    );
    return {
      outcome: "already_applied",
      refund: next,
      settlementRecordResult: srResult,
      events: [],
    };
  }

  const next = touch(
    refund,
    {
      refundSettlementRecordId: srResult.record.settlementRecordId,
    },
    at
  );

  return {
    outcome: "applied",
    refund: next,
    settlementRecordResult: srResult,
    events: [
      ...srResult.events,
      buildSettlementRecordRefundedEvent(srResult.record, at),
      buildRefundSettlementRecordPublishedEvent(next, {
        settlementRecordId: srResult.record.settlementRecordId,
        priorSettlementRecordId: refund.referenceLink.priorSettlementRecordId,
        recordGeneration,
        grandTotal: srResult.record.grandTotal,
        occurredAt: at,
      }),
    ],
  };
}

// ─── CompleteRefund ──────────────────────────────────────────────────

export type CompleteRefundCommand = Readonly<{
  refund: Refund;
  at: string;
}>;

export function completeRefund(cmd: CompleteRefundCommand): RefundCommandResult {
  const { refund, at } = cmd;
  if (refund.status === "completed") {
    return already(refund);
  }
  if (refund.status !== "applied") {
    throw new InvalidRefundStateError(
      "CompleteRefund requires applied Refund with published Settlement Record"
    );
  }
  if (!refund.refundSettlementRecordId) {
    throw new InvalidRefundStateError(
      "RF-INV-P01: CompleteRefund requires published refund Settlement Record"
    );
  }
  assertRefundTransitionAllowed(refund.status, "completed");
  const next = touch(
    refund,
    { status: "completed", completedAt: at },
    at
  );
  return {
    outcome: "applied",
    refund: next,
    events: [buildRefundCompletedEvent(next, at)],
  };
}

// ─── ExecuteRefundOnCheck (atomic domain orchestration) ──────────────

export type ExecuteRefundOnCheckCommand = Readonly<{
  check: OperationalCheck;
  amount: string;
  settlementRecords: readonly SettlementRecord[];
  orderSettlements: readonly OrderSettlement[];
  reason?: string | null;
  allocations?: readonly Omit<RefundAllocation, "allocationId">[];
  tenderMethod?: string;
  refundId?: RefundId;
  at: string;
  /**
   * When present with matching RefundId / generation → already_applied (ADR-021).
   */
  existingRefund?: Refund | null;
  existingRefundRecord?: SettlementRecord | null;
  /**
   * REFUND-DOCUMENT-PERSISTENCE-SEPARATION-1 — original Cashier sale identity.
   * When collection_fact, original collected amount is CF.amount and gen=1 SR
   * is not required to identify the sale. Refund persistence remains SR.
   * Omitted / legacy_settlement_record keeps gen=1 SR as the original amount.
   */
  originalSaleAnchor?: RefundOriginalSaleAnchor;
}>;

/**
 * Constitutional Refund transaction (domain composition).
 *
 * Single logical unit:
 * 1. CalculateRefundBudget (immutable history)
 * 2. RequestRefund → ValidateRefund → ApplyRefund
 * 3. Order Settlement → refunded when budget exhausted (I-OS-14)
 * 4. PublishCompensatingSettlementRecord (append-only)
 * 5. CompleteRefund
 *
 * Persistence must commit these results in one Check-owned TX.
 */
export function executeRefundOnCheck(
  cmd: ExecuteRefundOnCheckCommand
): ExecuteRefundOnCheckResult {
  const { check, at } = cmd;
  assertCheckOutcomeRefundable(check.outcome);
  assertNotReopenCheck(check.outcome);

  const budget = calculateRefundBudget({
    restaurantId: check.restaurantId,
    checkId: check.id,
    settlementRecords: cmd.settlementRecords,
    originalSale: cmd.originalSaleAnchor,
  });
  const cfBacked = cmd.originalSaleAnchor?.kind === "collection_fact";
  if (!budget.priorSettlementRecordId && !cfBacked) {
    throw new NoPriorSettlementError(
      `RF-INV-P02: Refund document chain requires a published Settlement Record for check=${check.id}`
    );
  }

  const priorRecord = cmd.settlementRecords.find(
    (record) => record.settlementRecordId === budget.priorSettlementRecordId
  );
  const refundId =
    cmd.refundId ??
    buildRefundId({
      restaurantId: check.restaurantId,
      checkId: check.id,
      recordGeneration: budget.nextRecordGeneration,
    });

  if (cmd.existingRefund && cmd.existingRefund.refundId === refundId) {
    return {
      outcome: "already_applied",
      refund: cmd.existingRefund,
      budget,
      remainingBudget: budget.refundableBalance,
      orderSettlementResults: [],
      settlementRecordResult: cmd.existingRefundRecord
        ? {
            outcome: "already_applied",
            record: cmd.existingRefundRecord,
            events: [],
          }
        : null,
      events: [],
      orderSettlements: cmd.orderSettlements,
    };
  }

  if (cmd.existingRefundRecord) {
    // Concurrent / retry: generation already published
    if (
      cmd.existingRefundRecord.recordKind === "refund" &&
      cmd.existingRefundRecord.recordGeneration === budget.nextRecordGeneration
    ) {
      const requestedAmount = assertPositiveRefundAmount(cmd.amount);
      const publishedAmount = formatRefundMoney(
        parseRefundMoney(cmd.existingRefundRecord.grandTotal)
      );
      // Same logical amount at this generation → lost-response / duplicate apply.
      // Different amount → distinct request colliding on generation (not already_applied).
      if (publishedAmount !== requestedAmount) {
        throw new ConcurrentRefundGenerationError(
          `RF-GEN-04: concurrent refund generation conflict for check=${check.id} (requested ${requestedAmount} vs published ${publishedAmount})`
        );
      }
      return {
        outcome: "already_applied",
        refund: cmd.existingRefund ?? {
          refundId,
          restaurantId: check.restaurantId,
          checkId: check.id,
          status: "completed",
          amount: cmd.existingRefundRecord.grandTotal,
          currencyCode: check.currencySnapshot.currencyCode,
          refundReference: cmd.existingRefundRecord.financialReference,
          referenceLink: {
            priorSettlementRecordId:
              cmd.existingRefundRecord.priorSettlementRecordId ??
              budget.priorSettlementRecordId,
            settlementRecordGeneration:
              priorRecord?.recordGeneration ??
              (budget.priorSettlementRecordId ? 1 : 0),
            checkId: check.id,
            originalCollectionFactId:
              cmd.originalSaleAnchor?.kind === "collection_fact"
                ? cmd.originalSaleAnchor.collectionFactId
                : null,
          },
          allocations: [],
          reverseSnapshot: buildRefundReverseSnapshot(
            cmd.existingRefundRecord.grandTotal
          ),
          recordGeneration: cmd.existingRefundRecord.recordGeneration,
          refundSettlementRecordId: cmd.existingRefundRecord.settlementRecordId,
          reason: cmd.reason ?? null,
          createdAt: at,
          updatedAt: at,
          completedAt: at,
        },
        budget,
        remainingBudget: budget.refundableBalance,
        orderSettlementResults: [],
        settlementRecordResult: {
          outcome: "already_applied",
          record: cmd.existingRefundRecord,
          events: [],
        },
        events: [],
        orderSettlements: cmd.orderSettlements,
      };
    }
    throw new ConcurrentRefundGenerationError(
      `RF-GEN-04: concurrent refund generation conflict for check=${check.id}`
    );
  }

  const amount = assertPositiveRefundAmount(cmd.amount);
  const requested = requestRefund({
    restaurantId: check.restaurantId,
    checkId: check.id,
    checkRestaurantId: check.restaurantId,
    checkOutcome: check.outcome,
    amount,
    currencyCode: check.currencySnapshot.currencyCode,
    priorSettlementRecordId: budget.priorSettlementRecordId,
    priorSettlementRecordRestaurantId: check.restaurantId,
    priorSettlementGeneration: priorRecord?.recordGeneration ?? 0,
    recordGeneration: budget.nextRecordGeneration,
    originalCollectionFactId:
      cmd.originalSaleAnchor?.kind === "collection_fact"
        ? cmd.originalSaleAnchor.collectionFactId
        : null,
    allocations: cmd.allocations,
    reason: cmd.reason,
    refundId,
    at,
  });

  const applied = applyRefund({
    refund: requested.refund,
    budget,
    at,
  });

  const remainingBudget = refundMoneySub(budget.refundableBalance, amount);
  const exhaustsBudget = parseRefundMoney(remainingBudget) <= 0;

  const orderSettlementResults: OrderSettlementCommandResult[] = [];
  let nextOrderSettlements = [...cmd.orderSettlements];

  if (exhaustsBudget) {
    nextOrderSettlements = cmd.orderSettlements.map((settlement) => {
      if (
        settlement.status !== "settled" &&
        settlement.status !== "complimentary"
      ) {
        return settlement;
      }
      const result = refundOrderSettlement({ settlement, at });
      orderSettlementResults.push(result);
      return result.settlement;
    });
  } else if (cmd.allocations?.length) {
    // Targeted full OS reverse when allocation covers that OS settled amount
    nextOrderSettlements = cmd.orderSettlements.map((settlement) => {
      const alloc = applied.refund.allocations.find(
        (a) => a.orderId === settlement.orderId
      );
      if (!alloc) return settlement;
      if (
        settlement.status !== "settled" &&
        settlement.status !== "complimentary"
      ) {
        return settlement;
      }
      if (
        parseRefundMoney(alloc.amount) + 0.001 <
        parseRefundMoney(settlement.settledAmount)
      ) {
        // Partial OS coverage — leave OS settled (no reopen); budget tracks remainder
        return settlement;
      }
      const result = refundOrderSettlement({ settlement, at });
      orderSettlementResults.push(result);
      return result.settlement;
    });
  }

  const existingSettlementIdentities = cmd.settlementRecords.map((r) => ({
    restaurantId: r.restaurantId,
    checkId: r.checkId,
    recordKind: r.recordKind,
    recordGeneration: r.recordGeneration,
  }));

  const published = publishCompensatingSettlementRecord({
    refund: applied.refund,
    check,
    outcome: check.outcome as CheckTerminalOutcome,
    orderIds: nextOrderSettlements.map((s) => s.orderId),
    orderSettlements: nextOrderSettlements,
    existingSettlementIdentities,
    tenderMethod: cmd.tenderMethod,
    at,
  });

  const completed = completeRefund({
    refund: published.refund,
    at,
  });

  return {
    outcome: "applied",
    refund: completed.refund,
    budget,
    remainingBudget,
    orderSettlementResults,
    settlementRecordResult: published.settlementRecordResult,
    events: [
      ...requested.events,
      ...applied.events,
      ...orderSettlementResults.flatMap((r) => r.events),
      ...published.events,
      ...completed.events,
    ],
    orderSettlements: nextOrderSettlements,
  };
}

/** Pure budget helper exported for Check Aggregate / tests. */
export { calculateRefundBudget, buildRefundReverseSnapshot };
