import { COMMERCIAL_PLANS, type CommercialPlan } from "@commercial/planTypes";

export type PlanDistributionEntry = {
  planCode: CommercialPlan;
  ownerCount: number;
};

/**
 * EXEC-7C.6 — align sparse snapshot entries to the full canonical plan model for display.
 * Counts are read from snapshot only; absent plans render as 0 (not hidden).
 */
export function commercialOverviewPlanRows(
  entries: PlanDistributionEntry[] | undefined
): PlanDistributionEntry[] {
  if (!entries) return [];
  const counts = new Map(entries.map((entry) => [entry.planCode, entry.ownerCount]));
  return COMMERCIAL_PLANS.map((planCode) => ({
    planCode,
    ownerCount: counts.get(planCode) ?? 0,
  }));
}
