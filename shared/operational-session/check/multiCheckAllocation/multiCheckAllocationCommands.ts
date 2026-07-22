/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — pure domain commands.
 *
 * Deterministic. Framework-independent. ADR-ARCH-021 compatible:
 * - Duplicate / retry / repeated invocation → Applied | AlreadyApplied | NoChange
 * - No dependence on event order, transport, or duplicate delivery
 * - Returns explicit outcomes + event contracts for future integration
 *
 * Check Aggregate remains the only mutation authority at persistence/integration.
 * This module is pure: it transforms Allocation state; it does not settle Checks,
 * mutate Order Settlement, or complete Payments.
 */

import type {
  AllocationAdjustment,
  AllocationPortion,
  AllocationReversal,
  AllocationSource,
  MultiCheckAllocation,
} from "./multiCheckAllocationContract";
import {
  eventBaseFromAllocation,
  type AllocationOutstandingChanged,
  type AllocationResponsibilityTransferred,
  type MultiCheckAllocationDomainEvent,
} from "./multiCheckAllocationEvents";
import {
  AllocationAlreadyCancelledError,
  AllocationAlreadyCompletedError,
  AllocationAlreadyReversedError,
  AllocationExceededError,
  InvalidAllocationStateError,
} from "./multiCheckAllocationErrors";
import {
  assertAllocationFinality,
  assertAllocationIdentityStable,
  assertCreateInputs,
  assertMultiCheckAllocationValid,
} from "./multiCheckAllocationInvariants";
import {
  assertAllocationAdjustmentId,
  assertAllocationReversalId,
  assertUniqueAllocationId,
} from "./multiCheckAllocationIdentity";
import {
  assertTransitionAllowed,
  canAdjust,
  canApply,
  canCancel,
  canComplete,
  canReserve,
  canReverse,
} from "./multiCheckAllocationLifecycle";
import {
  assertPortionsWithinResponsibility,
  assertWithinPaymentValueCap,
  computeAllocatedAmount,
  computeRemainingAmount,
  formatAllocationMoney,
  moneyAdd,
  moneyEquals,
  parseAllocationMoney,
  sumPortionAmounts,
} from "./multiCheckAllocationMoney";

/**
 * Explicit command outcome for ADR-021 idempotent integration.
 * - applied: state changed; events are new facts
 * - already_applied: no-op success; empty events (safe re-delivery)
 * - no_change: equivalent state; empty events (reorder-safe / noop)
 */
export type MultiCheckAllocationCommandOutcome =
  | "applied"
  | "already_applied"
  | "no_change";

export type MultiCheckAllocationCommandResult = Readonly<{
  outcome: MultiCheckAllocationCommandOutcome;
  allocation: MultiCheckAllocation;
  events: readonly MultiCheckAllocationDomainEvent[];
}>;

function touch(
  allocation: MultiCheckAllocation,
  patch: Partial<MultiCheckAllocation>,
  at: string
): MultiCheckAllocation {
  const next: MultiCheckAllocation = {
    ...allocation,
    ...patch,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    updatedAt: at,
  };
  assertAllocationIdentityStable(allocation, next);
  assertMultiCheckAllocationValid(next);
  assertAllocationFinality(next);
  return next;
}

function result(
  outcome: MultiCheckAllocationCommandOutcome,
  allocation: MultiCheckAllocation,
  events: readonly MultiCheckAllocationDomainEvent[]
): MultiCheckAllocationCommandResult {
  return { outcome, allocation, events };
}

function already(
  allocation: MultiCheckAllocation
): MultiCheckAllocationCommandResult {
  return result("already_applied", allocation, []);
}

function transition(
  allocation: MultiCheckAllocation,
  to: MultiCheckAllocation["status"],
  at: string,
  patch: Partial<MultiCheckAllocation> = {}
): MultiCheckAllocation {
  assertTransitionAllowed(allocation.status, to);
  return touch(allocation, { ...patch, status: to }, at);
}

function transferEvents(
  allocation: MultiCheckAllocation,
  at: string
): AllocationResponsibilityTransferred[] {
  return allocation.portions
    .filter((p) => p.applied)
    .map((p) => ({
      ...eventBaseFromAllocation(
        allocation,
        "AllocationResponsibilityTransferred",
        at
      ),
      eventType: "AllocationResponsibilityTransferred" as const,
      portionId: p.portionId,
      sequence: p.sequence,
      fromCheckId: allocation.sourceCheckId,
      toCheckId: p.targetCheckId,
      amount: p.amount,
    }));
}

function outstandingEvents(
  allocation: MultiCheckAllocation,
  at: string,
  direction: "decrease" | "increase"
): AllocationOutstandingChanged[] {
  const byCheck = new Map<number, number>();
  for (const p of allocation.portions.filter((x) => x.applied)) {
    byCheck.set(
      p.targetCheckId,
      (byCheck.get(p.targetCheckId) ?? 0) + parseAllocationMoney(p.amount)
    );
  }
  // Source Check outstanding increases when responsibility leaves (decrease on targets).
  const sourceTotal = [...byCheck.values()].reduce((a, b) => a + b, 0);
  const events: AllocationOutstandingChanged[] = [];
  if (sourceTotal > 0) {
    events.push({
      ...eventBaseFromAllocation(
        allocation,
        "AllocationOutstandingChanged",
        at
      ),
      eventType: "AllocationOutstandingChanged",
      checkId: allocation.sourceCheckId,
      amount: formatAllocationMoney(sourceTotal),
      direction: direction === "decrease" ? "increase" : "decrease",
    });
  }
  for (const [checkId, amt] of byCheck) {
    events.push({
      ...eventBaseFromAllocation(
        allocation,
        "AllocationOutstandingChanged",
        at
      ),
      eventType: "AllocationOutstandingChanged",
      checkId,
      amount: formatAllocationMoney(amt),
      direction,
    });
  }
  return events;
}

// ─── Create ─────────────────────────────────────────────────────────

export type CreateAllocationPortionInput = Readonly<{
  portionId: string;
  sequence: number;
  targetCheckId: number;
  amount: string;
}>;

export type CreateAllocationSourceInput = Readonly<{
  sourceCheckId: number;
  sourcePaymentId?: string | null;
  financialReference?: string | null;
  responsibilityAmount: string;
}>;

export type CreateMultiCheckAllocationCommand = Readonly<{
  restaurantId: number;
  /** Check restaurant for I-MCA-13 tenant isolation (commanding Check). */
  checkRestaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference?: string | null;
  sourceCheckId: number;
  sourcePaymentId?: string | null;
  financialResponsibility: string;
  /** Required when SourcePaymentId is bound (I-MCA-03). */
  paymentValueCap?: string | null;
  portions: readonly CreateAllocationPortionInput[];
  sources?: readonly CreateAllocationSourceInput[];
  existingAllocationIds?: readonly string[];
  at: string;
}>;

export function createMultiCheckAllocation(
  cmd: CreateMultiCheckAllocationCommand
): MultiCheckAllocationCommandResult {
  assertCreateInputs(cmd);
  if (cmd.existingAllocationIds) {
    assertUniqueAllocationId(cmd.allocationId, cmd.existingAllocationIds);
  }

  const financialResponsibility = formatAllocationMoney(
    parseAllocationMoney(cmd.financialResponsibility)
  );
  const paymentValueCap =
    cmd.paymentValueCap != null
      ? formatAllocationMoney(parseAllocationMoney(cmd.paymentValueCap))
      : cmd.sourcePaymentId != null
        ? financialResponsibility
        : null;

  const portions: AllocationPortion[] = cmd.portions.map((p) => ({
    portionId: p.portionId,
    allocationId: cmd.allocationId,
    sequence: p.sequence,
    targetCheckId: p.targetCheckId,
    amount: formatAllocationMoney(parseAllocationMoney(p.amount)),
    applied: false,
    createdAt: cmd.at,
  }));

  assertPortionsWithinResponsibility(financialResponsibility, portions);
  assertWithinPaymentValueCap(paymentValueCap, sumPortionAmounts(portions));

  const sources: AllocationSource[] =
    cmd.sources && cmd.sources.length > 0
      ? cmd.sources.map((s) => ({
          sourceCheckId: s.sourceCheckId,
          sourcePaymentId: s.sourcePaymentId ?? null,
          financialReference: s.financialReference ?? null,
          responsibilityAmount: formatAllocationMoney(
            parseAllocationMoney(s.responsibilityAmount)
          ),
        }))
      : [
          {
            sourceCheckId: cmd.sourceCheckId,
            sourcePaymentId: cmd.sourcePaymentId ?? null,
            financialReference: cmd.financialReference ?? null,
            responsibilityAmount: financialResponsibility,
          },
        ];

  const allocation: MultiCheckAllocation = {
    restaurantId: cmd.restaurantId,
    allocationId: cmd.allocationId,
    allocationReference: cmd.allocationReference,
    financialReference: cmd.financialReference ?? null,
    sourceCheckId: cmd.sourceCheckId,
    sourcePaymentId: cmd.sourcePaymentId ?? null,
    status: "pending",
    financialResponsibility,
    allocatedAmount: "0.00",
    remainingAmount: financialResponsibility,
    paymentValueCap,
    sources,
    portions,
    adjustments: [],
    reversals: [],
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: cmd.at,
    updatedAt: cmd.at,
  };

  assertMultiCheckAllocationValid(allocation);

  return result("applied", allocation, [
    {
      ...eventBaseFromAllocation(allocation, "AllocationCreated", cmd.at),
      eventType: "AllocationCreated",
      financialResponsibility,
      portionCount: portions.length,
    },
  ]);
}

// ─── Reserve ────────────────────────────────────────────────────────

export type ReserveAllocationCommand = Readonly<{
  allocation: MultiCheckAllocation;
  at: string;
}>;

export function reserveAllocation(
  cmd: ReserveAllocationCommand
): MultiCheckAllocationCommandResult {
  const { allocation, at } = cmd;
  assertMultiCheckAllocationValid(allocation);

  if (allocation.status === "reserved") return already(allocation);
  if (allocation.status === "cancelled") {
    throw new AllocationAlreadyCancelledError();
  }
  if (allocation.status === "completed") {
    throw new AllocationAlreadyCompletedError();
  }
  if (allocation.status === "reversed") {
    throw new AllocationAlreadyReversedError();
  }
  if (!canReserve(allocation.status)) {
    throw new InvalidAllocationStateError(
      `Cannot reserve Allocation in status "${allocation.status}"`
    );
  }

  const reservedAmount = sumPortionAmounts(allocation.portions);
  assertWithinPaymentValueCap(allocation.paymentValueCap, reservedAmount);

  const next = transition(allocation, "reserved", at);
  return result("applied", next, [
    {
      ...eventBaseFromAllocation(next, "AllocationReserved", at),
      eventType: "AllocationReserved",
      reservedAmount,
    },
  ]);
}

// ─── Apply ──────────────────────────────────────────────────────────

export type ApplyAllocationCommand = Readonly<{
  allocation: MultiCheckAllocation;
  at: string;
}>;

export function applyAllocation(
  cmd: ApplyAllocationCommand
): MultiCheckAllocationCommandResult {
  const { allocation, at } = cmd;
  assertMultiCheckAllocationValid(allocation);

  if (
    allocation.status === "applied" ||
    allocation.status === "adjusted" ||
    allocation.status === "completed"
  ) {
    if (allocation.portions.every((p) => p.applied)) {
      return already(allocation);
    }
  }
  if (allocation.status === "cancelled") {
    throw new AllocationAlreadyCancelledError();
  }
  if (allocation.status === "reversed") {
    throw new AllocationAlreadyReversedError();
  }
  if (!canApply(allocation.status)) {
    throw new InvalidAllocationStateError(
      `Cannot apply Allocation in status "${allocation.status}"`
    );
  }

  const appliedPortions = allocation.portions.map((p) => ({
    ...p,
    applied: true,
  }));
  const allocatedAmount = sumPortionAmounts(appliedPortions);
  assertWithinPaymentValueCap(allocation.paymentValueCap, allocatedAmount);
  const remainingAmount = computeRemainingAmount(
    allocation.financialResponsibility,
    allocatedAmount
  );

  const next = transition(allocation, "applied", at, {
    portions: appliedPortions,
    allocatedAmount,
    remainingAmount,
  });

  const events: MultiCheckAllocationDomainEvent[] = [
    {
      ...eventBaseFromAllocation(next, "AllocationApplied", at),
      eventType: "AllocationApplied",
      allocatedAmount,
      remainingAmount,
    },
    ...transferEvents(next, at),
    ...outstandingEvents(next, at, "decrease"),
  ];

  return result("applied", next, events);
}

// ─── Adjust ─────────────────────────────────────────────────────────

export type AdjustAllocationCommand = Readonly<{
  allocation: MultiCheckAllocation;
  adjustmentId: string;
  amount: string;
  direction: "increase" | "decrease";
  portionId?: string | null;
  at: string;
}>;

export function adjustAllocation(
  cmd: AdjustAllocationCommand
): MultiCheckAllocationCommandResult {
  const { allocation, at } = cmd;
  assertMultiCheckAllocationValid(allocation);
  assertAllocationAdjustmentId(cmd.adjustmentId);

  if (allocation.status === "cancelled") {
    throw new AllocationAlreadyCancelledError();
  }
  if (allocation.status === "completed") {
    throw new AllocationAlreadyCompletedError();
  }
  if (allocation.status === "reversed") {
    throw new AllocationAlreadyReversedError();
  }
  if (!canAdjust(allocation.status)) {
    throw new InvalidAllocationStateError(
      `Cannot adjust Allocation in status "${allocation.status}"`
    );
  }

  if (allocation.adjustments.some((a) => a.adjustmentId === cmd.adjustmentId)) {
    return already(allocation);
  }

  const amount = formatAllocationMoney(parseAllocationMoney(cmd.amount));
  if (parseAllocationMoney(amount) <= 0) {
    throw new InvalidAllocationStateError("Adjustment amount must be > 0");
  }

  if (cmd.portionId != null) {
    const portion = allocation.portions.find((p) => p.portionId === cmd.portionId);
    if (!portion) {
      throw new InvalidAllocationStateError(
        `Unknown portionId for adjustment: ${cmd.portionId}`
      );
    }
  }

  const adjustment: AllocationAdjustment = {
    adjustmentId: cmd.adjustmentId,
    allocationId: allocation.allocationId,
    portionId: cmd.portionId ?? null,
    amount,
    direction: cmd.direction,
    createdAt: at,
  };

  const adjustments = [...allocation.adjustments, adjustment];
  const probe: MultiCheckAllocation = {
    ...allocation,
    adjustments,
    status: "adjusted",
  };
  const allocatedAmount = computeAllocatedAmount(probe);
  assertWithinPaymentValueCap(allocation.paymentValueCap, allocatedAmount);
  if (
    parseAllocationMoney(allocatedAmount) -
      parseAllocationMoney(allocation.financialResponsibility) >
    0.001
  ) {
    throw new AllocationExceededError(
      `I-MCA-02: adjusted allocated ${allocatedAmount} exceeds responsibility ${allocation.financialResponsibility}`
    );
  }
  const remainingAmount = computeRemainingAmount(
    allocation.financialResponsibility,
    allocatedAmount
  );

  const next = transition(allocation, "adjusted", at, {
    adjustments,
    allocatedAmount,
    remainingAmount,
  });

  return result("applied", next, [
    {
      ...eventBaseFromAllocation(next, "AllocationAdjusted", at),
      eventType: "AllocationAdjusted",
      adjustmentId: adjustment.adjustmentId,
      amount,
      direction: cmd.direction,
      allocatedAmount,
      remainingAmount,
    },
  ]);
}

// ─── Reverse ────────────────────────────────────────────────────────

export type ReverseAllocationCommand = Readonly<{
  allocation: MultiCheckAllocation;
  reversalId: string;
  at: string;
}>;

export function reverseAllocation(
  cmd: ReverseAllocationCommand
): MultiCheckAllocationCommandResult {
  const { allocation, at } = cmd;
  assertMultiCheckAllocationValid(allocation);
  assertAllocationReversalId(cmd.reversalId);

  if (allocation.status === "reversed") {
    if (allocation.reversals.some((r) => r.reversalId === cmd.reversalId)) {
      return already(allocation);
    }
    throw new AllocationAlreadyReversedError();
  }
  if (allocation.status === "cancelled") {
    throw new AllocationAlreadyCancelledError();
  }
  if (allocation.status === "completed") {
    throw new AllocationAlreadyCompletedError(
      "Completed Allocation cannot be reversed on the same AllocationId; use a new compensating Allocation"
    );
  }
  if (!canReverse(allocation.status)) {
    throw new InvalidAllocationStateError(
      `Cannot reverse Allocation in status "${allocation.status}"`
    );
  }

  const reversedAmount = allocation.allocatedAmount;
  const reversal: AllocationReversal = {
    reversalId: cmd.reversalId,
    allocationId: allocation.allocationId,
    reversedAmount,
    createdAt: at,
  };

  const next = transition(allocation, "reversed", at, {
    reversals: [...allocation.reversals, reversal],
    allocatedAmount: "0.00",
    remainingAmount: allocation.financialResponsibility,
  });

  const events: MultiCheckAllocationDomainEvent[] = [
    {
      ...eventBaseFromAllocation(next, "AllocationReversed", at),
      eventType: "AllocationReversed",
      reversalId: reversal.reversalId,
      reversedAmount,
    },
    ...outstandingEvents(
      { ...allocation, status: "applied" },
      at,
      "increase"
    ),
  ];

  return result("applied", next, events);
}

// ─── Complete ───────────────────────────────────────────────────────

export type CompleteAllocationCommand = Readonly<{
  allocation: MultiCheckAllocation;
  at: string;
}>;

export function completeAllocation(
  cmd: CompleteAllocationCommand
): MultiCheckAllocationCommandResult {
  const { allocation, at } = cmd;
  assertMultiCheckAllocationValid(allocation);

  if (allocation.status === "completed") return already(allocation);
  if (allocation.status === "cancelled") {
    throw new AllocationAlreadyCancelledError();
  }
  if (allocation.status === "reversed") {
    throw new AllocationAlreadyReversedError();
  }
  if (!canComplete(allocation.status)) {
    throw new InvalidAllocationStateError(
      `Cannot complete Allocation in status "${allocation.status}"`
    );
  }
  if (parseAllocationMoney(allocation.remainingAmount) > 0.001) {
    throw new InvalidAllocationStateError(
      "Cannot complete Allocation while remaining amount > 0"
    );
  }

  const next = transition(allocation, "completed", at);
  return result("applied", next, [
    {
      ...eventBaseFromAllocation(next, "AllocationCompleted", at),
      eventType: "AllocationCompleted",
      allocatedAmount: next.allocatedAmount,
      impliesCheckSettlement: false,
      impliesPaymentCompletion: false,
    },
  ]);
}

// ─── Cancel ─────────────────────────────────────────────────────────

export type CancelAllocationCommand = Readonly<{
  allocation: MultiCheckAllocation;
  at: string;
}>;

export function cancelAllocation(
  cmd: CancelAllocationCommand
): MultiCheckAllocationCommandResult {
  const { allocation, at } = cmd;
  assertMultiCheckAllocationValid(allocation);

  if (allocation.status === "cancelled") return already(allocation);
  if (allocation.status === "completed") {
    throw new AllocationAlreadyCompletedError();
  }
  if (allocation.status === "reversed") {
    throw new AllocationAlreadyReversedError();
  }
  if (!canCancel(allocation.status)) {
    throw new InvalidAllocationStateError(
      `Cannot cancel Allocation in status "${allocation.status}"`
    );
  }

  const next = transition(allocation, "cancelled", at, {
    allocatedAmount: "0.00",
    remainingAmount: allocation.financialResponsibility,
  });

  return result("applied", next, [
    {
      ...eventBaseFromAllocation(next, "AllocationCancelled", at),
      eventType: "AllocationCancelled",
    },
  ]);
}

// ─── Set helpers (Many-to-One / Many-to-Many) ───────────────────────

/**
 * Pure conservation check across an Allocation set (multiple Allocations).
 * Does not mutate; used by Check Aggregate / tests for N:1 and N:N scenarios.
 */
export function assertMultiCheckAllocationSetValid(
  allocations: readonly MultiCheckAllocation[]
): void {
  for (const a of allocations) {
    assertMultiCheckAllocationValid(a);
  }
  const ids = allocations.map((a) => a.allocationId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new InvalidAllocationStateError(
      "Allocation set must not contain duplicate AllocationId"
    );
  }
}

/** Sum allocated amounts across a set targeting a specific Check. */
export function sumAllocatedToTarget(
  allocations: readonly MultiCheckAllocation[],
  targetCheckId: number
): string {
  let sum = 0;
  for (const a of allocations) {
    if (a.status === "reversed" || a.status === "cancelled") continue;
    for (const p of a.portions) {
      if (p.applied && p.targetCheckId === targetCheckId) {
        sum += parseAllocationMoney(p.amount);
      }
    }
  }
  return formatAllocationMoney(sum);
}

export function moneyAddAllocation(a: string, b: string): string {
  return moneyAdd(a, b);
}

export function moneyEqualsAllocation(a: string, b: string): boolean {
  return moneyEquals(a, b);
}
