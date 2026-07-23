/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — post-commit Read Model materializer.
 *
 * Projection source:
 *   Check Aggregate → Multi Check Allocation Domain → Committed Persistence State
 *
 * Snapshot governance:
 *   • Each materialization builds one immutable financial snapshot per Allocation.
 *   • Refresh / replay / revision update COMPLETELY REPLACES the prior snapshot.
 *   • Snapshots NEVER merge fields from different Allocation revisions.
 *
 * Consumes collected Domain Events from Integration outputs for ADR-021 claims.
 * Does NOT publish, broker, or mutate Write Model.
 *
 * Call ONLY after successful financial transaction completion.
 * Projection failures are isolated — they must not rollback committed finance.
 */

import type {
  MultiCheckAllocationCommittedSnapshot,
  MultiCheckAllocationDomainEvent,
  MultiCheckAllocationProjection,
  MultiCheckAllocationSummaryProjection,
} from "@shared/operational-session";
import {
  assertMultiCheckAllocationProjectionSnapshotCoherent,
  buildMultiCheckAllocationProjection,
  buildMultiCheckAllocationProjectionEventClaimKey,
  buildMultiCheckAllocationSummaryProjection,
} from "@shared/operational-session";
import type { MultiCheckAllocationProjectionStore } from "./multiCheckAllocationProjectionStore";

export type MultiCheckAllocationProjectionMaterializeInput = Readonly<{
  /**
   * Committed Allocation snapshots (entity + Allocation Revision).
   * Primary and sole source of projected financial state.
   */
  committedSnapshots: readonly MultiCheckAllocationCommittedSnapshot[];
  /**
   * Collected Domain Events from Integration / Aggregate outputs.
   * Used for idempotent claims only — state always rebuilt from committed snapshots.
   */
  events?: readonly MultiCheckAllocationDomainEvent[];
  /** Optional wall-clock stamp for projectionTimestamp / projectedAt metadata. */
  projectionTimestamp?: string;
}>;

export type MultiCheckAllocationProjectionMaterializeResult = Readonly<{
  allocations: readonly MultiCheckAllocationProjection[];
  summaries: readonly MultiCheckAllocationSummaryProjection[];
  appliedEventClaims: number;
  skippedDuplicateEventClaims: number;
}>;

/**
 * Materialize Read Model from committed Multi Check Allocation snapshots.
 * Safe to retry: identical committed snapshot ⇒ identical projections + revisions.
 *
 * Supports initial projection, replay, refresh, revision update, and replacement
 * via full upsert-by-identity (complete snapshot replace — no patch merge).
 */
export async function materializeMultiCheckAllocationProjections(
  store: MultiCheckAllocationProjectionStore,
  input: MultiCheckAllocationProjectionMaterializeInput
): Promise<MultiCheckAllocationProjectionMaterializeResult> {
  let appliedEventClaims = 0;
  let skippedDuplicateEventClaims = 0;
  const ts = input.projectionTimestamp;

  for (const event of input.events ?? []) {
    const claimKey = buildMultiCheckAllocationProjectionEventClaimKey(event);
    if (await store.hasEventClaim(claimKey)) {
      skippedDuplicateEventClaims += 1;
      continue;
    }
    await store.recordEventClaim(claimKey);
    appliedEventClaims += 1;
  }

  const allocations: MultiCheckAllocationProjection[] = [];
  const summaries: MultiCheckAllocationSummaryProjection[] = [];

  for (const snapshot of input.committedSnapshots) {
    const projection = buildMultiCheckAllocationProjection(snapshot, {
      projectionTimestamp: ts,
    });
    assertMultiCheckAllocationProjectionSnapshotCoherent(projection);
    const summary = buildMultiCheckAllocationSummaryProjection(snapshot, {
      projectionTimestamp: ts,
    });
    // Full snapshot replacement — never merge with a prior Allocation revision.
    await store.upsertAllocation(projection);
    await store.upsertSummary(summary);
    allocations.push(projection);
    summaries.push(summary);
  }

  return {
    allocations,
    summaries,
    appliedEventClaims,
    skippedDuplicateEventClaims,
  };
}

/**
 * Isolate projection failures from the Write Model.
 * Returns null on failure; never throws to callers that opt into soft apply.
 */
export async function tryMaterializeMultiCheckAllocationProjections(
  store: MultiCheckAllocationProjectionStore,
  input: MultiCheckAllocationProjectionMaterializeInput
): Promise<MultiCheckAllocationProjectionMaterializeResult | null> {
  try {
    return await materializeMultiCheckAllocationProjections(store, input);
  } catch {
    return null;
  }
}
