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
 * REPORTING-BUSINESS-DAY-ADOPTION-1 — analytics dayKey is Business Day label.
 * Never UTC calendar slice (ts.slice(0,10)).
 */
export function dayKeyFromTimestamp(
  ts: string,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): string {
  return resolveBusinessDayKey(ts, workingHours);
}
