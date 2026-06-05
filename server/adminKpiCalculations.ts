/** Pure helpers for admin KPI aggregation (ADMIN-KPI-FIX-1). */

export type AdminKpiSubscriptionRow = {
  status: string;
  planId: number;
  billingCycle: string;
  createdAt?: string;
};

export type AdminKpiPlanRow = {
  id: number;
  priceMonthly: string | null;
  priceYearly: string | null;
};

export function monthlyEquivalentPlanPrice(
  sub: Pick<AdminKpiSubscriptionRow, "billingCycle">,
  plan: AdminKpiPlanRow | undefined
): number {
  if (!plan) return 0;
  if (sub.billingCycle === "yearly") {
    return parseFloat(plan.priceYearly || "0") / 12;
  }
  return parseFloat(plan.priceMonthly || "0");
}

/** MRR from paid active subscriptions only (excludes trial). */
export function computeAdminMrr(
  subs: AdminKpiSubscriptionRow[],
  plans: AdminKpiPlanRow[]
): number {
  const paying = subs.filter((s) => s.status === "active");
  const total = paying.reduce((sum, sub) => {
    const plan = plans.find((p) => p.id === sub.planId);
    return sum + monthlyEquivalentPlanPrice(sub, plan);
  }, 0);
  return Math.round(total * 100) / 100;
}

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
