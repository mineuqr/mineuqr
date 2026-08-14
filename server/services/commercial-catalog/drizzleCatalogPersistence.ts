/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Persist / hydrate Live Commercial Plans from production commercial_* tables.
 */

import { getDb } from "../../db";
import {
  commercialPlans,
  commercialPrices,
  commercialBillingCycles,
  commercialFeatureBundles,
  commercialBundleFeatures,
  commercialLimitProfiles,
  commercialLimitValues,
  commercialTrialPolicies,
  commercialPromotions,
  commercialRegions,
  commercialMigrationPolicies,
} from "../../db/schema/commercial";
import {
  commercialCatalogStore,
  type CommercialCatalogStore,
} from "./CatalogStore";
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

/** Load all live catalog aggregates from DB into the in-process store. */
export async function hydrateCommercialCatalogFromDb(
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<{ hydrated: boolean; plans: number }> {
  const db = await getDb();
  if (!db) return { hydrated: false, plans: 0 };

  const [
    plans,
    prices,
    cycles,
    bundles,
    bundleFeatures,
    profiles,
    limitValues,
    trials,
    promos,
    regions,
    migrations,
  ] = await Promise.all([
    db.select().from(commercialPlans),
    db.select().from(commercialPrices),
    db.select().from(commercialBillingCycles),
    db.select().from(commercialFeatureBundles),
    db.select().from(commercialBundleFeatures),
    db.select().from(commercialLimitProfiles),
    db.select().from(commercialLimitValues),
    db.select().from(commercialTrialPolicies),
    db.select().from(commercialPromotions),
    db.select().from(commercialRegions),
    db.select().from(commercialMigrationPolicies),
  ]);

  store.clear();

  for (const p of plans) {
    const row: CommercialLivePlan = {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      sortOrder: p.sortOrder,
      isHidden: p.isHidden,
      featureBundleId: p.featureBundleId ?? null,
      limitProfileId: p.limitProfileId ?? null,
      trialPolicyId: p.trialPolicyId ?? null,
      createdAt: String(p.createdAt),
      updatedAt: String(p.updatedAt),
    };
    store.plans.set(row.id, row);
  }

  for (const c of cycles) {
    const row: CommercialBillingCycle = {
      id: c.id,
      code: c.code,
      name: c.name,
      intervalCount: c.intervalCount,
      intervalUnit: c.intervalUnit as CommercialBillingCycle["intervalUnit"],
      createdAt: String(c.createdAt),
      updatedAt: String(c.updatedAt),
    };
    store.billingCycles.set(row.id, row);
  }

  for (const p of prices) {
    const row: CommercialPrice = {
      id: p.id,
      planId: p.planId,
      billingCycleId: p.billingCycleId,
      currency: p.currency,
      amount: String(p.amount),
      regionId: p.regionId ?? null,
      createdAt: String(p.createdAt),
      updatedAt: String(p.updatedAt),
    };
    store.prices.set(row.id, row);
  }

  for (const b of bundles) {
    const row: CommercialFeatureBundle = {
      id: b.id,
      code: b.code,
      name: b.name,
      description: b.description ?? null,
      createdAt: String(b.createdAt),
      updatedAt: String(b.updatedAt),
    };
    store.featureBundles.set(row.id, row);
  }

  for (const f of bundleFeatures) {
    const row: CommercialBundleFeature = {
      id: f.id,
      bundleId: f.bundleId,
      featureKey: f.featureKey,
      included: f.included,
    };
    store.bundleFeatures.set(row.id, row);
  }

  for (const p of profiles) {
    const row: CommercialLimitProfile = {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      createdAt: String(p.createdAt),
      updatedAt: String(p.updatedAt),
    };
    store.limitProfiles.set(row.id, row);
  }

  for (const l of limitValues) {
    const row: CommercialLimitValue = {
      id: l.id,
      profileId: l.profileId,
      limitKey: l.limitKey,
      value: l.value ?? null,
      unit: l.unit ?? null,
    };
    store.limitValues.set(row.id, row);
  }

  for (const t of trials) {
    const row: CommercialTrialPolicy = {
      id: t.id,
      code: t.code,
      name: t.name,
      durationDays: t.durationDays,
      description: t.description ?? null,
      createdAt: String(t.createdAt),
      updatedAt: String(t.updatedAt),
    };
    store.trialPolicies.set(row.id, row);
  }

  for (const p of promos) {
    const row: CommercialPromotion = {
      id: p.id,
      code: p.code,
      name: p.name,
      effectSummary: p.effectSummary,
      eligiblePlanIds: (p.eligiblePlanIds as string[]) ?? [],
      startsAt: p.startsAt ? String(p.startsAt) : null,
      endsAt: p.endsAt ? String(p.endsAt) : null,
      isActive: p.isActive,
      createdAt: String(p.createdAt),
      updatedAt: String(p.updatedAt),
    };
    store.promotions.set(row.id, row);
  }

  for (const r of regions) {
    const row: CommercialRegion = {
      id: r.id,
      code: r.code,
      name: r.name,
      countryCode: r.countryCode,
      currency: r.currency,
      taxPolicyRef: r.taxPolicyRef ?? null,
      distributionPartner: r.distributionPartner ?? null,
      regulatoryNotes: r.regulatoryNotes ?? null,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    };
    store.regions.set(row.id, row);
  }

  for (const m of migrations) {
    const row: CommercialMigrationPolicy = {
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description ?? null,
      requiresExplicitAction: m.requiresExplicitAction,
      createdAt: String(m.createdAt),
      updatedAt: String(m.updatedAt),
    };
    store.migrationPolicies.set(row.id, row);
  }

  return {
    hydrated: true,
    plans: store.plans.size,
  };
}
