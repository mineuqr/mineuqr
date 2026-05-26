import type { BillingCycle, SubscriptionPlanLike } from "./types";

function parseAmount(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isNaN(n) ? 0 : n;
}

/** Price charged for the selected billing cycle (not normalized to monthly). */
export function getPlanPrice(
  plan: SubscriptionPlanLike | null | undefined,
  billingCycle: BillingCycle
): number {
  if (!plan) return 0;
  if (billingCycle === "yearly") {
    return parseAmount(plan.priceYearly ?? plan.priceMonthly);
  }
  return parseAmount(plan.priceMonthly);
}
