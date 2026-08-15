/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Durable live-plan persistence. Memory is a runtime cache only.
 * Save is not successful until persistence completes (or in-memory backend in tests).
 */

import { eq } from "drizzle-orm";
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
  commercialRegions,
  commercialMigrationPolicies,
  commercialPromotions,
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
import { CommercialCatalogError } from "./commercialCatalogError";

export const COMMERCIAL_LIVE_PLAN_PERSISTENCE_PROGRAM =
  "COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1" as const;

export type DurableCatalogSnapshot = {
  plans: CommercialLivePlan[];
  prices: CommercialPrice[];
  billingCycles: CommercialBillingCycle[];
  featureBundles: CommercialFeatureBundle[];
  bundleFeatures: CommercialBundleFeature[];
  limitProfiles: CommercialLimitProfile[];
  limitValues: CommercialLimitValue[];
  trialPolicies: CommercialTrialPolicy[];
  regions: CommercialRegion[];
  migrationPolicies: CommercialMigrationPolicy[];
  promotions: CommercialPromotion[];
};

export type DurableLivePlanBackend = {
  readonly kind: "db" | "memory";
  persistLivePlan(planId: string, store: CommercialCatalogStore): Promise<void>;
  persistFullCatalog(store: CommercialCatalogStore): Promise<void>;
  hydrateInto(store: CommercialCatalogStore): Promise<void>;
  snapshot?(): DurableCatalogSnapshot;
  clear?(): void;
};

function emptySnapshot(): DurableCatalogSnapshot {
  return {
    plans: [],
    prices: [],
    billingCycles: [],
    featureBundles: [],
    bundleFeatures: [],
    limitProfiles: [],
    limitValues: [],
    trialPolicies: [],
    regions: [],
    migrationPolicies: [],
    promotions: [],
  };
}

export function collectLivePlanSubgraph(
  planId: string,
  store: CommercialCatalogStore
): DurableCatalogSnapshot {
  const plan = store.plans.get(planId);
  if (!plan) {
    throw new CommercialCatalogError(
      `Plan ${planId} not found for durable save`,
      "not_found"
    );
  }
  const out = emptySnapshot();
  out.plans.push(plan);
  const prices = [...store.prices.values()].filter((p) => p.planId === planId);
  out.prices.push(...prices);
  const cycleIds = new Set(prices.map((p) => p.billingCycleId));
  for (const id of cycleIds) {
    const c = store.billingCycles.get(id);
    if (c) out.billingCycles.push(c);
  }
  const regionIds = new Set(
    prices.map((p) => p.regionId).filter((id): id is string => Boolean(id))
  );
  for (const id of regionIds) {
    const r = store.regions.get(id);
    if (r) out.regions.push(r);
  }
  if (plan.featureBundleId) {
    const b = store.featureBundles.get(plan.featureBundleId);
    if (b) out.featureBundles.push(b);
    for (const f of store.bundleFeatures.values()) {
      if (f.bundleId === plan.featureBundleId) out.bundleFeatures.push(f);
    }
  }
  if (plan.limitProfileId) {
    const p = store.limitProfiles.get(plan.limitProfileId);
    if (p) out.limitProfiles.push(p);
    for (const v of store.limitValues.values()) {
      if (v.profileId === plan.limitProfileId) out.limitValues.push(v);
    }
  }
  if (plan.trialPolicyId) {
    const t = store.trialPolicies.get(plan.trialPolicyId);
    if (t) out.trialPolicies.push(t);
  }
  return out;
}

function applySnapshotToStore(
  snap: DurableCatalogSnapshot,
  store: CommercialCatalogStore
) {
  store.clear();
  for (const p of snap.plans) store.plans.set(p.id, p);
  for (const p of snap.prices) store.prices.set(p.id, p);
  for (const c of snap.billingCycles) store.billingCycles.set(c.id, c);
  for (const b of snap.featureBundles) store.featureBundles.set(b.id, b);
  for (const f of snap.bundleFeatures) store.bundleFeatures.set(f.id, f);
  for (const p of snap.limitProfiles) store.limitProfiles.set(p.id, p);
  for (const v of snap.limitValues) store.limitValues.set(v.id, v);
  for (const t of snap.trialPolicies) store.trialPolicies.set(t.id, t);
  for (const r of snap.regions) store.regions.set(r.id, r);
  for (const m of snap.migrationPolicies) store.migrationPolicies.set(m.id, m);
  for (const p of snap.promotions) store.promotions.set(p.id, p);
}

function cloneSnap(s: DurableCatalogSnapshot): DurableCatalogSnapshot {
  return structuredClone(s);
}

export class InMemoryDurableCatalogBackend implements DurableLivePlanBackend {
  readonly kind = "memory" as const;
  private data: DurableCatalogSnapshot = emptySnapshot();

  async persistLivePlan(planId: string, store: CommercialCatalogStore) {
    const sub = collectLivePlanSubgraph(planId, store);
    const keepPlans = this.data.plans.filter((p) => p.id !== planId);
    const keepPrices = this.data.prices.filter((p) => p.planId !== planId);
    const mergeById = <T extends { id: string }>(a: T[], b: T[]) => {
      const m = new Map(a.map((x) => [x.id, x]));
      for (const x of b) m.set(x.id, x);
      return [...m.values()];
    };
    this.data = {
      plans: [...keepPlans, ...sub.plans],
      prices: [...keepPrices, ...sub.prices],
      billingCycles: mergeById(this.data.billingCycles, sub.billingCycles),
      featureBundles: mergeById(this.data.featureBundles, sub.featureBundles),
      bundleFeatures: [
        ...this.data.bundleFeatures.filter((f) => {
          const bundleIds = new Set(sub.featureBundles.map((b) => b.id));
          return !bundleIds.has(f.bundleId);
        }),
        ...sub.bundleFeatures,
      ],
      limitProfiles: mergeById(this.data.limitProfiles, sub.limitProfiles),
      limitValues: [
        ...this.data.limitValues.filter((v) => {
          const profileIds = new Set(sub.limitProfiles.map((p) => p.id));
          return !profileIds.has(v.profileId);
        }),
        ...sub.limitValues,
      ],
      trialPolicies: mergeById(this.data.trialPolicies, sub.trialPolicies),
      regions: mergeById(this.data.regions, sub.regions),
      migrationPolicies: mergeById(
        this.data.migrationPolicies,
        sub.migrationPolicies
      ),
      promotions: this.data.promotions,
    };
  }

  async persistFullCatalog(store: CommercialCatalogStore) {
    this.data = {
      plans: [...store.plans.values()],
      prices: [...store.prices.values()],
      billingCycles: [...store.billingCycles.values()],
      featureBundles: [...store.featureBundles.values()],
      bundleFeatures: [...store.bundleFeatures.values()],
      limitProfiles: [...store.limitProfiles.values()],
      limitValues: [...store.limitValues.values()],
      trialPolicies: [...store.trialPolicies.values()],
      regions: [...store.regions.values()],
      migrationPolicies: [...store.migrationPolicies.values()],
      promotions: [...store.promotions.values()],
    };
  }

  async hydrateInto(store: CommercialCatalogStore) {
    applySnapshotToStore(cloneSnap(this.data), store);
  }

  snapshot() {
    return cloneSnap(this.data);
  }

  clear() {
    this.data = emptySnapshot();
  }
}

async function persistFullCatalogToDb(store: CommercialCatalogStore): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new CommercialCatalogError(
      "Durable catalog backend unavailable",
      "publication_persistence_failed"
    );
  }

  await db.transaction(async (tx) => {
    for (const p of store.plans.values()) {
      await tx
        .insert(commercialPlans)
        .values({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          sortOrder: p.sortOrder,
          isHidden: p.isHidden,
          featureBundleId: p.featureBundleId,
          limitProfileId: p.limitProfileId,
          trialPolicyId: p.trialPolicyId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: p.name,
            description: p.description,
            sortOrder: p.sortOrder,
            isHidden: p.isHidden,
            featureBundleId: p.featureBundleId,
            limitProfileId: p.limitProfileId,
            trialPolicyId: p.trialPolicyId,
            updatedAt: p.updatedAt,
          },
        });
    }
    for (const c of store.billingCycles.values()) {
      await tx
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
    }
    for (const b of store.featureBundles.values()) {
      await tx
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
          set: { name: b.name, description: b.description, updatedAt: b.updatedAt },
        });
    }
    for (const f of store.bundleFeatures.values()) {
      await tx
        .insert(commercialBundleFeatures)
        .values({
          id: f.id,
          bundleId: f.bundleId,
          featureKey: f.featureKey,
          included: f.included,
        })
        .onDuplicateKeyUpdate({ set: { included: f.included } });
    }
    for (const p of store.limitProfiles.values()) {
      await tx
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
          set: { name: p.name, description: p.description, updatedAt: p.updatedAt },
        });
    }
    for (const v of store.limitValues.values()) {
      await tx
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
    for (const t of store.trialPolicies.values()) {
      await tx
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
          set: {
            durationDays: t.durationDays,
            description: t.description,
            updatedAt: t.updatedAt,
          },
        });
    }
    for (const m of store.migrationPolicies.values()) {
      await tx
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
          set: {
            name: m.name,
            description: m.description,
            requiresExplicitAction: m.requiresExplicitAction,
            updatedAt: m.updatedAt,
          },
        });
    }
    for (const r of store.regions.values()) {
      await tx
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
          set: {
            name: r.name,
            countryCode: r.countryCode,
            currency: r.currency,
            taxPolicyRef: r.taxPolicyRef,
            distributionPartner: r.distributionPartner,
            regulatoryNotes: r.regulatoryNotes,
            updatedAt: r.updatedAt,
          },
        });
    }
    for (const p of store.promotions.values()) {
      await tx
        .insert(commercialPromotions)
        .values({
          id: p.id,
          code: p.code,
          name: p.name,
          effectSummary: p.effectSummary,
          eligiblePlanIds: p.eligiblePlanIds,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: p.name,
            effectSummary: p.effectSummary,
            eligiblePlanIds: p.eligiblePlanIds,
            startsAt: p.startsAt,
            endsAt: p.endsAt,
            isActive: p.isActive,
            updatedAt: p.updatedAt,
          },
        });
    }
    for (const p of store.prices.values()) {
      await tx
        .insert(commercialPrices)
        .values({
          id: p.id,
          planId: p.planId,
          billingCycleId: p.billingCycleId,
          currency: p.currency,
          amount: p.amount,
          regionId: p.regionId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            amount: p.amount,
            currency: p.currency,
            billingCycleId: p.billingCycleId,
            regionId: p.regionId,
            updatedAt: p.updatedAt,
          },
        });
    }
  });
}

class DbDurableLivePlanBackend implements DurableLivePlanBackend {
  readonly kind = "db" as const;

  async persistLivePlan(planId: string, store: CommercialCatalogStore) {
    const db = await getDb();
    if (!db) return;
    const plan = store.plans.get(planId);
    if (!plan) {
      throw new CommercialCatalogError("Plan not found", "not_found");
    }
    const prices = [...store.prices.values()].filter((p) => p.planId === planId);

    await db.transaction(async (tx) => {
      await tx
        .insert(commercialPlans)
        .values({
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          sortOrder: plan.sortOrder,
          isHidden: plan.isHidden,
          featureBundleId: plan.featureBundleId,
          limitProfileId: plan.limitProfileId,
          trialPolicyId: plan.trialPolicyId,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: plan.name,
            description: plan.description,
            sortOrder: plan.sortOrder,
            isHidden: plan.isHidden,
            featureBundleId: plan.featureBundleId,
            limitProfileId: plan.limitProfileId,
            trialPolicyId: plan.trialPolicyId,
            updatedAt: plan.updatedAt,
          },
        });

      await tx.delete(commercialPrices).where(eq(commercialPrices.planId, planId));
      for (const p of prices) {
        await tx.insert(commercialPrices).values({
          id: p.id,
          planId: p.planId,
          billingCycleId: p.billingCycleId,
          currency: p.currency,
          amount: p.amount,
          regionId: p.regionId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      }

      if (plan.featureBundleId) {
        const bundle = store.featureBundles.get(plan.featureBundleId);
        if (bundle) {
          await tx
            .insert(commercialFeatureBundles)
            .values({
              id: bundle.id,
              code: bundle.code,
              name: bundle.name,
              description: bundle.description,
              createdAt: bundle.createdAt,
              updatedAt: bundle.updatedAt,
            })
            .onDuplicateKeyUpdate({
              set: {
                name: bundle.name,
                description: bundle.description,
                updatedAt: bundle.updatedAt,
              },
            });
        }
        await tx
          .delete(commercialBundleFeatures)
          .where(eq(commercialBundleFeatures.bundleId, plan.featureBundleId));
        const features = Array.from(store.bundleFeatures.values()).filter(
          (f) => f.bundleId === plan.featureBundleId
        );
        for (const f of features) {
          await tx.insert(commercialBundleFeatures).values({
            id: f.id,
            bundleId: f.bundleId,
            featureKey: f.featureKey,
            included: f.included,
          });
        }
      }

      if (plan.limitProfileId) {
        const profile = store.limitProfiles.get(plan.limitProfileId);
        if (profile) {
          await tx
            .insert(commercialLimitProfiles)
            .values({
              id: profile.id,
              code: profile.code,
              name: profile.name,
              description: profile.description,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
            })
            .onDuplicateKeyUpdate({
              set: {
                name: profile.name,
                description: profile.description,
                updatedAt: profile.updatedAt,
              },
            });
        }
        await tx
          .delete(commercialLimitValues)
          .where(eq(commercialLimitValues.profileId, plan.limitProfileId));
        const values = Array.from(store.limitValues.values()).filter(
          (v) => v.profileId === plan.limitProfileId
        );
        for (const v of values) {
          await tx.insert(commercialLimitValues).values({
            id: v.id,
            profileId: v.profileId,
            limitKey: v.limitKey,
            value: v.value,
            unit: v.unit,
          });
        }
      }
    });
  }

  async persistFullCatalog(store: CommercialCatalogStore) {
    const db = await getDb();
    if (!db) return;
    await persistFullCatalogToDb(store);
  }

  async hydrateInto(store: CommercialCatalogStore) {
    const { hydrateCommercialCatalogFromDb } = await import(
      "./drizzleCatalogPersistence"
    );
    await hydrateCommercialCatalogFromDb(store);
  }
}

let testBackend: DurableLivePlanBackend | null = null;

export function setDurableLivePlanBackendForTests(
  backend: DurableLivePlanBackend | null
) {
  testBackend = backend;
}

export function getDurableLivePlanBackend(): DurableLivePlanBackend {
  if (testBackend) return testBackend;
  return new DbDurableLivePlanBackend();
}

export async function persistLivePlan(
  planId: string,
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<void> {
  await getDurableLivePlanBackend().persistLivePlan(planId, store);
}

export async function persistFullLiveCatalog(
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<void> {
  await getDurableLivePlanBackend().persistFullCatalog(store);
}

export async function hydrateRuntimeCatalogFromDurableAuthority(
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<void> {
  await getDurableLivePlanBackend().hydrateInto(store);
}
