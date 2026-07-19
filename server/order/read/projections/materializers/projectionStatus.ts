import {
  resolveBusinessDayKey,
  resolveNormalizedOpeningHours,
  type NormalizedWorkingHours,
} from "@shared/utils/businessDay";

export const ACTIVE_ORDER_STATUSES = ["pending", "preparing", "ready"] as const;

export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];

export function isActiveOrderStatus(status: string): status is ActiveOrderStatus {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function statusBucket(status: string): ActiveOrderStatus | null {
  return isActiveOrderStatus(status) ? status : null;
}

/**
 * REPORTING-BUSINESS-DAY-ADOPTION-1 — Business Day label from a timestamp.
 * Never UTC calendar slice (ts.slice(0,10)).
 *
 * For Order Analytics (P-10) day membership, call
 * `orderAnalyticsBusinessDayKey(order.createdAt)` — do not pass servedAt /
 * envelope.occurredAt (REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1).
 */
export function dayKeyFromTimestamp(
  ts: string,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): string {
  return resolveBusinessDayKey(ts, workingHours);
}
