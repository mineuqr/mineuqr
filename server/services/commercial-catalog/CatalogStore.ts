/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * In-process Live Commercial Plans store (runtime cache).
 * Durable authority is DB; memory is never publication state.
 */

import { randomUUID } from "node:crypto";
import type {
  CommercialBillingCycle,
  CommercialBundleFeature,
  CommercialFeatureBundle,
  CommercialLimitProfile,
  CommercialLimitValue,
  CommercialLivePlan,
  CommercialMigrationPolicy,
  CommercialPrice,
  CommercialPromotion,
  CommercialRegion,
  CommercialTrialPolicy,
} from "@shared/commercial-catalog";

export function newCommercialId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export class CommercialCatalogStore {
  plans = new Map<string, CommercialLivePlan>();
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

  validationErrorCount = 0;
  lastValidationError: string | null = null;

  recordValidationError(message: string) {
    this.validationErrorCount += 1;
    this.lastValidationError = message;
  }

  clear() {
    this.plans.clear();
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
    this.validationErrorCount = 0;
    this.lastValidationError = null;
  }
}

/** Process-wide live catalog store (singleton). */
export const commercialCatalogStore = new CommercialCatalogStore();
