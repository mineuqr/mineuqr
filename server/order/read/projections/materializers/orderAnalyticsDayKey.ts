/**
 * REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1
 *
 * Canonical Business Day ownership for Order Analytics (P-10).
 *
 * Every P-10 metric for an order belongs to the Business Day of `order.createdAt`.
 * Incremental, rebuild, backfill, replay, and recovery MUST call this helper —
 * never `envelope.occurredAt`, `servedAt`, or UTC/wall slices.
 *
 * Business Day resolution itself remains owned by
 * `@shared/utils/businessDay` (`resolveBusinessDayKey`) — this module only
 * selects the governing timestamp for Order Analytics.
 */

import {
  resolveBusinessDayKey,
  resolveNormalizedOpeningHours,
  type NormalizedWorkingHours,
} from "@shared/utils/businessDay";

/**
 * Governing timestamp for Order Analytics day membership: order placement time.
 */
export function orderAnalyticsBusinessDayKey(
  orderCreatedAt: string,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): string {
  return resolveBusinessDayKey(orderCreatedAt, workingHours);
}
