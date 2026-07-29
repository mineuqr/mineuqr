/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * Ensure Catalog SSOT is populated from normative bridge + publishable defaults.
 * Idempotent: skips when published versions already exist for bridged plans.
 */

import {
  PlanService,
  PlanVersionService,
  PricingService,
  FeatureBundleService,
  LimitProfileService,
  MigrationPolicyService,
  RegionalPolicyService,
  TrialPolicyCatalogService,
  PublicationService,
  commercialCatalogStore,
} from "./index";
import { LEGACY_PLAN_BRIDGE } from "./legacyPlanBridge";
import { hydrateCommercialCatalogFromDb } from "./drizzleCatalogPersistence";
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

const DEFAULT_FEATURES: Record<string, string[]> = {
  basic: [
    "qrMenu",
    "categories",
    "menuImages",
    "search",
    "ordering",
    "cart",
    "checkout",
  ],
  professional: [
    "qrMenu",
    "categories",
    "menuImages",
    "search",
    "ordering",
    "cart",
    "checkout",
    "requestBill",
    "callWaiter",
    "orderTracking",
    "reports",
    "templates",
    "customColors",
  ],
  enterprise: [
    "qrMenu",
    "categories",
    "menuImages",
    "search",
    "ordering",
    "cart",
    "checkout",
    "requestBill",
    "callWaiter",
    "orderTracking",
    "reports",
    "excelExport",
    "hotelMode",
    "roomQr",
    "dynamicServiceCatalog",
    "templates",
    "customColors",
    "customFonts",
  ],
};

const DEFAULT_LIMITS: Record<string, { key: string; value: number }[]> = {
  basic: [
    { key: "restaurants", value: 1 },
    { key: "items", value: 100 },
    { key: "categories", value: 10 },
  ],
  professional: [
    { key: "restaurants", value: 5 },
    { key: "items", value: 500 },
    { key: "categories", value: 50 },
  ],
  enterprise: [
    { key: "restaurants", value: 50 },
    { key: "items", value: 5000 },
    { key: "categories", value: 200 },
  ],
};

/** Canonical Catalog prices are USD; SAR amounts are regional overrides only. */
const DEFAULT_PRICES: Record<
  string,
  {
    monthlyUsd: string;
    yearlyUsd: string;
    monthlySar?: string;
    yearlySar?: string;
  }
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

async function persistFullStore(): Promise<void> {
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

/**
 * Hydrate from DB; if no published offerings for bridge codes, seed + publish + persist.
 */
export async function ensureCommercialCatalogAdoptionSeed(): Promise<{
  source: "db" | "seeded" | "memory";
  publishedVersions: number;
}> {
  const hydrated = await hydrateCommercialCatalogFromDb();
  const published = [...commercialCatalogStore.versions.values()].filter(
    (v) => v.state === "published"
  );
  if (published.length > 0) {
    return {
      source: hydrated.hydrated ? "db" : "memory",
      publishedVersions: published.length,
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
  const publication = new PublicationService();

  const monthly = pricing.createBillingCycle({
    code: "monthly",
    name: "Monthly",
    intervalCount: 1,
    intervalUnit: "month",
  });
  const yearly = pricing.createBillingCycle({
    code: "yearly",
    name: "Yearly",
    intervalCount: 1,
    intervalUnit: "year",
  });
  const trial = trials.create({
    code: "default-trial-14",
    name: "Default 14-day trial",
    durationDays: 14,
  });
  const mig = migration.create({
    code: "explicit-admin",
    name: "Explicit admin migration",
  });
  const ret = migration.createRetirementPolicy({
    code: "no-renew-retired",
    name: "No renewals when retired",
    allowRenewals: false,
  });
  const saRegion = regions.create({
    code: "sa",
    name: "Saudi Arabia",
    countryCode: "SA",
    currency: "SAR",
    taxPolicyRef: "sa-vat",
  });

  let sort = 1;
  for (const bridge of LEGACY_PLAN_BRIDGE) {
    const plan = plans.create({
      code: bridge.catalogPlanCode,
      name: bridge.catalogPlanName,
      sortOrder: sort++,
      isHidden: false,
    });
    const featureKeys = DEFAULT_FEATURES[bridge.catalogPlanCode] ?? ["menu"];
    const bundle = bundles.create({
      code: `${bridge.catalogPlanCode}-features`,
      name: `${bridge.catalogPlanName} Features`,
      features: featureKeys.map((featureKey) => ({ featureKey })),
    });
    const limitRows = DEFAULT_LIMITS[bridge.catalogPlanCode] ?? [];
    const profile = limits.create({
      code: `${bridge.catalogPlanCode}-limits`,
      name: `${bridge.catalogPlanName} Limits`,
      values: limitRows.map((l) => ({
        limitKey: l.key,
        value: l.value,
        unit: "count",
      })),
    });
    const version = versions.create({
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
    const amounts = DEFAULT_PRICES[bridge.catalogPlanCode] ?? {
      monthlyUsd: "0.00",
      yearlyUsd: "0.00",
    };
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
    publication.publish(version.id);
  }

  await persistFullStore();
  return {
    source: "seeded",
    publishedVersions: [...commercialCatalogStore.versions.values()].filter(
      (v) => v.state === "published"
    ).length,
  };
}
