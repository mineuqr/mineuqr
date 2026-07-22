/**
 * ORDER-SETTLEMENT-PROJECTION-1 — post-commit Read Model materializer.
 *
 * Projection source:
 *   Check Aggregate → Order Settlement Domain → Committed Persistence State
 *
 * Consumes collected Domain Events from Integration outputs for ADR-021 claims.
 * Does NOT publish, broker, or mutate Write Model.
 *
 * Call ONLY after successful financial transaction completion.
 * Projection failures are isolated — they must not rollback committed finance.
 */

import type {
  OrderSettlement,
  OrderSettlementDomainEvent,
  OrderSettlementProjection,
} from "@shared/operational-session";
import {
  buildOrderSettlementProjection,
  buildOrderSettlementProjectionEventClaimKey,
} from "@shared/operational-session";
import type { OrderSettlementProjectionStore } from "./orderSettlementProjectionStore";

export type OrderSettlementProjectionMaterializeInput = Readonly<{
  /** Committed Write Model entities (required source of projected state). */
  committedSettlements: readonly OrderSettlement[];
  /**
   * Collected Domain Events from Integration / Aggregate outputs.
   * Used for idempotent claims only — state always rebuilt from committedSettlements.
   */
  events?: readonly OrderSettlementDomainEvent[];
}>;

export type OrderSettlementProjectionMaterializeResult = Readonly<{
  projections: readonly OrderSettlementProjection[];
  appliedEventClaims: number;
  skippedDuplicateEventClaims: number;
}>;

/**
 * Materialize Read Model from committed Order Settlements.
 * Safe to retry: identical committed state ⇒ identical projections + revisions.
 */
export async function materializeOrderSettlementProjections(
  store: OrderSettlementProjectionStore,
  input: OrderSettlementProjectionMaterializeInput
): Promise<OrderSettlementProjectionMaterializeResult> {
  let appliedEventClaims = 0;
  let skippedDuplicateEventClaims = 0;

  for (const event of input.events ?? []) {
    const claimKey = buildOrderSettlementProjectionEventClaimKey(event);
    if (await store.hasEventClaim(claimKey)) {
      skippedDuplicateEventClaims += 1;
      continue;
    }
    await store.recordEventClaim(claimKey);
    appliedEventClaims += 1;
  }

  const projections: OrderSettlementProjection[] = [];
  for (const settlement of input.committedSettlements) {
    const projection = buildOrderSettlementProjection(settlement);
    await store.upsert(projection);
    projections.push(projection);
  }

  return {
    projections,
    appliedEventClaims,
    skippedDuplicateEventClaims,
  };
}

/**
 * Isolate projection failures from the Write Model.
 * Returns null on failure; never throws to callers that opt into soft apply.
 */
export async function tryMaterializeOrderSettlementProjections(
  store: OrderSettlementProjectionStore,
  input: OrderSettlementProjectionMaterializeInput
): Promise<OrderSettlementProjectionMaterializeResult | null> {
  try {
    return await materializeOrderSettlementProjections(store, input);
  } catch {
    return null;
  }
}
