/**
 * COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1
 * Canonical MRR value source: current Charged Terms snapshot only.
 * Does not read leftover Binding charged fields, catalog price, or the legacy plan table.
 */

import { loadCurrentChargedTermsForSubscriptions } from "../chargedTermsSnapshots";

export type ChargedTermsMrrRow = {
  subscriptionId: number;
  chargedAmount: string | null;
  chargedCurrency: string | null;
  billingCycleCode: string | null;
};

export type MrrContributionClassification =
  | "INCLUDED"
  | "EXCLUDED_ELIGIBILITY"
  | "INCOMPLETE_CHARGED_TERMS"
  | "ZERO_VALUE"
  | "UNSUPPORTED_CURRENCY"
  | "UNSUPPORTED_BILLING_CYCLE";

export type MrrEligibleState = {
  subscriptionId: number | null;
  billingCycle: "monthly" | "yearly" | null;
  commercialStatus: { countsInMrr: boolean };
};

export type MonthlyEquivalentResult = {
  value: number;
  classification: MrrContributionClassification;
};

const USD = "USD";

export function normalizeMrrBillingCycle(
  code: string | null | undefined
): "monthly" | "yearly" | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (normalized === "monthly" || normalized === "month") return "monthly";
  if (normalized === "yearly" || normalized === "year") return "yearly";
  return null;
}

export function monthlyEquivalentFromChargedTerms(
  chargedAmount: string | null,
  chargedCurrency: string | null,
  billingCycleCode: string | null,
  subscriptionBillingCycle: "monthly" | "yearly" | null
): MonthlyEquivalentResult {
  if (chargedAmount == null || chargedAmount.trim() === "") {
    return { value: 0, classification: "INCOMPLETE_CHARGED_TERMS" };
  }
  const amount = Number.parseFloat(chargedAmount);
  if (!Number.isFinite(amount)) {
    return { value: 0, classification: "INCOMPLETE_CHARGED_TERMS" };
  }
  if (amount <= 0) {
    return { value: 0, classification: "ZERO_VALUE" };
  }

  const currency = chargedCurrency?.trim();
  if (currency && currency.toUpperCase() !== USD) {
    return { value: 0, classification: "UNSUPPORTED_CURRENCY" };
  }

  const cycle =
    normalizeMrrBillingCycle(billingCycleCode) ??
    normalizeMrrBillingCycle(subscriptionBillingCycle);
  if (!cycle) {
    return { value: 0, classification: "UNSUPPORTED_BILLING_CYCLE" };
  }

  const monthly = cycle === "yearly" ? amount / 12 : amount;
  return { value: monthly, classification: "INCLUDED" };
}

export function computeMrrFromChargedTerms(
  states: MrrEligibleState[],
  termsBySubscriptionId: ReadonlyMap<number, ChargedTermsMrrRow>,
  suppressedSubscriptionIds?: ReadonlySet<number>
): number {
  let total = 0;
  for (const state of states) {
    if (!state.commercialStatus.countsInMrr) continue;
    if (state.subscriptionId == null) continue;
    if (suppressedSubscriptionIds?.has(state.subscriptionId)) continue;
    const terms = termsBySubscriptionId.get(state.subscriptionId);
    if (!terms) continue;
    const { value } = monthlyEquivalentFromChargedTerms(
      terms.chargedAmount,
      terms.chargedCurrency,
      terms.billingCycleCode,
      state.billingCycle
    );
    total += value;
  }
  return Math.round(total * 100) / 100;
}

export async function loadChargedTermsForMrr(
  subscriptionIds: number[]
): Promise<ChargedTermsMrrRow[]> {
  if (subscriptionIds.length === 0) return [];
  const { loadSubscriptionIdsWithCurrentConcession } = await import("../concessions");
  const suppressed = await loadSubscriptionIdsWithCurrentConcession(subscriptionIds);
  const eligibleIds = subscriptionIds.filter((id) => !suppressed.has(id));
  if (eligibleIds.length === 0) return [];
  const snapshots = await loadCurrentChargedTermsForSubscriptions(eligibleIds);
  return snapshots.map((row) => ({
    subscriptionId: row.subscriptionId,
    chargedAmount: row.chargedAmount,
    chargedCurrency: row.chargedCurrency,
    billingCycleCode: row.billingCycleCode,
  }));
}
