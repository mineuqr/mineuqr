/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * Persist / hydrate Commercial Catalog from production commercial_* tables.
 */

import { eq } from "drizzle-orm";
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
  commercialPromotions,
  commercialRegions,
  commercialMigrationPolicies,
  commercialRetirementPolicies,
  commercialSnapshotDefinitions,
} from "../../db/schema/commercial";
import {
  commercialCatalogStore,
  type CommercialCatalogStore,
  type StoredSnapshot,
} from "./CatalogStore";
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
  PlanVersionLifecycleState,
  VersionCompatibility,
} from "@shared/commercial-catalog";

function asState(v: string): PlanVersionLifecycleState {
  if (
    v === "draft" ||
    v === "published" ||
    v === "deprecated" ||
    v === "retired"
  ) {
    return v;
  }
  return "draft";
}

function emptyCompat(): VersionCompatibility {
  return {
    upgradeTargets: [],
    downgradeTargets: [],
    migrationRequirements: [],
    breakingCommercialChanges: [],
  };
}

/** Load all catalog aggregates from DB into the in-process store. */
export async function hydrateCommercialCatalogFromDb(
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<{ hydrated: boolean; plans: number; versions: number }> {
  const db = await getDb();
  if (!db) return { hydrated: false, plans: 0, versions: 0 };

  const [
    plans,
    versions,
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
    retirements,
    snapshots,
  ] = await Promise.all([
    db.select().from(commercialPlans),
    db.select().from(commercialPlanVersions),
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
    db.select().from(commercialRetirementPolicies),
    db.select().from(commercialSnapshotDefinitions),
  ]);

  store.clear();

  for (const p of plans) {
    const row: CommercialPlanIdentity = {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      sortOrder: p.sortOrder,
      isHidden: p.isHidden,
      createdAt: String(p.createdAt),
      updatedAt: String(p.updatedAt),
    };
    store.plans.set(row.id, row);
  }

  for (const v of versions) {
    const compat =
      (v.compatibility as VersionCompatibility | null) ?? emptyCompat();
    const row: CommercialPlanVersion = {
      id: v.id,
      planId: v.planId,
      versionCode: v.versionCode,
      versionName: v.versionName,
      state: asState(v.state),
      featureBundleId: v.featureBundleId ?? null,
      limitProfileId: v.limitProfileId ?? null,
      trialPolicyId: v.trialPolicyId ?? null,
      migrationPolicyId: v.migrationPolicyId ?? null,
      retirementPolicyId: v.retirementPolicyId ?? null,
      compatibility: {
        upgradeTargets: compat.upgradeTargets ?? [],
        downgradeTargets: compat.downgradeTargets ?? [],
        migrationRequirements: compat.migrationRequirements ?? [],
        breakingCommercialChanges: compat.breakingCommercialChanges ?? [],
      },
      publishedAt: v.publishedAt ? String(v.publishedAt) : null,
      deprecatedAt: v.deprecatedAt ? String(v.deprecatedAt) : null,
      retiredAt: v.retiredAt ? String(v.retiredAt) : null,
      createdAt: String(v.createdAt),
      updatedAt: String(v.updatedAt),
    };
    store.versions.set(row.id, row);
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
      planVersionId: p.planVersionId,
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
      eligiblePlanVersionIds: (p.eligiblePlanVersionIds as string[]) ?? [],
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

  for (const r of retirements) {
    const row: CommercialRetirementPolicy = {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description ?? null,
      allowRenewals: r.allowRenewals,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    };
    store.retirementPolicies.set(row.id, row);
  }

  for (const s of snapshots) {
    const row: StoredSnapshot = {
      id: s.id,
      planVersionId: s.planVersionId,
      schemaVersion: s.schemaVersion,
      payload: s.payload as CommercialSnapshotDefinition,
      effectiveDate: String(s.effectiveDate),
      createdAt: String(s.createdAt),
    };
    store.snapshots.set(row.id, row);
  }

  return {
    hydrated: true,
    plans: store.plans.size,
    versions: store.versions.size,
  };
}

/** Load a single snapshot definition into memory (fail-closed resolve support). */
export async function hydrateCommercialSnapshotById(
  snapshotId: string,
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<boolean> {
  if (store.snapshots.has(snapshotId)) return true;
  const db = await getDb();
  if (!db) return false;
  try {
    const rows = await db
      .select()
      .from(commercialSnapshotDefinitions)
      .where(eq(commercialSnapshotDefinitions.id, snapshotId))
      .limit(1);
    const s = rows[0];
    if (!s) return false;
    const row: StoredSnapshot = {
      id: s.id,
      planVersionId: s.planVersionId,
      schemaVersion: s.schemaVersion,
      payload: s.payload as CommercialSnapshotDefinition,
      effectiveDate: String(s.effectiveDate),
      createdAt: String(s.createdAt),
    };
    store.snapshots.set(row.id, row);
    return true;
  } catch {
    return false;
  }
}

/** Persist a single plan aggregate graph currently in the store (best-effort upsert). */
export async function persistCommercialCatalogEntity(
  kind:
    | "plan"
    | "version"
    | "price"
    | "billing_cycle"
    | "feature_bundle"
    | "limit_profile"
    | "trial_policy"
    | "promotion"
    | "region"
    | "migration_policy"
    | "retirement_policy"
    | "snapshot",
  id: string,
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    switch (kind) {
      case "plan": {
        const p = store.plans.get(id);
        if (!p) return false;
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
            set: {
              name: p.name,
              description: p.description,
              sortOrder: p.sortOrder,
              isHidden: p.isHidden,
              updatedAt: p.updatedAt,
            },
          });
        return true;
      }
      case "billing_cycle": {
        const c = store.billingCycles.get(id);
        if (!c) return false;
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
            set: {
              name: c.name,
              intervalCount: c.intervalCount,
              intervalUnit: c.intervalUnit,
              updatedAt: c.updatedAt,
            },
          });
        return true;
      }
      case "snapshot": {
        const s = store.snapshots.get(id);
        if (!s) return false;
        await db
          .insert(commercialSnapshotDefinitions)
          .values({
            id: s.id,
            planVersionId: s.planVersionId,
            schemaVersion: s.schemaVersion,
            payload: s.payload,
            effectiveDate: s.effectiveDate,
            createdAt: s.createdAt,
          })
          .onDuplicateKeyUpdate({
            set: {
              payload: s.payload,
            },
          });
        return true;
      }
      default:
        // Full graph persist is handled by seedAdoptionCatalog
        return false;
    }
  } catch {
    return false;
  }
}
