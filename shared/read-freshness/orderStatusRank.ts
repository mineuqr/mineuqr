/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Domain-compatible status progression for client freshness governance.
 * Matches OrderLifecyclePolicy forward edges (no Ready→Preparing).
 */

export type OrderFreshnessStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

/** Higher = newer forward progress. Terminals share the top band. */
const RANK: Record<OrderFreshnessStatus, number> = {
  pending: 1,
  preparing: 2,
  ready: 3,
  served: 4,
  cancelled: 4,
};

export function normalizeOrderFreshnessStatus(
  status: string | null | undefined
): OrderFreshnessStatus | null {
  if (
    status === "pending" ||
    status === "preparing" ||
    status === "ready" ||
    status === "served" ||
    status === "cancelled"
  ) {
    return status;
  }
  return null;
}

export function orderStatusFreshnessRank(
  status: string | null | undefined
): number | null {
  const normalized = normalizeOrderFreshnessStatus(status);
  return normalized == null ? null : RANK[normalized];
}

/**
 * Compare two status values for cache merge.
 * Returns which status is fresher, or equal when ranks match.
 */
export function compareOrderStatusFreshness(
  existingStatus: string | null | undefined,
  incomingStatus: string | null | undefined
): "existing" | "incoming" | "equal" | "incomparable" {
  const existingRank = orderStatusFreshnessRank(existingStatus);
  const incomingRank = orderStatusFreshnessRank(incomingStatus);
  if (existingRank == null || incomingRank == null) return "incomparable";
  if (incomingRank > existingRank) return "incoming";
  if (incomingRank < existingRank) return "existing";
  return "equal";
}
