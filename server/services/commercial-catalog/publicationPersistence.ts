/**
 * COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1
 *
 * Durable publication authority for Commercial Catalog.
 * Memory is a runtime cache only — publish is not successful until persistence completes.
 * Does NOT redesign Discovery, Projection, Presentation, or Subscription Runtime.
 */

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
  commercialRegions,
  commercialMigrationPolicies,
  commercialRetirementPolicies,
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
  CommercialMigrationPolicy,
  CommercialPlanIdentity,
  CommercialPlanVersion,
  CommercialPrice,
  CommercialRegion,
  CommercialRetirementPolicy,
  CommercialTrialPolicy,
} from "@shared/commercial-catalog";
import { CommercialCatalogError } from "./commercialCatalogError";

export const COMMERCIAL_PUBLICATION_PERSISTENCE_PROGRAM =
  "COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1" as const;

/** Serializable durable catalog graph (test + authority snapshot). */
export type DurableCatalogSnapshot = {
  plans: CommercialPlanIdentity[];
  versions: CommercialPlanVersion[];
  prices: CommercialPrice[];
  billingCycles: CommercialBillingCycle[];
  featureBundles: CommercialFeatureBundle[];
  bundleFeatures: CommercialBundleFeature[];
  limitProfiles: CommercialLimitProfile[];
  limitValues: CommercialLimitValue[];
  trialPolicies: CommercialTrialPolicy[];
  regions: CommercialRegion[];
  migrationPolicies: CommercialMigrationPolicy[];
  retirementPolicies: CommercialRetirementPolicy[];
};

export type DurablePublicationBackend = {
  readonly kind: "db" | "memory";
  /** Atomically persist the published version subgraph. */
  persistPublishedVersion(
    versionId: string,
    store: CommercialCatalogStore
  ): Promise<void>;
  /** Persist foundation lifecycle fields for an existing version row. */
  persistVersionLifecycle(
    versionId: string,
    store: CommercialCatalogStore
  ): Promise<void>;
  /** Replace runtime store from durable authority (restart / rehydrate). */
  hydrateInto(store: CommercialCatalogStore): Promise<void>;
  /** Test helper — dump durable snapshot. */
  snapshot?(): DurableCatalogSnapshot;
  clear?(): void;
};

function emptySnapshot(): DurableCatalogSnapshot {
  return {
    plans: [],
    versions: [],
    prices: [],
    billingCycles: [],
    featureBundles: [],
    bundleFeatures: [],
    limitProfiles: [],
    limitValues: [],
    trialPolicies: [],
    regions: [],
    migrationPolicies: [],
    retirementPolicies: [],
  };
}

function collectVersionSubgraph(
  versionId: string,
  store: CommercialCatalogStore
): DurableCatalogSnapshot {
  const version = store.versions.get(versionId);
  if (!version) {
    throw new CommercialCatalogError(
      `Version ${versionId} not found for durable publication`,
      "not_found"
    );
  }
  const plan = store.plans.get(version.planId);
  if (!plan) {
    throw new CommercialCatalogError(
      `Plan ${version.planId} not found for durable publication`,
      "not_found"
    );
  }

  const out = emptySnapshot();
  out.plans.push(plan);
  out.versions.push(version);

  const prices = [...store.prices.values()].filter(
    (p) => p.planVersionId === versionId
  );
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

  if (version.featureBundleId) {
    const b = store.featureBundles.get(version.featureBundleId);
    if (b) out.featureBundles.push(b);
    for (const f of store.bundleFeatures.values()) {
      if (f.bundleId === version.featureBundleId) out.bundleFeatures.push(f);
    }
  }

  if (version.limitProfileId) {
    const p = store.limitProfiles.get(version.limitProfileId);
    if (p) out.limitProfiles.push(p);
    for (const v of store.limitValues.values()) {
      if (v.profileId === version.limitProfileId) out.limitValues.push(v);
    }
  }

  if (version.trialPolicyId) {
    const t = store.trialPolicies.get(version.trialPolicyId);
    if (t) out.trialPolicies.push(t);
  }
  if (version.migrationPolicyId) {
    const m = store.migrationPolicies.get(version.migrationPolicyId);
    if (m) out.migrationPolicies.push(m);
  }
  if (version.retirementPolicyId) {
    const r = store.retirementPolicies.get(version.retirementPolicyId);
    if (r) out.retirementPolicies.push(r);
  }

  return out;
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  const i = rows.findIndex((r) => r.id === next.id);
  if (i >= 0) {
    const copy = rows.slice();
    copy[i] = next;
    return copy;
  }
  return [...rows, next];
}

function mergeSnapshot(
  base: DurableCatalogSnapshot,
  patch: DurableCatalogSnapshot
): DurableCatalogSnapshot {
  let next: DurableCatalogSnapshot = {
    plans: [...base.plans],
    versions: [...base.versions],
    prices: [...base.prices],
    billingCycles: [...base.billingCycles],
    featureBundles: [...base.featureBundles],
    bundleFeatures: [...base.bundleFeatures],
    limitProfiles: [...base.limitProfiles],
    limitValues: [...base.limitValues],
    trialPolicies: [...base.trialPolicies],
    regions: [...base.regions],
    migrationPolicies: [...base.migrationPolicies],
    retirementPolicies: [...base.retirementPolicies],
  };
  for (const p of patch.plans) next.plans = upsertById(next.plans, p);
  for (const v of patch.versions) next.versions = upsertById(next.versions, v);
  for (const p of patch.prices) next.prices = upsertById(next.prices, p);
  for (const c of patch.billingCycles)
    next.billingCycles = upsertById(next.billingCycles, c);
  for (const b of patch.featureBundles)
    next.featureBundles = upsertById(next.featureBundles, b);
  for (const f of patch.bundleFeatures)
    next.bundleFeatures = upsertById(next.bundleFeatures, f);
  for (const p of patch.limitProfiles)
    next.limitProfiles = upsertById(next.limitProfiles, p);
  for (const v of patch.limitValues)
    next.limitValues = upsertById(next.limitValues, v);
  for (const t of patch.trialPolicies)
    next.trialPolicies = upsertById(next.trialPolicies, t);
  for (const r of patch.regions) next.regions = upsertById(next.regions, r);
  for (const m of patch.migrationPolicies)
    next.migrationPolicies = upsertById(next.migrationPolicies, m);
  for (const r of patch.retirementPolicies)
    next.retirementPolicies = upsertById(next.retirementPolicies, r);
  return next;
}

function applySnapshotToStore(
  snap: DurableCatalogSnapshot,
  store: CommercialCatalogStore
): void {
  store.clear();
  for (const p of snap.plans) store.plans.set(p.id, p);
  for (const v of snap.versions) store.versions.set(v.id, v);
  for (const p of snap.prices) store.prices.set(p.id, p);
  for (const c of snap.billingCycles) store.billingCycles.set(c.id, c);
  for (const b of snap.featureBundles) store.featureBundles.set(b.id, b);
  for (const f of snap.bundleFeatures) store.bundleFeatures.set(f.id, f);
  for (const p of snap.limitProfiles) store.limitProfiles.set(p.id, p);
  for (const v of snap.limitValues) store.limitValues.set(v.id, v);
  for (const t of snap.trialPolicies) store.trialPolicies.set(t.id, t);
  for (const r of snap.regions) store.regions.set(r.id, r);
  for (const m of snap.migrationPolicies) store.migrationPolicies.set(m.id, m);
  for (const r of snap.retirementPolicies) store.retirementPolicies.set(r.id, r);
}

/** In-process durable authority for architecture tests (simulates commercial_*). */
export class InMemoryDurableCatalogBackend implements DurablePublicationBackend {
  readonly kind = "memory" as const;
  private data: DurableCatalogSnapshot = emptySnapshot();

  async persistPublishedVersion(
    versionId: string,
    store: CommercialCatalogStore
  ): Promise<void> {
    const graph = collectVersionSubgraph(versionId, store);
    if (graph.versions[0]?.state !== "published") {
      throw new CommercialCatalogError(
        "Durable publish requires foundation state published",
        "publication_persistence_failed"
      );
    }
    this.data = mergeSnapshot(this.data, graph);
  }

  async persistVersionLifecycle(
    versionId: string,
    store: CommercialCatalogStore
  ): Promise<void> {
    const version = store.versions.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    this.data.versions = upsertById(this.data.versions, version);
  }

  async hydrateInto(store: CommercialCatalogStore): Promise<void> {
    applySnapshotToStore(this.data, store);
  }

  /** Test helper — mirror a runtime store into durable authority (any lifecycle). */
  replaceFromStore(store: CommercialCatalogStore): void {
    const next = emptySnapshot();
    next.plans = [...store.plans.values()];
    next.versions = [...store.versions.values()];
    next.prices = [...store.prices.values()];
    next.billingCycles = [...store.billingCycles.values()];
    next.featureBundles = [...store.featureBundles.values()];
    next.bundleFeatures = [...store.bundleFeatures.values()];
    next.limitProfiles = [...store.limitProfiles.values()];
    next.limitValues = [...store.limitValues.values()];
    next.trialPolicies = [...store.trialPolicies.values()];
    next.regions = [...store.regions.values()];
    next.migrationPolicies = [...store.migrationPolicies.values()];
    next.retirementPolicies = [...store.retirementPolicies.values()];
    this.data = next;
  }

  snapshot(): DurableCatalogSnapshot {
    return structuredClone(this.data);
  }

  clear(): void {
    this.data = emptySnapshot();
  }
}

type DbExecutor = Awaited<ReturnType<typeof getDb>>;

async function upsertGraphToDb(
  db: NonNullable<DbExecutor>,
  graph: DurableCatalogSnapshot
): Promise<void> {
  for (const p of graph.plans) {
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
  }
  for (const c of graph.billingCycles) {
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
  }
  for (const b of graph.featureBundles) {
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
        set: { name: b.name, description: b.description, updatedAt: b.updatedAt },
      });
  }
  for (const f of graph.bundleFeatures) {
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
  for (const p of graph.limitProfiles) {
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
        set: { name: p.name, description: p.description, updatedAt: p.updatedAt },
      });
  }
  for (const v of graph.limitValues) {
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
  for (const t of graph.trialPolicies) {
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
        set: {
          durationDays: t.durationDays,
          description: t.description,
          updatedAt: t.updatedAt,
        },
      });
  }
  for (const m of graph.migrationPolicies) {
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
  for (const r of graph.retirementPolicies) {
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
        set: {
          name: r.name,
          allowRenewals: r.allowRenewals,
          updatedAt: r.updatedAt,
        },
      });
  }
  for (const r of graph.regions) {
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
  for (const v of graph.versions) {
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
          deprecatedAt: v.deprecatedAt,
          retiredAt: v.retiredAt,
          updatedAt: v.updatedAt,
        },
      });
  }
  for (const p of graph.prices) {
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

export class DbDurableCatalogBackend implements DurablePublicationBackend {
  readonly kind = "db" as const;

  async persistPublishedVersion(
    versionId: string,
    store: CommercialCatalogStore
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new CommercialCatalogError(
        "Durable publication requires database connectivity",
        "publication_persistence_failed"
      );
    }
    const graph = collectVersionSubgraph(versionId, store);
    if (graph.versions[0]?.state !== "published") {
      throw new CommercialCatalogError(
        "Durable publish requires foundation state published",
        "publication_persistence_failed"
      );
    }
    await db.transaction(async (tx) => {
      await upsertGraphToDb(tx as unknown as NonNullable<DbExecutor>, graph);
    });
  }

  async persistVersionLifecycle(
    versionId: string,
    store: CommercialCatalogStore
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new CommercialCatalogError(
        "Durable lifecycle persist requires database connectivity",
        "publication_persistence_failed"
      );
    }
    const version = store.versions.get(versionId);
    if (!version) {
      throw new CommercialCatalogError("Version not found", "not_found");
    }
    await db.transaction(async (tx) => {
      await upsertGraphToDb(tx as unknown as NonNullable<DbExecutor>, {
        ...emptySnapshot(),
        versions: [version],
      });
    });
  }

  async hydrateInto(store: CommercialCatalogStore): Promise<void> {
    const { hydrateCommercialCatalogFromDb } = await import(
      "./drizzleCatalogPersistence"
    );
    await hydrateCommercialCatalogFromDb(store);
  }
}

let testBackend: DurablePublicationBackend | null = null;
let vitestMemoryBackend: InMemoryDurableCatalogBackend | null = null;
const dbBackend = new DbDurableCatalogBackend();

function isVitestRuntime(): boolean {
  return process.env.VITEST === "true" || process.env.VITEST === "1";
}

export function getDurablePublicationBackend(): DurablePublicationBackend {
  if (testBackend) return testBackend;
  // Vitest defaults to in-memory durable authority (never write test publishes to DB).
  if (isVitestRuntime()) {
    if (!vitestMemoryBackend) {
      vitestMemoryBackend = new InMemoryDurableCatalogBackend();
    }
    return vitestMemoryBackend;
  }
  return dbBackend;
}

/** Vitest only — inject in-memory durable authority. */
export function setDurablePublicationBackendForTests(
  backend: DurablePublicationBackend | null
): void {
  testBackend = backend;
  if (backend === null) {
    vitestMemoryBackend = isVitestRuntime()
      ? new InMemoryDurableCatalogBackend()
      : null;
  }
}

/**
 * Persist a published version graph. Authority = durable backend, not memory.
 */
export async function persistPublishedVersionPublication(
  versionId: string,
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<void> {
  await getDurablePublicationBackend().persistPublishedVersion(versionId, store);
}

export async function persistVersionLifecyclePublication(
  versionId: string,
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<void> {
  await getDurablePublicationBackend().persistVersionLifecycle(versionId, store);
}

/**
 * Rehydrate runtime cache exclusively from durable publication authority.
 */
export async function hydrateRuntimeCatalogFromDurableAuthority(
  store: CommercialCatalogStore = commercialCatalogStore
): Promise<void> {
  await getDurablePublicationBackend().hydrateInto(store);
}
