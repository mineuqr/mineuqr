/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * In-process Commercial Catalog store (foundation runtime).
 * Schema contract is drizzle `commercial_*` tables; DB migrate is separate from deploy.
 */

import { randomUUID } from "node:crypto";
import type {
  CommercialBillingCycle,
  CommercialBundleFeature,
  CommercialFeatureBundle,
  CommercialLimitProfile,
  CommercialLimitValue,
  CommercialMigrationPolicy,
  CommercialPlanIdentity,
  CommercialPlanVersion,
  CommercialPrice,
  CommercialPromotion,
  CommercialRegion,
  CommercialRetirementPolicy,
  CommercialSnapshotDefinition,
  CommercialTrialPolicy,
} from "@shared/commercial-catalog";

export function newCommercialId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export type StoredSnapshot = {
  id: string;
  planVersionId: string;
  schemaVersion: number;
  payload: CommercialSnapshotDefinition;
  effectiveDate: string;
  createdAt: string;
};

export class CommercialCatalogStore {
  plans = new Map<string, CommercialPlanIdentity>();
  versions = new Map<string, CommercialPlanVersion>();
  prices = new Map<string, CommercialPrice>();
  billingCycles = new Map<string, CommercialBillingCycle>();
  featureBundles = new Map<string, CommercialFeatureBundle>();
  bundleFeatures = new Map<string, CommercialBundleFeature>();
  limitProfiles = new Map<string, CommercialLimitProfile>();
  limitValues = new Map<string, CommercialLimitValue>();
  trialPolicies = new Map<string, CommercialTrialPolicy>();
  promotions = new Map<string, CommercialPromotion>();
  regions = new Map<string, CommercialRegion>();
  migrationPolicies = new Map<string, CommercialMigrationPolicy>();
  retirementPolicies = new Map<string, CommercialRetirementPolicy>();
  snapshots = new Map<string, StoredSnapshot>();

  publicationErrorCount = 0;
  validationErrorCount = 0;
  lastPublicationError: string | null = null;
  lastValidationError: string | null = null;

  recordPublicationError(message: string) {
    this.publicationErrorCount += 1;
    this.lastPublicationError = message;
  }

  recordValidationError(message: string) {
    this.validationErrorCount += 1;
    this.lastValidationError = message;
  }

  clear() {
    this.plans.clear();
    this.versions.clear();
    this.prices.clear();
    this.billingCycles.clear();
    this.featureBundles.clear();
    this.bundleFeatures.clear();
    this.limitProfiles.clear();
    this.limitValues.clear();
    this.trialPolicies.clear();
    this.promotions.clear();
    this.regions.clear();
    this.migrationPolicies.clear();
    this.retirementPolicies.clear();
    this.snapshots.clear();
    this.publicationErrorCount = 0;
    this.validationErrorCount = 0;
    this.lastPublicationError = null;
    this.lastValidationError = null;
  }
}

/** Process-wide foundation store (singleton). */
export const commercialCatalogStore = new CommercialCatalogStore();
