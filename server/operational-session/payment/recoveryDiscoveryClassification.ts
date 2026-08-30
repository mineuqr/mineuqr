/**
 * RECOVERY-DISCOVERY-STARVATION-HARDENING-1
 * Classify Drawer Recovery results so discovery can exclude work that cannot
 * converge under current domain rules. Does not write Financial Core.
 *
 * RECOVERY-RESILIENCE-AND-DURABILITY-HARDENING-1 Phase 1
 * Check Recovery classifies typed Order-missing vs infrastructure errors.
 */

import { CheckOrderNotFoundError } from "../check/checkRecoveryErrors";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";

export type DrawerAttributionRecoveryClass =
  | "recovered"
  | "already_resolved"
  | "retryable"
  | "deferred"
  | "permanently_unrecoverable";

/** Deterministic: retry without a material domain change cannot succeed. */
export const PERMANENT_DRAWER_ATTRIBUTION_GAPS = [
  "no_shift_at_commit_time",
  "ambiguous_shift_at_commit_time",
  "shift_not_writable_for_attribution",
  "collection_fact_outside_shift_window",
  "collection_fact_commit_time_invalid",
  "wrong_restaurant",
  "isolated_collection_fact",
  "missing_collection_fact_id",
] as const;

/** Transient infrastructure / writer. Must remain retryable. */
export const RETRYABLE_DRAWER_ATTRIBUTION_GAPS = [
  "crmp_resolution_error",
  "attribution_create_failed",
  "collection_fact_lookup_failed",
] as const;

const PERMANENT = new Set<string>(PERMANENT_DRAWER_ATTRIBUTION_GAPS);
const RETRYABLE = new Set<string>(RETRYABLE_DRAWER_ATTRIBUTION_GAPS);

export function classifyDrawerAttributionRecovery(input: {
  outcome: string;
  gaps: readonly string[];
}): DrawerAttributionRecoveryClass {
  if (input.outcome === "created") return "recovered";
  if (input.outcome === "already_applied") return "already_resolved";
  if (input.gaps.some((gap) => PERMANENT.has(gap))) {
    return "permanently_unrecoverable";
  }
  if (
    input.outcome === "failed" ||
    input.gaps.some((gap) => RETRYABLE.has(gap))
  ) {
    return "retryable";
  }
  if (input.outcome === "skipped") return "deferred";
  return "retryable";
}

export function classifyCheckDownstreamRecovery(
  err: unknown
): DrawerAttributionRecoveryClass {
  if (err instanceof CheckOrderNotFoundError) {
    return "permanently_unrecoverable";
  }
  if (err instanceof DiningSessionUnavailableError) {
    return "retryable";
  }
  return "retryable";
}
