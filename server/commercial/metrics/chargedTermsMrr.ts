/**
 * COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1
 * Canonical MRR value source: Charged Terms on commercial_subscription_bindings.
 * Does not read the legacy plan price table, Live Plan catalog price, payments, or Check Revenue.
 */

import { inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { commercialSubscriptionBindings } from "../../db/schema/commercial/bindings";

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
  termsBySubscriptionId: ReadonlyMap<number, ChargedTermsMrrRow>
): number {
  let total = 0;
  for (const state of states) {
    if (!state.commercialStatus.countsInMrr) continue;
    if (state.subscriptionId == null) continue;
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
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        subscriptionId: commercialSubscriptionBindings.subscriptionId,
        chargedAmount: commercialSubscriptionBindings.chargedAmount,
        chargedCurrency: commercialSubscriptionBindings.chargedCurrency,
        billingCycleCode: commercialSubscriptionBindings.billingCycleCode,
      })
      .from(commercialSubscriptionBindings)
      .where(inArray(commercialSubscriptionBindings.subscriptionId, subscriptionIds));
    return rows.map((row) => ({
      subscriptionId: row.subscriptionId,
      chargedAmount: row.chargedAmount != null ? String(row.chargedAmount) : null,
      chargedCurrency: row.chargedCurrency ?? null,
      billingCycleCode: row.billingCycleCode ?? null,
    }));
  } catch {
    return [];
  }
}
