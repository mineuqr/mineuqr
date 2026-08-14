/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * One-time architecture adoption: uninitialized durable catalog ← Projection.
 * Bootstrap seeds LIVE plans. It never publishes versions.
 */

import { COMMERCIAL_PROJECTION_IDS } from "@shared/commercial-projection";
import { applyCommercialPresentationRules } from "@shared/commercial-catalog-presentation";
import {
  listProjectionIdsForCommercialPlan,
  getLimitsForPlan,
} from "@commercial/planFeatureMatrix";
import {
  PlanService,
  PricingService,
  FeatureBundleService,
  LimitProfileService,
  MigrationPolicyService,
  RegionalPolicyService,
  TrialPolicyCatalogService,
  commercialCatalogStore,
  invalidateCatalogReadyGate,
} from "./index";
import { LEGACY_PLAN_BRIDGE } from "./legacyPlanBridge";
import { priceTermsForCatalogPlanCode } from "./legacyPlanCommercialTerms";
import { getDurableLivePlanBackend } from "./livePlanPersistence";
import { invalidatePublicCatalogCache } from "../../commercial-catalog/publishing";

export const COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM =
  "COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1" as const;

export const COMMERCIAL_BOOTSTRAP_LIFECYCLE_GOVERNANCE_PROGRAM =
  "COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1" as const;

export const BOOTSTRAP_01_INFRASTRUCTURE_INITIALIZATION_BOUNDARY =
  "BOOTSTRAP-01" as const;

export type PersistentCatalogBootstrapResult = {
  program: typeof COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM;
  governanceProgram: typeof COMMERCIAL_BOOTSTRAP_LIFECYCLE_GOVERNANCE_PROGRAM;
  bootstrapped: boolean;
  reason: "already_initialized" | "bootstrapped" | "noop_empty_after_hydrate";
  source: "db" | "memory" | "bootstrap";
  livePlans: number;
  planCount: number;
  billingCycleCount: number;
  priceCount: number;
  capabilityMappingCount: number;
};

export function isPersistentCatalogUninitialized(
  store: typeof commercialCatalogStore = commercialCatalogStore
): boolean {
  return (
    store.plans.size === 0 &&
    store.prices.size === 0 &&
    store.billingCycles.size === 0 &&
    store.featureBundles.size === 0 &&
    store.bundleFeatures.size === 0 &&
    store.limitProfiles.size === 0 &&
    store.limitValues.size === 0
  );
}

export function projectionFeatureKeysForBridgePlan(
  catalogPlanKey: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
): string[] {
  const enabled = new Set(listProjectionIdsForCommercialPlan(catalogPlanKey));
  const map: Record<string, boolean> = {};
  for (const id of COMMERCIAL_PROJECTION_IDS) {
    map[id] = enabled.has(id);
  }
  const next = applyCommercialPresentationRules(map);
  return COMMERCIAL_PROJECTION_IDS.filter((id) => Boolean(next[id]));
}

function snapshotCounts() {
  return {
    livePlans: commercialCatalogStore.plans.size,
    planCount: commercialCatalogStore.plans.size,
    billingCycleCount: commercialCatalogStore.billingCycles.size,
    priceCount: commercialCatalogStore.prices.size,
    capabilityMappingCount: [...commercialCatalogStore.bundleFeatures.values()].filter(
      (f) => f.included
    ).length,
  };
}

function bootstrapResult(
  partial: Omit<
    PersistentCatalogBootstrapResult,
    "program" | "governanceProgram"
  >
): PersistentCatalogBootstrapResult {
  return {
    program: COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM,
    governanceProgram: COMMERCIAL_BOOTSTRAP_LIFECYCLE_GOVERNANCE_PROGRAM,
    ...partial,
  };
}

/**
 * Idempotent bootstrap — ONLY when persistent catalog is uninitialized.
 * Seeds three live standard plans. Never publishes versions.
 */
export async function bootstrapPersistentCommercialCatalog(): Promise<PersistentCatalogBootstrapResult> {
  const backend = getDurableLivePlanBackend();
  await backend.hydrateInto(commercialCatalogStore);

  if (!isPersistentCatalogUninitialized(commercialCatalogStore)) {
    const counts = snapshotCounts();
    return bootstrapResult({
      bootstrapped: false,
      reason: "already_initialized",
      source: backend.kind === "db" ? "db" : "memory",
      ...counts,
    });
  }

  const plans = new PlanService();
  const pricing = new PricingService();
  const bundles = new FeatureBundleService();
  const limits = new LimitProfileService();
  const migration = new MigrationPolicyService();
  const regions = new RegionalPolicyService();
  const trials = new TrialPolicyCatalogService();

  const monthly =
    pricing.listBillingCycles().find((c) => c.code === "monthly") ??
    pricing.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
  const yearly =
    pricing.listBillingCycles().find((c) => c.code === "yearly") ??
    pricing.createBillingCycle({
      code: "yearly",
      name: "Yearly",
      intervalCount: 1,
      intervalUnit: "year",
    });

  const trial =
    trials.list().find((t) => t.code === "default-trial-14") ??
    trials.create({
      code: "default-trial-14",
      name: "Default 14-day trial",
      durationDays: 14,
    });
  if (!migration.list().find((m) => m.code === "explicit-admin")) {
    migration.create({
      code: "explicit-admin",
      name: "Explicit admin migration",
    });
  }
  const saRegion =
    regions.list().find((r) => r.code === "sa") ??
    regions.create({
      code: "sa",
      name: "Saudi Arabia",
      countryCode: "SA",
      currency: "SAR",
      taxPolicyRef: "sa-vat",
    });

  let sort = 1;
  for (const bridge of LEGACY_PLAN_BRIDGE) {
    const existingPlan = plans.list().find((p) => p.code === bridge.catalogPlanCode);
    const featureKeys = projectionFeatureKeysForBridgePlan(bridge.catalogPlanKey);
    const bundleCode = `${bridge.catalogPlanCode}-features`;
    const existingBundle = bundles.list().find((b) => b.code === bundleCode);
    const bundle =
      existingBundle ??
      bundles.create({
        code: bundleCode,
        name: `${bridge.catalogPlanName} Features`,
        features: featureKeys.map((featureKey) => ({ featureKey })),
      });

    const planLimits = getLimitsForPlan(bridge.catalogPlanKey);
    const limitRows: { key: string; value: number | null }[] = [
      { key: "restaurants", value: planLimits.restaurants },
      { key: "items", value: planLimits.items },
      { key: "categories", value: planLimits.categories },
    ];
    const limitCode = `${bridge.catalogPlanCode}-limits`;
    const existingProfile = limits.list().find((p) => p.code === limitCode);
    const profile =
      existingProfile ??
      limits.create({
        code: limitCode,
        name: `${bridge.catalogPlanName} Limits`,
        values: limitRows.map((l) => ({
          limitKey: l.key,
          value: l.value,
          unit: "count",
        })),
      });

    const plan =
      existingPlan ??
      plans.create({
        code: bridge.catalogPlanCode,
        name: bridge.catalogPlanName,
        sortOrder: sort,
        isHidden: false,
        featureBundleId: bundle.id,
        limitProfileId: profile.id,
        trialPolicyId:
          bridge.catalogPlanCode === "professional" ? trial.id : null,
      });
    if (existingPlan) {
      plans.update(existingPlan.id, {
        featureBundleId: bundle.id,
        limitProfileId: profile.id,
        trialPolicyId:
          bridge.catalogPlanCode === "professional" ? trial.id : existingPlan.trialPolicyId,
      });
    }
    sort += 1;

    const amounts = priceTermsForCatalogPlanCode(bridge.catalogPlanCode);
    const existingPrices = pricing.list(plan.id);
    if (existingPrices.length === 0) {
      pricing.create({
        planId: plan.id,
        billingCycleId: monthly.id,
        currency: "USD",
        amount: amounts.monthlyUsd,
        regionId: null,
      });
      pricing.create({
        planId: plan.id,
        billingCycleId: yearly.id,
        currency: "USD",
        amount: amounts.yearlyUsd,
        regionId: null,
      });
      if (amounts.monthlySar) {
        pricing.create({
          planId: plan.id,
          billingCycleId: monthly.id,
          currency: "SAR",
          amount: amounts.monthlySar,
          regionId: saRegion.id,
        });
      }
      if (amounts.yearlySar) {
        pricing.create({
          planId: plan.id,
          billingCycleId: yearly.id,
          currency: "SAR",
          amount: amounts.yearlySar,
          regionId: saRegion.id,
        });
      }
    }
  }

  await backend.persistFullCatalog(commercialCatalogStore);

  invalidateCatalogReadyGate();
  invalidatePublicCatalogCache();
  await backend.hydrateInto(commercialCatalogStore);

  const counts = snapshotCounts();
  return bootstrapResult({
    bootstrapped: counts.livePlans > 0,
    reason: counts.livePlans > 0 ? "bootstrapped" : "noop_empty_after_hydrate",
    source: "bootstrap",
    ...counts,
  });
}
