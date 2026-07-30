/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1 / COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1
 *
 * Existing commercial terms for LEGACY_PLAN_BRIDGE plan codes.
 * Not invented by bootstrap — required CC-16 pricing facts for durable publication.
 * Canonical Catalog currency is USD; SAR amounts are regional overrides.
 */

export type LegacyPlanCommercialPriceTerms = {
  monthlyUsd: string;
  yearlyUsd: string;
  monthlySar?: string;
  yearlySar?: string;
};

/** Normative price terms keyed by catalogPlanCode (basic | professional | enterprise). */
export const LEGACY_PLAN_COMMERCIAL_PRICE_TERMS: Readonly<
  Record<string, LegacyPlanCommercialPriceTerms>
> = {
  basic: { monthlyUsd: "0.00", yearlyUsd: "0.00" },
  professional: {
    monthlyUsd: "26.40",
    yearlyUsd: "264.00",
    monthlySar: "99.00",
    yearlySar: "990.00",
  },
  enterprise: {
    monthlyUsd: "79.73",
    yearlyUsd: "797.33",
    monthlySar: "299.00",
    yearlySar: "2990.00",
  },
};

export function priceTermsForCatalogPlanCode(
  catalogPlanCode: string
): LegacyPlanCommercialPriceTerms {
  return (
    LEGACY_PLAN_COMMERCIAL_PRICE_TERMS[catalogPlanCode] ?? {
      monthlyUsd: "0.00",
      yearlyUsd: "0.00",
    }
  );
}
