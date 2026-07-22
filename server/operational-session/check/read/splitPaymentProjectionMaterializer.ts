/**
 * SPLIT-PAYMENT-PROJECTION-1 — post-commit Read Model materializer.
 *
 * Projection source:
 *   Check Aggregate → Split Payment Domain → Committed Persistence State
 *
 * Consumes collected Domain Events from Integration outputs for ADR-021 claims.
 * Does NOT publish, broker, or mutate Write Model.
 *
 * Call ONLY after successful financial transaction completion.
 * Projection failures are isolated — they must not rollback committed finance.
 */

import type {
  CheckFinancialResponsibility,
  PaymentAttempt,
  SplitPayment,
  SplitPaymentAttemptProjection,
  SplitPaymentDomainEvent,
  SplitPaymentOutstandingProjection,
  SplitPaymentProjection,
} from "@shared/operational-session";
import {
  buildSplitPaymentAttemptProjection,
  buildSplitPaymentOutstandingProjection,
  buildSplitPaymentProjection,
  buildSplitPaymentProjectionEventClaimKey,
} from "@shared/operational-session";
import type { SplitPaymentProjectionStore } from "./splitPaymentProjectionStore";

export type SplitPaymentProjectionMaterializeInput = Readonly<{
  /** Committed Payment Write Model entities (primary source of projected state). */
  committedPayments: readonly SplitPayment[];
  /** Committed Payment Attempt historical rows. */
  committedAttempts?: readonly PaymentAttempt[];
  /** Optional Check-scoped outstanding snapshot (copied, not calculated). */
  committedOutstanding?: CheckFinancialResponsibility | null;
  /**
   * Collected Domain Events from Integration / Aggregate outputs.
   * Used for idempotent claims only — state always rebuilt from committed entities.
   */
  events?: readonly SplitPaymentDomainEvent[];
  /** Optional wall-clock stamp for projectionTimestamp metadata. */
  projectionTimestamp?: string;
}>;

export type SplitPaymentProjectionMaterializeResult = Readonly<{
  payments: readonly SplitPaymentProjection[];
  attempts: readonly SplitPaymentAttemptProjection[];
  outstanding: SplitPaymentOutstandingProjection | null;
  appliedEventClaims: number;
  skippedDuplicateEventClaims: number;
}>;

/**
 * Materialize Read Model from committed Split Payment state.
 * Safe to retry: identical committed state ⇒ identical projections + revisions.
 */
export async function materializeSplitPaymentProjections(
  store: SplitPaymentProjectionStore,
  input: SplitPaymentProjectionMaterializeInput
): Promise<SplitPaymentProjectionMaterializeResult> {
  let appliedEventClaims = 0;
  let skippedDuplicateEventClaims = 0;
  const ts = input.projectionTimestamp;

  for (const event of input.events ?? []) {
    const claimKey = buildSplitPaymentProjectionEventClaimKey(event);
    if (await store.hasEventClaim(claimKey)) {
      skippedDuplicateEventClaims += 1;
      continue;
    }
    await store.recordEventClaim(claimKey);
    appliedEventClaims += 1;
  }

  const payments: SplitPaymentProjection[] = [];
  for (const payment of input.committedPayments) {
    const projection = buildSplitPaymentProjection(payment, {
      projectionTimestamp: ts,
    });
    await store.upsertPayment(projection);
    payments.push(projection);
  }

  const attempts: SplitPaymentAttemptProjection[] = [];
  for (const attempt of input.committedAttempts ?? []) {
    const projection = buildSplitPaymentAttemptProjection(attempt, {
      projectionTimestamp: ts,
    });
    await store.upsertAttempt(projection);
    attempts.push(projection);
  }

  let outstanding: SplitPaymentOutstandingProjection | null = null;
  if (input.committedOutstanding) {
    outstanding = buildSplitPaymentOutstandingProjection(
      input.committedOutstanding,
      { projectionTimestamp: ts }
    );
    await store.upsertOutstanding(outstanding);
  }

  return {
    payments,
    attempts,
    outstanding,
    appliedEventClaims,
    skippedDuplicateEventClaims,
  };
}

/**
 * Isolate projection failures from the Write Model.
 * Returns null on failure; never throws to callers that opt into soft apply.
 */
export async function tryMaterializeSplitPaymentProjections(
  store: SplitPaymentProjectionStore,
  input: SplitPaymentProjectionMaterializeInput
): Promise<SplitPaymentProjectionMaterializeResult | null> {
  try {
    return await materializeSplitPaymentProjections(store, input);
  } catch {
    return null;
  }
}
