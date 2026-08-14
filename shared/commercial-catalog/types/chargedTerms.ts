/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Immutable charged commercial terms for the current subscription period.
 * Capabilities resolve from the live plan; billed price is frozen here / on invoices.
 */

export type CommercialChargedTerms = {
  planId: string;
  catalogPlanCode: string;
  commercialName: string;
  chargedAmount: string;
  chargedCurrency: string;
  billingCycleId: string;
  billingCycleCode: string;
  intervalCount: number;
  intervalUnit: "day" | "week" | "month" | "year";
  periodStart: string | null;
  periodEnd: string | null;
};
