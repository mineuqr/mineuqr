/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — Multi Check Allocation contracts.
 *
 * Check-owned FSP capability. NOT an Aggregate Root. NOT a Payment. NOT a Check.
 * Allocation records only the relationship between financial value and Check responsibility.
 *
 * Pure domain types only — no persistence / ORM / API / Projection concerns.
 *
 * Identity governance: domain identities are stable opaque strings, independent
 * of persistence surrogates and transport eventIds. State transitions never
 * change AllocationId / AllocationReference / FinancialReference.
 */

export const MULTI_CHECK_ALLOCATION_PROGRAM_ID =
  "MULTI-CHECK-ALLOCATION-DOMAIN-1" as const;
export const MULTI_CHECK_ALLOCATION_ADR_ID = "ADR-ARCH-025" as const;

/** Canonical Allocation lifecycle (ADR-025 §8 / DOMAIN-1). */
export const ALLOCATION_STATUSES = [
  "pending",
  "reserved",
  "applied",
  "adjusted",
  "reversed",
  "completed",
  "cancelled",
] as const;

export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export const ALLOCATION_NON_TERMINAL_STATUSES = [
  "pending",
  "reserved",
  "applied",
  "adjusted",
] as const;

export type AllocationNonTerminalStatus =
  (typeof ALLOCATION_NON_TERMINAL_STATUSES)[number];

export const ALLOCATION_TERMINAL_STATUSES = [
  "reversed",
  "completed",
  "cancelled",
] as const;

export type AllocationTerminalStatus =
  (typeof ALLOCATION_TERMINAL_STATUSES)[number];

export const ALLOCATION_SUCCESS_TERMINAL_STATUSES = ["completed"] as const;

export type AllocationSuccessTerminalStatus =
  (typeof ALLOCATION_SUCCESS_TERMINAL_STATUSES)[number];

// ─── Identity value objects (stable across lifecycle) ───────────────

/** Stable domain Allocation identity — never changes across reserve/apply/adjust/complete/reverse/cancel. */
export type AllocationId = string;

/**
 * Opaque business reference for an Allocation (caller-supplied or domain-issued).
 * Independent from persistence PK and transport eventId.
 */
export type AllocationReference = string;

/**
 * Opaque financial correlation reference (restaurant-scoped business fact key).
 * Used for ADR-021 business idempotency — not a transport id.
 */
export type FinancialReference = string;

/** Optional bound Payment identity (Split Payment). Allocation never owns the Payment. */
export type SourcePaymentId = string;

export type SourceCheckId = number;

export type TargetCheckId = number;

/** Deterministic ordering within an Allocation — immutable once assigned. */
export type AllocationSequence = number;

export type AllocationPortionId = string;

export type AllocationAdjustmentId = string;

export type AllocationReversalId = string;

export type MultiCheckAllocationIdentity = Readonly<{
  restaurantId: number;
  allocationId: AllocationId;
}>;

/**
 * Allocation Source — where value / responsibility is drawn from.
 * Source Payment does not gain ownership of Allocation.
 */
export type AllocationSource = Readonly<{
  sourceCheckId: SourceCheckId;
  sourcePaymentId: SourcePaymentId | null;
  financialReference: FinancialReference | null;
  /** Max responsibility/value designated from this source for the Allocation. */
  responsibilityAmount: string;
}>;

/**
 * Allocation Portion — discrete amount assigned to one Target Check.
 * Not a monetary Aggregate Root.
 */
export type AllocationPortion = Readonly<{
  portionId: AllocationPortionId;
  allocationId: AllocationId;
  sequence: AllocationSequence;
  targetCheckId: TargetCheckId;
  amount: string;
  /** True after successful apply of this Portion. */
  applied: boolean;
  createdAt: string;
}>;

/**
 * Allocation Target — receiving Check responsibility for a Portion.
 * Domain fact shape; Target Check Aggregate applies Outstanding/OS via its commands.
 */
export type AllocationTarget = Readonly<{
  targetCheckId: TargetCheckId;
  portionId: AllocationPortionId;
  amount: string;
}>;

/**
 * Allocation Responsibility — obligation amount subject to redistribution.
 * Conservation operand with Allocated + Remaining.
 */
export type AllocationResponsibility = Readonly<{
  restaurantId: number;
  allocationId: AllocationId;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
}>;

/** Allocation Remaining — unallocated remainder (≥ 0). */
export type AllocationRemaining = Readonly<{
  allocationId: AllocationId;
  remainingAmount: string;
}>;

/**
 * Allocation Completion — Allocation-level success terminal.
 * NEVER implies Check Financial Settlement or Payment Completion (I-MCA-09/10).
 */
export type AllocationCompletion = Readonly<{
  allocationId: AllocationId;
  status: "completed";
  allocatedAmount: string;
  impliesCheckSettlement: false;
  impliesPaymentCompletion: false;
}>;

/**
 * Allocation Adjustment — compensating fact; never silent history rewrite.
 */
export type AllocationAdjustment = Readonly<{
  adjustmentId: AllocationAdjustmentId;
  allocationId: AllocationId;
  portionId: AllocationPortionId | null;
  /** Positive amount of the adjustment. */
  amount: string;
  direction: "increase" | "decrease";
  createdAt: string;
}>;

/**
 * Allocation Reversal — compensating reverse fact for a prior Applied Allocation.
 */
export type AllocationReversal = Readonly<{
  reversalId: AllocationReversalId;
  allocationId: AllocationId;
  reversedAmount: string;
  createdAt: string;
}>;

/**
 * Multi Check Allocation — Check-commanded relationship fact (NOT Aggregate Root).
 *
 * Ownership: Check Aggregate → FSP → Multi Check Allocation.
 * Does not own Payment, Check, Order Settlement, Outstanding, or Revenue.
 */
export type MultiCheckAllocation = Readonly<{
  restaurantId: number;
  allocationId: AllocationId;
  allocationReference: AllocationReference;
  financialReference: FinancialReference | null;
  /** Primary commanding / source Check (I-MCA coordination). */
  sourceCheckId: SourceCheckId;
  /** Optional bound Payment — reference only; Payment does not own Allocation. */
  sourcePaymentId: SourcePaymentId | null;
  status: AllocationStatus;
  /** Total Financial Responsibility in Allocation scope. */
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  /**
   * When bound to a Payment, Allocations must never exceed this cap (I-MCA-03).
   * Null when redistributing responsibility without a Payment (Order move / split).
   */
  paymentValueCap: string | null;
  sources: readonly AllocationSource[];
  portions: readonly AllocationPortion[];
  adjustments: readonly AllocationAdjustment[];
  reversals: readonly AllocationReversal[];
  /**
   * Always false from Allocation domain commands.
   * Financial Settlement is owned exclusively by Check Aggregate settle commands.
   */
  impliesCheckSettlement: false;
  /**
   * Always false — Payment Completion is owned by Split Payment (ADR-024).
   */
  impliesPaymentCompletion: false;
  createdAt: string;
  updatedAt: string;
}>;

/** Cardinality pattern classification (diagnostic / strategy hint). */
export type AllocationCardinality =
  | "one_to_one"
  | "one_to_many"
  | "many_to_one"
  | "many_to_many";

export function isAllocationStatus(value: string): value is AllocationStatus {
  return (ALLOCATION_STATUSES as readonly string[]).includes(value);
}

export function assertAllocationStatus(
  value: string
): asserts value is AllocationStatus {
  if (!isAllocationStatus(value)) {
    throw new Error(`Invalid AllocationStatus: ${value}`);
  }
}

export function isAllocationTerminalStatus(
  status: AllocationStatus
): status is AllocationTerminalStatus {
  return (ALLOCATION_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isAllocationNonTerminalStatus(
  status: AllocationStatus
): status is AllocationNonTerminalStatus {
  return (ALLOCATION_NON_TERMINAL_STATUSES as readonly string[]).includes(
    status
  );
}

export function isAllocationSuccessTerminalStatus(
  status: AllocationStatus
): status is AllocationSuccessTerminalStatus {
  return (ALLOCATION_SUCCESS_TERMINAL_STATUSES as readonly string[]).includes(
    status
  );
}

/**
 * Classify cardinality from source/target distinct counts.
 * Many-to-many / many-to-one typically realized as Allocation sets; a single
 * Allocation with multiple sources + multiple targets is many_to_many.
 */
export function classifyAllocationCardinality(
  allocation: Pick<MultiCheckAllocation, "sources" | "portions">
): AllocationCardinality {
  const sourceCount = new Set(
    allocation.sources.map((s) => s.sourceCheckId)
  ).size;
  const targetCount = new Set(
    allocation.portions.map((p) => p.targetCheckId)
  ).size;
  if (sourceCount <= 1 && targetCount <= 1) return "one_to_one";
  if (sourceCount <= 1 && targetCount > 1) return "one_to_many";
  if (sourceCount > 1 && targetCount <= 1) return "many_to_one";
  return "many_to_many";
}
