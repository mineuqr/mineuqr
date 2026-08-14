/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Public catalog visibility — live plans that are not hidden.
 */

export const COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM =
  "COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1" as const;

export type PublicCatalogVisibility = {
  publiclyBrowsable: boolean;
  openForNewAdoption: boolean;
};

export function visibilityForLivePlan(input: {
  isHidden: boolean;
}): PublicCatalogVisibility {
  const publiclyBrowsable = !input.isHidden;
  return {
    publiclyBrowsable,
    openForNewAdoption: publiclyBrowsable,
  };
}

export function assertNotEntitlementSurface(): void {
  // Documentary marker — public catalog must never call subscription-runtime.
}

export const PUBLIC_OFFERING_SCHEMA_VERSION = 1 as const;

export type PublicCatalogOffering = {
  schemaVersion: typeof PUBLIC_OFFERING_SCHEMA_VERSION;
  planId: string;
  planCode: string;
  planName: string;
  visibility: PublicCatalogVisibility;
  currency: string;
  priceMonthly: string | null;
  priceYearly: string | null;
  featureKeys: string[];
  limits: Array<{ limitKey: string; value: number | null; unit: string | null }>;
  trialDurationDays: number | null;
  legacyPlanId: number | null;
  updatedAt: string;
};
