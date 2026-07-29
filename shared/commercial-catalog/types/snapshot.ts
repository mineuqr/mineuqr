/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Commercial Snapshot contract definition (CC-13).
 * Catalog owns the schema; Subscription persists instances.
 */

export type CommercialSnapshotPricing = {
  amount: string;
  currency: string;
  billingCycleId: string;
  billingCycleCode: string;
};

export type CommercialSnapshotFeature = {
  featureKey: string;
  included: boolean;
};

export type CommercialSnapshotLimit = {
  limitKey: string;
  value: number | null;
  unit?: string | null;
};

export type CommercialSnapshotTrial = {
  trialPolicyId: string;
  durationDays: number;
  name: string;
} | null;

export type CommercialSnapshotPromotion = {
  promotionId: string;
  code: string;
  effectSummary: string;
} | null;

/**
 * Minimum immutable Commercial Snapshot contents (CC-13).
 * Captured at commercial contract activation — independent of live Catalog.
 */
export type CommercialSnapshotDefinition = {
  snapshotSchemaVersion: 1;
  planIdentityId: string;
  planVersionId: string;
  /** Catalog plan code captured at bind time (e.g. professional) — no live Catalog read at resolve. */
  catalogPlanCode?: string;
  commercialName: string;
  versionName: string;
  currency: string;
  billingCycle: {
    id: string;
    code: string;
    intervalCount: number;
    intervalUnit: "day" | "week" | "month" | "year";
  };
  pricing: CommercialSnapshotPricing;
  includedFeatures: CommercialSnapshotFeature[];
  usageLimits: CommercialSnapshotLimit[];
  trialPolicy: CommercialSnapshotTrial;
  promotionApplied: CommercialSnapshotPromotion;
  effectiveDate: string;
  /** CC-15 optional regional context */
  region?: {
    regionId: string;
    countryCode: string;
    currency: string;
    taxPolicyRef?: string | null;
    distributionPartner?: string | null;
  } | null;
};

export type CommercialSnapshotBuildInput = {
  planIdentityId: string;
  planVersionId: string;
  catalogPlanCode?: string;
  commercialName: string;
  versionName: string;
  currency: string;
  billingCycle: CommercialSnapshotDefinition["billingCycle"];
  pricing: CommercialSnapshotPricing;
  includedFeatures: CommercialSnapshotFeature[];
  usageLimits: CommercialSnapshotLimit[];
  trialPolicy?: CommercialSnapshotTrial;
  promotionApplied?: CommercialSnapshotPromotion;
  effectiveDate: string;
  region?: CommercialSnapshotDefinition["region"];
};
