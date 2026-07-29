/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — domain types.
 */

export * from "./lifecycle";
export * from "./snapshot";

export type CommercialId = string;

export type BillingCycleIntervalUnit = "day" | "week" | "month" | "year";

export type CommercialPlanIdentity = {
  id: CommercialId;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VersionCompatibility = {
  upgradeTargets: string[];
  downgradeTargets: string[];
  migrationRequirements: string[];
  breakingCommercialChanges: string[];
};

export type CommercialPlanVersion = {
  id: CommercialId;
  planId: CommercialId;
  versionCode: string;
  versionName: string;
  state: import("./lifecycle").PlanVersionLifecycleState;
  featureBundleId: string | null;
  limitProfileId: string | null;
  trialPolicyId: string | null;
  migrationPolicyId: string | null;
  retirementPolicyId: string | null;
  compatibility: VersionCompatibility;
  publishedAt: string | null;
  deprecatedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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
  planVersionId: CommercialId;
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
  eligiblePlanVersionIds: string[];
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

export type CommercialRetirementPolicy = {
  id: CommercialId;
  code: string;
  name: string;
  description: string | null;
  allowRenewals: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicationValidationIssue = {
  code: string;
  message: string;
  field?: string;
};

export type PublicationValidationResult = {
  ok: boolean;
  issues: PublicationValidationIssue[];
};

export type CommercialCatalogHealth = {
  program: "COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1";
  status: "healthy" | "warning" | "degraded";
  plans: number;
  versions: {
    draft: number;
    published: number;
    deprecated: number;
    retired: number;
    total: number;
  };
  prices: number;
  regions: number;
  promotions: number;
  publicationErrors: number;
  validationErrors: number;
  lastPublicationError: string | null;
  lastValidationError: string | null;
};
