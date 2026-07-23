/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — deterministic projection builders.
 *
 * Source: one committed Multi Check Allocation snapshot only.
 * Does NOT calculate money, validate domain invariants, or own lifecycle.
 *
 * Snapshot governance: builders emit one coherent immutable tree.
 * Nested children share the same Projection Revision, Projection Timestamp,
 * Allocation Revision, and Financial Reference. Never merge across revisions.
 */

import {
  classifyAllocationCardinality,
  isAllocationSuccessTerminalStatus,
  isAllocationTerminalStatus,
  type MultiCheckAllocation,
} from "../multiCheckAllocationContract";
import type { MultiCheckAllocationDomainEvent } from "../multiCheckAllocationEvents";
import {
  MULTI_CHECK_ALLOCATION_PROJECTION_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
  type MultiCheckAllocationAdjustmentProjection,
  type MultiCheckAllocationCommittedSnapshot,
  type MultiCheckAllocationPortionProjection,
  type MultiCheckAllocationProjection,
  type MultiCheckAllocationProjectionEventClaimKey,
  type MultiCheckAllocationProjectionSnapshotStamp,
  type MultiCheckAllocationProjectionTimelineEntry,
  type MultiCheckAllocationResponsibilityProjection,
  type MultiCheckAllocationReversalProjection,
  type MultiCheckAllocationSummaryProjection,
} from "./multiCheckAllocationProjectionContract";

export type MultiCheckAllocationProjectionBuildOptions = Readonly<{
  projectionTimestamp?: string;
}>;

function requireAllocationRevision(revision: number): number {
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error(
      `Invalid allocationRevision for projection snapshot: ${revision}`
    );
  }
  return revision;
}

/**
 * Deterministic revision from one committed Write Model snapshot.
 * Identical snapshot ⇒ identical revision (ADR-021 replay safe).
 */
export function buildMultiCheckAllocationProjectionRevision(
  snapshot: MultiCheckAllocationCommittedSnapshot
): string {
  const allocation = snapshot.allocation;
  const allocationRevision = requireAllocationRevision(
    snapshot.allocationRevision
  );
  return [
    `v${MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION}`,
    allocation.restaurantId,
    allocation.allocationId,
    allocation.allocationReference,
    allocation.financialReference ?? "",
    allocation.sourceCheckId,
    allocation.sourcePaymentId ?? "",
    allocation.status,
    allocation.financialResponsibility,
    allocation.allocatedAmount,
    allocation.remainingAmount,
    allocation.paymentValueCap ?? "",
    allocationRevision,
    allocation.sources.length,
    allocation.portions.length,
    allocation.adjustments.length,
    allocation.reversals.length,
    allocation.updatedAt,
  ].join("|");
}

export function buildMultiCheckAllocationPortionProjectionRevision(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  portionId: string
): string {
  const allocation = snapshot.allocation;
  const portion = allocation.portions.find((p) => p.portionId === portionId);
  return [
    buildMultiCheckAllocationProjectionRevision(snapshot),
    "portion",
    portionId,
    portion?.sequence ?? "",
    portion?.targetCheckId ?? "",
    portion?.amount ?? "",
    portion?.applied === true ? "1" : "0",
    portion?.createdAt ?? "",
  ].join("|");
}

export function buildMultiCheckAllocationAdjustmentProjectionRevision(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  adjustmentId: string
): string {
  const adjustment = snapshot.allocation.adjustments.find(
    (a) => a.adjustmentId === adjustmentId
  );
  return [
    buildMultiCheckAllocationProjectionRevision(snapshot),
    "adjustment",
    adjustmentId,
    adjustment?.portionId ?? "",
    adjustment?.amount ?? "",
    adjustment?.direction ?? "",
    adjustment?.createdAt ?? "",
  ].join("|");
}

export function buildMultiCheckAllocationReversalProjectionRevision(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  reversalId: string
): string {
  const reversal = snapshot.allocation.reversals.find(
    (r) => r.reversalId === reversalId
  );
  return [
    buildMultiCheckAllocationProjectionRevision(snapshot),
    "reversal",
    reversalId,
    reversal?.reversedAmount ?? "",
    reversal?.createdAt ?? "",
  ].join("|");
}

export function buildMultiCheckAllocationResponsibilityProjectionRevision(
  snapshot: MultiCheckAllocationCommittedSnapshot
): string {
  const allocation = snapshot.allocation;
  return [
    buildMultiCheckAllocationProjectionRevision(snapshot),
    "responsibility",
    allocation.financialResponsibility,
    allocation.allocatedAmount,
    allocation.remainingAmount,
  ].join("|");
}

function statusFlags(status: MultiCheckAllocation["status"]) {
  return {
    isPending: status === "pending",
    isReserved: status === "reserved",
    isApplied: status === "applied",
    isAdjusted: status === "adjusted",
    isReversed: status === "reversed",
    isCompleted: status === "completed",
    isCancelled: status === "cancelled",
    isTerminal: isAllocationTerminalStatus(status),
    isSuccessTerminal: isAllocationSuccessTerminalStatus(status),
  };
}

function buildTimeline(
  allocation: MultiCheckAllocation
): readonly MultiCheckAllocationProjectionTimelineEntry[] {
  const entries: MultiCheckAllocationProjectionTimelineEntry[] = [];
  for (const s of allocation.sources) {
    entries.push({
      kind: "source",
      id: `source:${s.sourceCheckId}:${s.sourcePaymentId ?? ""}`,
      amount: s.responsibilityAmount,
      at: allocation.createdAt,
      sourceCheckId: s.sourceCheckId,
      targetCheckId: null,
      portionId: null,
      direction: null,
    });
  }
  for (const p of allocation.portions) {
    entries.push({
      kind: "portion",
      id: p.portionId,
      amount: p.amount,
      at: p.createdAt,
      sourceCheckId: allocation.sourceCheckId,
      targetCheckId: p.targetCheckId,
      portionId: p.portionId,
      direction: null,
    });
  }
  for (const a of allocation.adjustments) {
    entries.push({
      kind: "adjustment",
      id: a.adjustmentId,
      amount: a.amount,
      at: a.createdAt,
      sourceCheckId: allocation.sourceCheckId,
      targetCheckId: null,
      portionId: a.portionId,
      direction: a.direction,
    });
  }
  for (const r of allocation.reversals) {
    entries.push({
      kind: "reversal",
      id: r.reversalId,
      amount: r.reversedAmount,
      at: r.createdAt,
      sourceCheckId: allocation.sourceCheckId,
      targetCheckId: null,
      portionId: null,
      direction: null,
    });
  }
  return entries.slice().sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function resolveStamp(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationProjectionSnapshotStamp {
  const projectionRevision =
    buildMultiCheckAllocationProjectionRevision(snapshot);
  return {
    projectionRevision,
    projectionTimestamp:
      options?.projectionTimestamp ?? snapshot.allocation.updatedAt,
    allocationRevision: requireAllocationRevision(snapshot.allocationRevision),
    financialReference: snapshot.allocation.financialReference,
  };
}

export function buildMultiCheckAllocationPortionProjection(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  portionId: string,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationPortionProjection {
  const allocation = snapshot.allocation;
  const portion = allocation.portions.find((p) => p.portionId === portionId);
  if (!portion) {
    throw new Error(
      `Portion ${portionId} not found on allocation ${allocation.allocationId}`
    );
  }
  const stamp = resolveStamp(snapshot, options);
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    portionId: portion.portionId,
    sequence: portion.sequence,
    targetCheckId: portion.targetCheckId,
    amount: portion.amount,
    applied: portion.applied,
    createdAt: portion.createdAt,
    allocationRevision: stamp.allocationRevision,
    financialReference: stamp.financialReference,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: buildMultiCheckAllocationPortionProjectionRevision(
      snapshot,
      portion.portionId
    ),
    projectionTimestamp: stamp.projectionTimestamp,
  };
}

export function buildMultiCheckAllocationAdjustmentProjection(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  adjustmentId: string,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationAdjustmentProjection {
  const allocation = snapshot.allocation;
  const adjustment = allocation.adjustments.find(
    (a) => a.adjustmentId === adjustmentId
  );
  if (!adjustment) {
    throw new Error(
      `Adjustment ${adjustmentId} not found on allocation ${allocation.allocationId}`
    );
  }
  const stamp = resolveStamp(snapshot, options);
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    adjustmentId: adjustment.adjustmentId,
    portionId: adjustment.portionId,
    amount: adjustment.amount,
    direction: adjustment.direction,
    createdAt: adjustment.createdAt,
    allocationRevision: stamp.allocationRevision,
    financialReference: stamp.financialReference,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: buildMultiCheckAllocationAdjustmentProjectionRevision(
      snapshot,
      adjustment.adjustmentId
    ),
    projectionTimestamp: stamp.projectionTimestamp,
  };
}

export function buildMultiCheckAllocationReversalProjection(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  reversalId: string,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationReversalProjection {
  const allocation = snapshot.allocation;
  const reversal = allocation.reversals.find((r) => r.reversalId === reversalId);
  if (!reversal) {
    throw new Error(
      `Reversal ${reversalId} not found on allocation ${allocation.allocationId}`
    );
  }
  const stamp = resolveStamp(snapshot, options);
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    reversalId: reversal.reversalId,
    reversedAmount: reversal.reversedAmount,
    createdAt: reversal.createdAt,
    allocationRevision: stamp.allocationRevision,
    financialReference: stamp.financialReference,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: buildMultiCheckAllocationReversalProjectionRevision(
      snapshot,
      reversal.reversalId
    ),
    projectionTimestamp: stamp.projectionTimestamp,
  };
}

export function buildMultiCheckAllocationResponsibilityProjection(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationResponsibilityProjection {
  const allocation = snapshot.allocation;
  const stamp = resolveStamp(snapshot, options);
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    financialResponsibility: allocation.financialResponsibility,
    allocatedAmount: allocation.allocatedAmount,
    remainingAmount: allocation.remainingAmount,
    allocationRevision: stamp.allocationRevision,
    financialReference: stamp.financialReference,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision:
      buildMultiCheckAllocationResponsibilityProjectionRevision(snapshot),
    projectionTimestamp: stamp.projectionTimestamp,
  };
}

export function buildMultiCheckAllocationSummaryProjection(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationSummaryProjection {
  const allocation = snapshot.allocation;
  const stamp = resolveStamp(snapshot, options);
  const flags = statusFlags(allocation.status);
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    allocationReference: allocation.allocationReference,
    financialReference: stamp.financialReference,
    sourceCheckId: allocation.sourceCheckId,
    sourcePaymentId: allocation.sourcePaymentId,
    allocationStatus: allocation.status,
    financialResponsibility: allocation.financialResponsibility,
    allocatedAmount: allocation.allocatedAmount,
    remainingAmount: allocation.remainingAmount,
    portionCount: allocation.portions.length,
    adjustmentCount: allocation.adjustments.length,
    reversalCount: allocation.reversals.length,
    cardinality: classifyAllocationCardinality(allocation),
    isTerminal: flags.isTerminal,
    isCompleted: flags.isCompleted,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
    allocationRevision: stamp.allocationRevision,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: stamp.projectionRevision,
    projectionTimestamp: stamp.projectionTimestamp,
  };
}

/**
 * Build one immutable Allocation projection snapshot from one committed state.
 */
export function buildMultiCheckAllocationProjection(
  snapshot: MultiCheckAllocationCommittedSnapshot,
  options?: MultiCheckAllocationProjectionBuildOptions
): MultiCheckAllocationProjection {
  const allocation = snapshot.allocation;
  const stamp = resolveStamp(snapshot, options);
  const childOptions: MultiCheckAllocationProjectionBuildOptions = {
    projectionTimestamp: stamp.projectionTimestamp,
  };

  const portions = allocation.portions
    .slice()
    .sort((a, b) =>
      a.sequence !== b.sequence
        ? a.sequence - b.sequence
        : a.portionId < b.portionId
          ? -1
          : a.portionId > b.portionId
            ? 1
            : 0
    )
    .map((p) =>
      buildMultiCheckAllocationPortionProjection(
        snapshot,
        p.portionId,
        childOptions
      )
    );
  const adjustments = allocation.adjustments
    .slice()
    .sort((a, b) =>
      a.createdAt !== b.createdAt
        ? a.createdAt < b.createdAt
          ? -1
          : 1
        : a.adjustmentId < b.adjustmentId
          ? -1
          : a.adjustmentId > b.adjustmentId
            ? 1
            : 0
    )
    .map((a) =>
      buildMultiCheckAllocationAdjustmentProjection(
        snapshot,
        a.adjustmentId,
        childOptions
      )
    );
  const reversals = allocation.reversals
    .slice()
    .sort((a, b) =>
      a.createdAt !== b.createdAt
        ? a.createdAt < b.createdAt
          ? -1
          : 1
        : a.reversalId < b.reversalId
          ? -1
          : a.reversalId > b.reversalId
            ? 1
            : 0
    )
    .map((r) =>
      buildMultiCheckAllocationReversalProjection(
        snapshot,
        r.reversalId,
        childOptions
      )
    );
  const targetCheckIds = [
    ...new Set(allocation.portions.map((p) => p.targetCheckId)),
  ].sort((a, b) => a - b);

  const projection: MultiCheckAllocationProjection = {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    allocationReference: allocation.allocationReference,
    financialReference: stamp.financialReference,
    sourceCheckId: allocation.sourceCheckId,
    sourcePaymentId: allocation.sourcePaymentId,
    allocationStatus: allocation.status,
    financialResponsibility: allocation.financialResponsibility,
    allocatedAmount: allocation.allocatedAmount,
    remainingAmount: allocation.remainingAmount,
    paymentValueCap: allocation.paymentValueCap,
    allocationRevision: stamp.allocationRevision,
    ...statusFlags(allocation.status),
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    cardinality: classifyAllocationCardinality(allocation),
    sourceCount: allocation.sources.length,
    portionCount: allocation.portions.length,
    adjustmentCount: allocation.adjustments.length,
    reversalCount: allocation.reversals.length,
    targetCheckIds,
    sources: allocation.sources.map((s) => ({
      sourceCheckId: s.sourceCheckId,
      sourcePaymentId: s.sourcePaymentId,
      financialReference: s.financialReference,
      responsibilityAmount: s.responsibilityAmount,
    })),
    targets: allocation.portions.map((p) => ({
      targetCheckId: p.targetCheckId,
      portionId: p.portionId,
      amount: p.amount,
      applied: p.applied,
    })),
    portions,
    adjustments,
    reversals,
    responsibility: buildMultiCheckAllocationResponsibilityProjection(
      snapshot,
      childOptions
    ),
    timeline: buildTimeline(allocation),
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: stamp.projectionRevision,
    projectionTimestamp: stamp.projectionTimestamp,
    metadata: {
      projectionId: MULTI_CHECK_ALLOCATION_PROJECTION_ID,
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: stamp.projectionRevision,
      projectionTimestamp: stamp.projectionTimestamp,
      allocationRevision: stamp.allocationRevision,
      financialReference: stamp.financialReference,
      projectedAt: stamp.projectionTimestamp,
    },
  };

  assertMultiCheckAllocationProjectionSnapshotCoherent(projection);
  return projection;
}

export function buildMultiCheckAllocationProjections(
  snapshots: readonly MultiCheckAllocationCommittedSnapshot[],
  options?: MultiCheckAllocationProjectionBuildOptions
): readonly MultiCheckAllocationProjection[] {
  return snapshots
    .map((s) => buildMultiCheckAllocationProjection(s, options))
    .slice()
    .sort((a, b) => {
      if (a.sourceCheckId !== b.sourceCheckId) {
        return a.sourceCheckId - b.sourceCheckId;
      }
      return a.allocationId < b.allocationId
        ? -1
        : a.allocationId > b.allocationId
          ? 1
          : 0;
    });
}

/**
 * Snapshot coherence: every nested read model shares Allocation Revision,
 * Projection Timestamp, and Financial Reference with the root. Child
 * projectionRevision values are stamped under the same parent revision
 * fingerprint (never mixed across Allocation revisions).
 */
export function isMultiCheckAllocationProjectionSnapshotCoherent(
  projection: MultiCheckAllocationProjection
): boolean {
  const rootRevision = projection.projectionRevision;
  const rootTs = projection.projectionTimestamp;
  const rootAllocRev = projection.allocationRevision;
  const rootFinRef = projection.financialReference;

  if (projection.metadata.projectionRevision !== rootRevision) return false;
  if (projection.metadata.projectionTimestamp !== rootTs) return false;
  if (projection.metadata.allocationRevision !== rootAllocRev) return false;
  if (projection.metadata.financialReference !== rootFinRef) return false;
  if (projection.metadata.projectedAt !== rootTs) return false;

  if (projection.responsibility.allocationRevision !== rootAllocRev) {
    return false;
  }
  if (projection.responsibility.projectionTimestamp !== rootTs) return false;
  if (projection.responsibility.financialReference !== rootFinRef) {
    return false;
  }
  if (
    !projection.responsibility.projectionRevision.startsWith(rootRevision)
  ) {
    return false;
  }

  for (const child of [
    ...projection.portions,
    ...projection.adjustments,
    ...projection.reversals,
  ]) {
    if (child.allocationId !== projection.allocationId) return false;
    if (child.restaurantId !== projection.restaurantId) return false;
    if (child.allocationRevision !== rootAllocRev) return false;
    if (child.projectionTimestamp !== rootTs) return false;
    if (child.financialReference !== rootFinRef) return false;
    if (!child.projectionRevision.startsWith(rootRevision)) return false;
  }

  return true;
}

export function assertMultiCheckAllocationProjectionSnapshotCoherent(
  projection: MultiCheckAllocationProjection
): void {
  if (!isMultiCheckAllocationProjectionSnapshotCoherent(projection)) {
    throw new Error(
      `MultiCheckAllocation projection snapshot is not coherent for ${projection.allocationId}@${projection.allocationRevision}`
    );
  }
}

/**
 * Deterministic claim key for collected Domain Events (no bus).
 * Duplicate delivery of the same fact yields the same key.
 */
export function buildMultiCheckAllocationProjectionEventClaimKey(
  event: MultiCheckAllocationDomainEvent
): MultiCheckAllocationProjectionEventClaimKey {
  if (event.eventType === "AllocationAdjusted") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.adjustmentId,
      event.direction,
      event.amount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationReversed") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.reversalId,
      event.reversedAmount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationResponsibilityTransferred") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.portionId,
      event.sequence,
      event.fromCheckId,
      event.toCheckId,
      event.amount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationOutstandingChanged") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.checkId,
      event.direction,
      event.amount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationApplied") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.allocatedAmount,
      event.remainingAmount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationReserved") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.reservedAmount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationCreated") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.financialResponsibility,
      event.portionCount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  if (event.eventType === "AllocationCompleted") {
    return [
      event.eventType,
      event.restaurantId,
      event.allocationId,
      event.allocatedAmount,
      event.status,
      event.occurredAt,
    ].join("|");
  }
  return [
    event.eventType,
    event.restaurantId,
    event.allocationId,
    event.status,
    event.occurredAt,
  ].join("|");
}
