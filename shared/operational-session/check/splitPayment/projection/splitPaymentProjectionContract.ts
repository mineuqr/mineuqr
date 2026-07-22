/**
 * SPLIT-PAYMENT-PROJECTION-1 — canonical Split Payment Read Model contracts.
 *
 * Read model only. Not a source of business truth (ADR-ARCH-024).
 * No lifecycle ownership, settlement authority, commands, or money math.
 */

import type {
  PaymentAttemptStatus,
  SplitPaymentStatus,
  TenderMethod,
} from "../splitPaymentContract";

export const SPLIT_PAYMENT_PROJECTION_PROGRAM_ID =
  "SPLIT-PAYMENT-PROJECTION-1" as const;

/** Schema version for replay / consumer compatibility (not business semantics). */
export const SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION = 1 as const;

/** Canonical projection identifier (Check / FSP owned). */
export const SPLIT_PAYMENT_PROJECTION_ID = "SP-P-01-split-payment" as const;

/** Timeline entry kinds — denormalized from committed Write Model children only. */
export type SplitPaymentProjectionTimelineKind =
  | "tender"
  | "tender_allocation"
  | "payment_allocation";

export type SplitPaymentProjectionTimelineEntry = Readonly<{
  kind: SplitPaymentProjectionTimelineKind;
  id: string;
  amount: string;
  at: string;
  method: TenderMethod | null;
  orderId: number | null;
  tenderId: string | null;
}>;

export type SplitPaymentProjectionTenderBreakdown = Readonly<{
  tenderId: string;
  method: TenderMethod;
  amount: string;
  createdAt: string;
}>;

export type SplitPaymentProjectionAllocationBreakdown = Readonly<{
  allocationId: string;
  orderId: number;
  amount: string;
  createdAt: string;
}>;

export type SplitPaymentProjectionTenderAllocationBreakdown = Readonly<{
  tenderAllocationId: string;
  tenderId: string;
  amount: string;
  createdAt: string;
}>;

/**
 * Latest committed Payment financial state for operational reads.
 * Monetary fields are copied from the Write Model — never recalculated.
 */
export type SplitPaymentProjection = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
  paymentReference: string;
  financialReference: string | null;
  paymentStatus: SplitPaymentStatus;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  isPending: boolean;
  isAuthorized: boolean;
  isCaptured: boolean;
  isPartiallyApplied: boolean;
  isApplied: boolean;
  isCancelled: boolean;
  isVoided: boolean;
  isRefunded: boolean;
  isFailed: boolean;
  /** Copied flag denormalization — value-received statuses. */
  isValueReceived: boolean;
  isTerminal: boolean;
  /** Payment Completion at Payment level (status === applied). */
  isPaymentCompleted: boolean;
  /**
   * Always false — Financial Completion is Check Aggregate exclusive.
   * Copied from Write Model; never inferred by Projection.
   */
  impliesFinancialSettlement: false;
  isFinanciallyComplete: false;
  tenderMethods: readonly TenderMethod[];
  tenderCount: number;
  tenderAllocationCount: number;
  allocationCount: number;
  tenders: readonly SplitPaymentProjectionTenderBreakdown[];
  tenderAllocations: readonly SplitPaymentProjectionTenderAllocationBreakdown[];
  allocations: readonly SplitPaymentProjectionAllocationBreakdown[];
  timeline: readonly SplitPaymentProjectionTimelineEntry[];
  /** Write-model timestamp of last non-pending activity; null when pending. */
  lastPaymentActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectionSchemaVersion: typeof SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  /** Materialization wall-clock for consumers (ISO string from caller or updatedAt). */
  projectionTimestamp: string;
}>;

export type SplitPaymentProjectionIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
}>;

/** Check-scoped Outstanding read model — copied from Check Aggregate snapshot. */
export type SplitPaymentOutstandingProjection = Readonly<{
  restaurantId: number;
  checkId: number;
  financialResponsibility: string;
  appliedPaymentValue: string;
  outstandingBalance: string;
  projectionSchemaVersion: typeof SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

export type SplitPaymentOutstandingProjectionIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
}>;

/** Payment Attempt historical read model — copied from committed Attempt rows. */
export type SplitPaymentAttemptProjection = Readonly<{
  restaurantId: number;
  checkId: number;
  attemptId: string;
  paymentId: string | null;
  attemptStatus: PaymentAttemptStatus;
  amount: string;
  method: TenderMethod;
  isStarted: boolean;
  isSucceeded: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  createdAt: string;
  updatedAt: string;
  projectionSchemaVersion: typeof SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

export type SplitPaymentAttemptProjectionIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  attemptId: string;
}>;

/** ADR-021-compatible claim key for a consumed Domain Event (no bus). */
export type SplitPaymentProjectionEventClaimKey = string;
