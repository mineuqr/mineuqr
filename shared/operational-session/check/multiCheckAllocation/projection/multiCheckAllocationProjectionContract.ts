/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — canonical Multi Check Allocation Read Model contracts.
 *
 * Read model only. Not a source of business truth (ADR-ARCH-025).
 * No lifecycle ownership, settlement authority, commands, or money math.
 *
 * ─── Projection Snapshot Governance ───────────────────────────────
 * Every Projection represents one immutable financial snapshot.
 * A snapshot MUST preserve:
 *   • Projection Revision
 *   • Projection Timestamp
 *   • Allocation Revision
 *   • Financial Reference
 *   • Canonical Identities
 * Snapshots MUST NEVER merge data originating from different Allocation revisions.
 * Each projection refresh completely replaces the previous snapshot.
 * Read models MUST always represent one coherent committed financial state.
 */

import type {
  AllocationCardinality,
  AllocationStatus,
  MultiCheckAllocation,
} from "../multiCheckAllocationContract";

export const MULTI_CHECK_ALLOCATION_PROJECTION_PROGRAM_ID =
  "MULTI-CHECK-ALLOCATION-PROJECTION-1" as const;

/** Schema version for replay / consumer compatibility (not business semantics). */
export const MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION = 2 as const;

/** Canonical projection identifier (Check / FSP owned). */
export const MULTI_CHECK_ALLOCATION_PROJECTION_ID =
  "MCA-P-01-multi-check-allocation" as const;

/**
 * One committed Write Model financial state used as the sole builder input.
 * `allocationRevision` is the persistence CAS version for that commit —
 * not invented by Projection and not an API version.
 */
export type MultiCheckAllocationCommittedSnapshot = Readonly<{
  allocation: MultiCheckAllocation;
  allocationRevision: number;
}>;

/** Snapshot key — identity + Allocation Revision (immutable financial generation). */
export type MultiCheckAllocationProjectionSnapshotKey = Readonly<{
  restaurantId: number;
  allocationId: string;
  allocationRevision: number;
  projectionRevision: string;
}>;

/** Timeline entry kinds — denormalized from committed Write Model children only. */
export type MultiCheckAllocationProjectionTimelineKind =
  | "source"
  | "portion"
  | "adjustment"
  | "reversal";

export type MultiCheckAllocationProjectionTimelineEntry = Readonly<{
  kind: MultiCheckAllocationProjectionTimelineKind;
  id: string;
  amount: string;
  at: string;
  sourceCheckId: number | null;
  targetCheckId: number | null;
  portionId: string | null;
  direction: "increase" | "decrease" | null;
}>;

/**
 * Projection metadata — independent from API versioning.
 * Carries the immutable snapshot governance fields for the whole read model.
 */
export type MultiCheckAllocationProjectionMetadata = Readonly<{
  projectionId: typeof MULTI_CHECK_ALLOCATION_PROJECTION_ID;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
  allocationRevision: number;
  financialReference: string | null;
  projectedAt: string;
}>;

/** Shared snapshot stamp applied uniformly to a coherent projection tree. */
export type MultiCheckAllocationProjectionSnapshotStamp = Readonly<{
  projectionRevision: string;
  projectionTimestamp: string;
  allocationRevision: number;
  financialReference: string | null;
}>;

export type MultiCheckAllocationSourceProjection = Readonly<{
  sourceCheckId: number;
  sourcePaymentId: string | null;
  financialReference: string | null;
  responsibilityAmount: string;
}>;

export type MultiCheckAllocationTargetProjection = Readonly<{
  targetCheckId: number;
  portionId: string;
  amount: string;
  applied: boolean;
}>;

export type MultiCheckAllocationPortionProjection = Readonly<{
  restaurantId: number;
  allocationId: string;
  portionId: string;
  sequence: number;
  targetCheckId: number;
  amount: string;
  applied: boolean;
  createdAt: string;
  allocationRevision: number;
  financialReference: string | null;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

export type MultiCheckAllocationAdjustmentProjection = Readonly<{
  restaurantId: number;
  allocationId: string;
  adjustmentId: string;
  portionId: string | null;
  amount: string;
  direction: "increase" | "decrease";
  createdAt: string;
  allocationRevision: number;
  financialReference: string | null;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

export type MultiCheckAllocationReversalProjection = Readonly<{
  restaurantId: number;
  allocationId: string;
  reversalId: string;
  reversedAmount: string;
  createdAt: string;
  allocationRevision: number;
  financialReference: string | null;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

/** Outstanding responsibility — copied from one committed Allocation snapshot. */
export type MultiCheckAllocationResponsibilityProjection = Readonly<{
  restaurantId: number;
  allocationId: string;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  allocationRevision: number;
  financialReference: string | null;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

/**
 * Lightweight list / index read model.
 * Monetary fields are copied from the Write Model — never recalculated.
 */
export type MultiCheckAllocationSummaryProjection = Readonly<{
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  allocationStatus: AllocationStatus;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  portionCount: number;
  adjustmentCount: number;
  reversalCount: number;
  cardinality: AllocationCardinality;
  isTerminal: boolean;
  isCompleted: boolean;
  impliesCheckSettlement: false;
  impliesPaymentCompletion: false;
  createdAt: string;
  updatedAt: string;
  allocationRevision: number;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectionTimestamp: string;
}>;

/**
 * Latest committed Allocation financial snapshot for operational reads.
 * One immutable coherent state — never a merge across Allocation revisions.
 * Monetary fields are copied from the Write Model — never recalculated.
 */
export type MultiCheckAllocationProjection = Readonly<{
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  allocationStatus: AllocationStatus;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  paymentValueCap: string | null;
  /** Persistence CAS version of the committed Allocation this snapshot reflects. */
  allocationRevision: number;
  isPending: boolean;
  isReserved: boolean;
  isApplied: boolean;
  isAdjusted: boolean;
  isReversed: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isTerminal: boolean;
  isSuccessTerminal: boolean;
  /**
   * Always false — Financial Settlement is Check Aggregate exclusive.
   * Copied from Write Model; never inferred by Projection.
   */
  impliesCheckSettlement: false;
  /**
   * Always false — Payment Completion is Split Payment exclusive (ADR-024).
   */
  impliesPaymentCompletion: false;
  cardinality: AllocationCardinality;
  sourceCount: number;
  portionCount: number;
  adjustmentCount: number;
  reversalCount: number;
  targetCheckIds: readonly number[];
  sources: readonly MultiCheckAllocationSourceProjection[];
  targets: readonly MultiCheckAllocationTargetProjection[];
  portions: readonly MultiCheckAllocationPortionProjection[];
  adjustments: readonly MultiCheckAllocationAdjustmentProjection[];
  reversals: readonly MultiCheckAllocationReversalProjection[];
  responsibility: MultiCheckAllocationResponsibilityProjection;
  timeline: readonly MultiCheckAllocationProjectionTimelineEntry[];
  createdAt: string;
  updatedAt: string;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  /** Materialization wall-clock for consumers (ISO string from caller or updatedAt). */
  projectionTimestamp: string;
  metadata: MultiCheckAllocationProjectionMetadata;
}>;

export type MultiCheckAllocationProjectionIdentity = Readonly<{
  restaurantId: number;
  allocationId: string;
}>;

/** ADR-021-compatible claim key for a consumed Domain Event (no bus). */
export type MultiCheckAllocationProjectionEventClaimKey = string;
