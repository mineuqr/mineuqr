/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — domain types.
 * A Plan is a live business entity. Editing updates the live definition.
 */

export * from "./lifecycle";
export * from "./chargedTerms";

export type CommercialId = string;

export type BillingCycleIntervalUnit = "day" | "week" | "month" | "year";

/**
 * Live Commercial Plan — identity + current composition.
 * There is no version layer. Feature/limit/trial refs are live.
 */
export type CommercialLivePlan = {
  id: CommercialId;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isHidden: boolean;
  featureBundleId: string | null;
  limitProfileId: string | null;
  trialPolicyId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Plan Identity is the live plan (CC-01 preserved; versioning removed). */
export type CommercialPlanIdentity = CommercialLivePlan;

export type CommercialBillingCycle = {
  id: CommercialId;
  code: string;
  name: string;
  intervalCount: number;
  intervalUnit: BillingCycleIntervalUnit;
  createdAt: string;
  updatedAt: string;
};

export type CommercialPrice = {
  id: CommercialId;
  planId: CommercialId;
  billingCycleId: CommercialId;
  currency: string;
  amount: string;
  regionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialFeatureBundle = {
  id: CommercialId;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialBundleFeature = {
  id: CommercialId;
  bundleId: CommercialId;
  featureKey: string;
  included: boolean;
};

export type CommercialLimitProfile = {
  id: CommercialId;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialLimitValue = {
  id: CommercialId;
  profileId: CommercialId;
  limitKey: string;
  value: number | null;
  unit: string | null;
};

export type CommercialTrialPolicy = {
  id: CommercialId;
  code: string;
  name: string;
  durationDays: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialPromotion = {
  id: CommercialId;
  code: string;
  name: string;
  effectSummary: string;
  eligiblePlanIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialRegion = {
  id: CommercialId;
  code: string;
  name: string;
  countryCode: string;
  currency: string;
  taxPolicyRef: string | null;
  distributionPartner: string | null;
  regulatoryNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialMigrationPolicy = {
  id: CommercialId;
  code: string;
  name: string;
  description: string | null;
  requiresExplicitAction: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanSaveValidationIssue = {
  code: string;
  message: string;
  field?: string;
};

export type PlanSaveValidationResult = {
  ok: boolean;
  issues: PlanSaveValidationIssue[];
};

export type CommercialCatalogHealth = {
  program: "COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1";
  status: "healthy" | "warning" | "degraded";
  plans: number;
  hiddenPlans: number;
  prices: number;
  regions: number;
  promotions: number;
  validationErrors: number;
  lastValidationError: string | null;
};
