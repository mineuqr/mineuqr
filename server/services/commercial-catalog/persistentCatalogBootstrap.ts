/**
 * COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1
 *
 * One-time architecture adoption: empty durable catalog ← canonical Projection
 * (+ existing LEGACY_PLAN_BRIDGE identities / commercial terms).
 *
 * NOT a fake seed. Does NOT invent commercial capability logic.
 * Capability keys come from Commercial Projection via planFeatureMatrix +
 * Presentation overlay rules. Publication uses CatalogPublishingService.
 */

import { COMMERCIAL_PROJECTION_IDS } from "@shared/commercial-projection";
import { applyCommercialPresentationRules } from "@shared/commercial-catalog-presentation";
import {
  listProjectionIdsForCommercialPlan,
  getLimitsForPlan,
} from "@commercial/planFeatureMatrix";
import {
  PlanService,
  PlanVersionService,
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
import {
  getDurablePublicationBackend,
  persistPublishedVersionPublication,
} from "./publicationPersistence";
import {
  catalogPublishingService,
  invalidatePublicCatalogCache,
} from "../../commercial-catalog/publishing";
import { getDb } from "../../db";
import {
  commercialPlans,
  commercialPlanVersions,
  commercialPrices,
  commercialBillingCycles,
  commercialFeatureBundles,
  commercialBundleFeatures,
  commercialLimitProfiles,
  commercialLimitValues,
  commercialTrialPolicies,
  commercialMigrationPolicies,
  commercialRetirementPolicies,
  commercialRegions,
} from "../../db/schema/commercial";

export const COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM =
  "COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1" as const;

export type PersistentCatalogBootstrapResult = {
  program: typeof COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM;
  bootstrapped: boolean;
  reason:
    | "already_published"
    | "bootstrapped"
    | "noop_empty_after_hydrate";
  source: "db" | "memory" | "bootstrap";
  publishedVersions: number;
  planCount: number;
  billingCycleCount: number;
  priceCount: number;
  capabilityMappingCount: number;
};

/**
 * Projection IDs for a bridge plan, then Presentation foundation/dependency rules.
 */
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

async function persistFullCatalogStore(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const s = commercialCatalogStore;

  for (const p of s.plans.values()) {
    await db
      .insert(commercialPlans)
      .values({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        isHidden: p.isHidden,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: p.name, updatedAt: p.updatedAt },
      });
  }
  for (const c of s.billingCycles.values()) {
    await db
      .insert(commercialBillingCycles)
      .values({
        id: c.id,
        code: c.code,
        name: c.name,
        intervalCount: c.intervalCount,
        intervalUnit: c.intervalUnit,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: c.name, updatedAt: c.updatedAt },
      });
  }
  for (const b of s.featureBundles.values()) {
    await db
      .insert(commercialFeatureBundles)
      .values({
        id: b.id,
        code: b.code,
        name: b.name,
        description: b.description,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: b.name, updatedAt: b.updatedAt },
      });
  }
  for (const f of s.bundleFeatures.values()) {
    await db
      .insert(commercialBundleFeatures)
      .values({
        id: f.id,
        bundleId: f.bundleId,
        featureKey: f.featureKey,
        included: f.included,
      })
      .onDuplicateKeyUpdate({ set: { included: f.included } });
  }
  for (const p of s.limitProfiles.values()) {
    await db
      .insert(commercialLimitProfiles)
      .values({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: p.name, updatedAt: p.updatedAt },
      });
  }
  for (const v of s.limitValues.values()) {
    await db
      .insert(commercialLimitValues)
      .values({
        id: v.id,
        profileId: v.profileId,
        limitKey: v.limitKey,
        value: v.value,
        unit: v.unit,
      })
      .onDuplicateKeyUpdate({ set: { value: v.value, unit: v.unit } });
  }
  for (const t of s.trialPolicies.values()) {
    await db
      .insert(commercialTrialPolicies)
      .values({
        id: t.id,
        code: t.code,
        name: t.name,
        durationDays: t.durationDays,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { durationDays: t.durationDays, updatedAt: t.updatedAt },
      });
  }
  for (const m of s.migrationPolicies.values()) {
    await db
      .insert(commercialMigrationPolicies)
      .values({
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        requiresExplicitAction: m.requiresExplicitAction,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: m.name, updatedAt: m.updatedAt },
      });
  }
  for (const r of s.retirementPolicies.values()) {
    await db
      .insert(commercialRetirementPolicies)
      .values({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        allowRenewals: r.allowRenewals,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: r.name, updatedAt: r.updatedAt },
      });
  }
  for (const r of s.regions.values()) {
    await db
      .insert(commercialRegions)
      .values({
        id: r.id,
        code: r.code,
        name: r.name,
        countryCode: r.countryCode,
        currency: r.currency,
        taxPolicyRef: r.taxPolicyRef,
        distributionPartner: r.distributionPartner,
        regulatoryNotes: r.regulatoryNotes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { name: r.name, currency: r.currency, updatedAt: r.updatedAt },
      });
  }
  for (const v of s.versions.values()) {
    await db
      .insert(commercialPlanVersions)
      .values({
        id: v.id,
        planId: v.planId,
        versionCode: v.versionCode,
        versionName: v.versionName,
        state: v.state,
        featureBundleId: v.featureBundleId,
        limitProfileId: v.limitProfileId,
        trialPolicyId: v.trialPolicyId,
        migrationPolicyId: v.migrationPolicyId,
        retirementPolicyId: v.retirementPolicyId,
        compatibility: v.compatibility,
        publishedAt: v.publishedAt,
        deprecatedAt: v.deprecatedAt,
        retiredAt: v.retiredAt,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          state: v.state,
          featureBundleId: v.featureBundleId,
          limitProfileId: v.limitProfileId,
          trialPolicyId: v.trialPolicyId,
          migrationPolicyId: v.migrationPolicyId,
          retirementPolicyId: v.retirementPolicyId,
          compatibility: v.compatibility,
          publishedAt: v.publishedAt,
          updatedAt: v.updatedAt,
        },
      });
  }
  for (const p of s.prices.values()) {
    await db
      .insert(commercialPrices)
      .values({
        id: p.id,
        planVersionId: p.planVersionId,
        billingCycleId: p.billingCycleId,
        currency: p.currency,
        amount: p.amount,
        regionId: p.regionId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: { amount: p.amount, currency: p.currency, updatedAt: p.updatedAt },
      });
  }
}

function snapshotCounts() {
  const publishedVersions = [...commercialCatalogStore.versions.values()].filter(
    (v) => v.state === "published"
  ).length;
  return {
    publishedVersions,
    planCount: commercialCatalogStore.plans.size,
    billingCycleCount: commercialCatalogStore.billingCycles.size,
    priceCount: commercialCatalogStore.prices.size,
    capabilityMappingCount: [...commercialCatalogStore.bundleFeatures.values()]
      .filter((f) => f.included).length,
  };
}

/**
 * Idempotent bootstrap of durable Commercial Catalog when empty.
 */
export async function bootstrapPersistentCommercialCatalog(): Promise<PersistentCatalogBootstrapResult> {
  const backend = getDurablePublicationBackend();
  await backend.hydrateInto(commercialCatalogStore);

  const existingPublished = [...commercialCatalogStore.versions.values()].filter(
    (v) => v.state === "published"
  );
  if (existingPublished.length > 0) {
    const counts = snapshotCounts();
    return {
      program: COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM,
      bootstrapped: false,
      reason: "already_published",
      source: backend.kind === "db" ? "db" : "memory",
      ...counts,
    };
  }

  const plans = new PlanService();
  const versions = new PlanVersionService();
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
  const mig =
    migration.list().find((m) => m.code === "explicit-admin") ??
    migration.create({
      code: "explicit-admin",
      name: "Explicit admin migration",
    });
  const ret =
    migration.listRetirementPolicies().find((r) => r.code === "no-renew-retired") ??
    migration.createRetirementPolicy({
      code: "no-renew-retired",
      name: "No renewals when retired",
      allowRenewals: false,
    });
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
    if (existingPlan) {
      const existingVersion = versions
        .list(existingPlan.id)
        .find((v) => v.versionCode === bridge.versionCode);
      if (existingVersion?.state === "published") {
        continue;
      }
    }

    const plan =
      existingPlan ??
      plans.create({
        code: bridge.catalogPlanCode,
        name: bridge.catalogPlanName,
        sortOrder: sort,
        isHidden: false,
      });
    sort += 1;

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

    const existingVersion = versions
      .list(plan.id)
      .find((v) => v.versionCode === bridge.versionCode);
    const version =
      existingVersion ??
      versions.create({
        planId: plan.id,
        versionCode: bridge.versionCode,
        versionName: `${bridge.catalogPlanName} ${bridge.versionCode}`,
        featureBundleId: bundle.id,
        limitProfileId: profile.id,
        trialPolicyId:
          bridge.catalogPlanCode === "professional" ? trial.id : null,
        migrationPolicyId: mig.id,
        retirementPolicyId: ret.id,
        compatibility: {
          upgradeTargets: [],
          downgradeTargets: [],
          migrationRequirements: ["admin_approval"],
          breakingCommercialChanges: [],
        },
      });

    if (version.state !== "published") {
      const amounts = priceTermsForCatalogPlanCode(bridge.catalogPlanCode);
      const existingPrices = pricing.list(version.id);
      if (existingPrices.length === 0) {
        pricing.create({
          planVersionId: version.id,
          billingCycleId: monthly.id,
          currency: "USD",
          amount: amounts.monthlyUsd,
          regionId: null,
        });
        pricing.create({
          planVersionId: version.id,
          billingCycleId: yearly.id,
          currency: "USD",
          amount: amounts.yearlyUsd,
          regionId: null,
        });
        if (amounts.monthlySar) {
          pricing.create({
            planVersionId: version.id,
            billingCycleId: monthly.id,
            currency: "SAR",
            amount: amounts.monthlySar,
            regionId: saRegion.id,
          });
        }
        if (amounts.yearlySar) {
          pricing.create({
            planVersionId: version.id,
            billingCycleId: yearly.id,
            currency: "SAR",
            amount: amounts.yearlySar,
            regionId: saRegion.id,
          });
        }
      }

      await catalogPublishingService.publish(version.id, {
        procedure: "persistentCatalogBootstrap.publish",
      });
    } else {
      await persistPublishedVersionPublication(version.id);
    }
  }

  await persistFullCatalogStore();

  invalidateCatalogReadyGate();
  invalidatePublicCatalogCache();
  await backend.hydrateInto(commercialCatalogStore);

  const counts = snapshotCounts();
  return {
    program: COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM,
    bootstrapped: counts.publishedVersions > 0,
    reason:
      counts.publishedVersions > 0 ? "bootstrapped" : "noop_empty_after_hydrate",
    source: "bootstrap",
    ...counts,
  };
}
