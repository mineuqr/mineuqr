/** Pure helpers for admin KPI aggregation (ADMIN-KPI-FIX-1, LAUNCH-5B). */

/** Paying subscribers only — trials/expired/canceled are excluded from commercial revenue. */
export function subscriptionContributesToCommercialRevenue(status: string): boolean {
  return status === "active";
}

export type AdminKpiSubscriptionRow = {
  status: string;
  planId: string | number;
  billingCycle: string;
  createdAt?: string;
};

/** Share of subs that are active or trial (trials counted once). */
export function computeRenewalRate(
  totalSubs: number,
  activeOrTrialCount: number
): number {
  if (totalSubs === 0) return 0;
  return Math.round((activeOrTrialCount / totalSubs) * 10000) / 100;
}

export function computeChurnRate(
  totalSubs: number,
  canceledCount: number,
  expiredCount: number
): number {
  if (totalSubs === 0) return 0;
  return Math.round(((canceledCount + expiredCount) / totalSubs) * 10000) / 100;
}
