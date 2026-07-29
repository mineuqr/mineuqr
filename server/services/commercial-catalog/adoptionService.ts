/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * Consumer-facing adoption APIs — Catalog SSOT, Subscription consumes only.
 */

import {
  COMMERCIAL_CATALOG_ADOPTION_CONSUMERS,
  type CommercialSnapshotDefinition,
} from "@shared/commercial-catalog";
import { commercialCatalogStore } from "./CatalogStore";
import {
  commercialSnapshotService,
  planService,
  planVersionService,
  pricingService,
  trialPolicyCatalogService,
  regionalPolicyService,
  promotionService,
} from "./index";
import {
  bridgeByCatalogPlanCode,
  bridgeByLegacyPlanId,
  LEGACY_PLAN_BRIDGE,
} from "./legacyPlanBridge";
import { commercialAdoptionObservability } from "./adoptionObservability";
import { commercialRuntimeAuthorityObservability } from "./runtimeAuthorityObservability";
import { ensureCommercialCatalogAdoptionSeed } from "./seedAdoptionCatalog";
import { emitAuditEvent } from "../../audit/auditEmitter";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import { getDb } from "../../db";
import { commercialSubscriptionBindings } from "../../db/schema/commercial/bindings";
import { eq } from "drizzle-orm";
import { newCommercialId, nowIso } from "./CatalogStore";
import { hydrateCommercialSnapshotById } from "./drizzleCatalogPersistence";

export type CommercialSnapshotBindEvent =
  | "plan_selected"
  | "trial_activated"
  | "upgrade"
  | "downgrade"
  | "renewal";

export type PublishedPlanOffering = {
  /** Legacy plan id for payment/activation compatibility bridge */
  legacyPlanId: number | null;
  planId: string;
  planCode: string;
  planName: string;
  planVersionId: string;
  versionCode: string;
  versionName: string;
  state: "published";
  currency: string;
  priceMonthly: string | null;
  priceYearly: string | null;
  featureKeys: string[];
  limits: { limitKey: string; value: number | null; unit: string | null }[];
  trialPolicyId: string | null;
  trialDurationDays: number | null;
};

export type SubscriptionCatalogBinding = {
  subscriptionId: number;
  planVersionId: string;
  snapshotId: string;
  legacyPlanId: number | null;
  createdAt: string;
};

let ensurePromise: Promise<unknown> | null = null;

export async function ensureCatalogReady() {
  if (!ensurePromise) {
    ensurePromise = ensureCommercialCatalogAdoptionSeed().catch((e) => {
      ensurePromise = null;
      throw e;
    });
  }
  return ensurePromise;
}

/** Plan selection — published only (draft/deprecated/retired excluded). */
export async function listPublishedPlanOfferings(): Promise<
  PublishedPlanOffering[]
> {
  await ensureCatalogReady();
  const offerings: PublishedPlanOffering[] = [];
  const versions = planVersionService
    .list()
    .filter((v) => v.state === "published");

  for (const version of versions) {
    const plan = planService.get(version.planId);
    if (!plan || plan.isHidden) continue;
    const prices = pricingService.list(version.id);
    const cycles = pricingService.listBillingCycles();
    const monthlyCycle = cycles.find((c) => c.code === "monthly");
    const yearlyCycle = cycles.find((c) => c.code === "yearly");
    const monthly = prices.find((p) => p.billingCycleId === monthlyCycle?.id);
    const yearly = prices.find((p) => p.billingCycleId === yearlyCycle?.id);
    const features = version.featureBundleId
      ? [...commercialCatalogStore.bundleFeatures.values()].filter(
          (f) => f.bundleId === version.featureBundleId && f.included
        )
      : [];
    const limits = version.limitProfileId
      ? [...commercialCatalogStore.limitValues.values()].filter(
          (l) => l.profileId === version.limitProfileId
        )
      : [];
    const trial = version.trialPolicyId
      ? trialPolicyCatalogService.get(version.trialPolicyId)
      : null;
    const bridge = bridgeByCatalogPlanCode(plan.code);

    offerings.push({
      legacyPlanId: bridge?.legacyPlanId ?? null,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      planVersionId: version.id,
      versionCode: version.versionCode,
      versionName: version.versionName,
      state: "published",
      currency: monthly?.currency ?? yearly?.currency ?? "SAR",
      priceMonthly: monthly?.amount ?? null,
      priceYearly: yearly?.amount ?? null,
      featureKeys: features.map((f) => f.featureKey),
      limits: limits.map((l) => ({
        limitKey: l.limitKey,
        value: l.value,
        unit: l.unit,
      })),
      trialPolicyId: trial?.id ?? null,
      trialDurationDays: trial?.durationDays ?? null,
    });
    commercialAdoptionObservability.recordPlanAdoption();
  }

  return offerings.sort((a, b) => a.planCode.localeCompare(b.planCode));
}

/**
 * Legacy-compatible plan list for Pricing / checkout bridges.
 * Catalog primary; if empty, records legacy lookup for caller fallback.
 */
export async function listPlansForSelectionLegacyShape(): Promise<
  | {
      source: "catalog";
      plans: Array<{
        id: number;
        nameEn: string;
        nameAr: string;
        descriptionEn: string | null;
        descriptionAr: string | null;
        priceMonthly: string;
        priceYearly: string | null;
        maxRestaurants: number;
        maxItemsPerRestaurant: number;
        maxCategories: number;
        features: string | null;
        featuresAr: string | null;
        isActive: boolean;
        sortOrder: number;
        planVersionId: string;
        catalogPlanId: string;
      }>;
    }
  | { source: "legacy_required" }
> {
  const offerings = await listPublishedPlanOfferings();
  const withLegacy = offerings.filter((o) => o.legacyPlanId != null);
  if (!withLegacy.length) {
    commercialAdoptionObservability.recordLegacyLookup(
      "listPlansForSelectionLegacyShape"
    );
    return { source: "legacy_required" };
  }

  return {
    source: "catalog",
    plans: withLegacy.map((o, idx) => {
      const restaurants =
        o.limits.find((l) => l.limitKey === "restaurants")?.value ?? 1;
      const items = o.limits.find((l) => l.limitKey === "items")?.value ?? 100;
      const categories =
        o.limits.find((l) => l.limitKey === "categories")?.value ?? 10;
      return {
        id: o.legacyPlanId!,
        nameEn: o.planName,
        nameAr: o.planName,
        descriptionEn: o.versionName,
        descriptionAr: o.versionName,
        priceMonthly: o.priceMonthly ?? "0.00",
        priceYearly: o.priceYearly,
        maxRestaurants: restaurants ?? 1,
        maxItemsPerRestaurant: items ?? 100,
        maxCategories: categories ?? 10,
        features: JSON.stringify(o.featureKeys),
        featuresAr: JSON.stringify(o.featureKeys),
        isActive: true,
        sortOrder: idx + 1,
        planVersionId: o.planVersionId,
        catalogPlanId: o.planId,
      };
    }),
  };
}

export async function resolveTrialPolicyFromCatalog(): Promise<{
  durationDays: number;
  trialPolicyId: string | null;
  professionalPlanVersionId: string | null;
  legacyPlanId: number;
}> {
  await ensureCatalogReady();
  const offerings = await listPublishedPlanOfferings();
  const professional =
    offerings.find((o) => o.planCode === "professional") ??
    offerings.find((o) => o.trialDurationDays != null) ??
    offerings[0];
  const bridge =
    bridgeByCatalogPlanCode(professional?.planCode ?? "professional") ??
    LEGACY_PLAN_BRIDGE.find((b) => b.catalogPlanCode === "professional")!;

  const duration =
    professional?.trialDurationDays ??
    trialPolicyCatalogService.list().find((t) => t.code.includes("14"))
      ?.durationDays ??
    14;

  return {
    durationDays: duration,
    trialPolicyId: professional?.trialPolicyId ?? null,
    professionalPlanVersionId: professional?.planVersionId ?? null,
    legacyPlanId: bridge.legacyPlanId,
  };
}

export async function resolveRegionFromCatalog(countryCode: string) {
  await ensureCatalogReady();
  commercialAdoptionObservability.recordRegionalResolution();
  const region = regionalPolicyService
    .list()
    .find((r) => r.countryCode.toUpperCase() === countryCode.toUpperCase());
  if (!region) {
    commercialAdoptionObservability.recordLegacyLookup(
      `region:${countryCode}`
    );
  }
  return region ?? null;
}

export async function resolvePromotionFromCatalog(code: string) {
  await ensureCatalogReady();
  commercialAdoptionObservability.recordPromotionResolution();
  const promo = promotionService
    .list()
    .find((p) => p.code === code && p.isActive);
  if (!promo) {
    commercialAdoptionObservability.recordLegacyLookup(`promotion:${code}`);
  }
  return promo ?? null;
}

/**
 * Create immutable Commercial Snapshot at subscription bind / upgrade / downgrade.
 * Persists definition + subscription binding (Catalog-owned).
 */
function auditEventForBind(event: CommercialSnapshotBindEvent) {
  switch (event) {
    case "upgrade":
      return OPS_EVENT.commercial_upgrade_snapshot_created;
    case "downgrade":
      return OPS_EVENT.commercial_downgrade_snapshot_created;
    case "renewal":
      return OPS_EVENT.commercial_renewal_snapshot_created;
    default:
      return OPS_EVENT.commercial_snapshot_created;
  }
}

export async function createImmutableCommercialSnapshotForSubscription(input: {
  subscriptionId: number;
  planVersionId: string;
  legacyPlanId?: number | null;
  regionId?: string | null;
  promotionId?: string | null;
  actorId?: number | null;
  event: CommercialSnapshotBindEvent;
}): Promise<{ snapshotId: string; payload: CommercialSnapshotDefinition }> {
  await ensureCatalogReady();
  const captured = commercialSnapshotService.captureFromVersion(
    input.planVersionId,
    {
      regionId: input.regionId,
      promotionId: input.promotionId,
    }
  );

  // Snapshots are immutable — freeze already applied in service.
  // Historical snapshot rows are preserved; binding points at the latest.
  const binding: SubscriptionCatalogBinding = {
    subscriptionId: input.subscriptionId,
    planVersionId: input.planVersionId,
    snapshotId: captured.id,
    legacyPlanId: input.legacyPlanId ?? null,
    createdAt: nowIso(),
  };

  const db = await getDb();
  if (db) {
    try {
      await db
        .insert(commercialSubscriptionBindings)
        .values({
          id: newCommercialId(),
          subscriptionId: binding.subscriptionId,
          planVersionId: binding.planVersionId,
          snapshotId: binding.snapshotId,
          legacyPlanId: binding.legacyPlanId,
          createdAt: binding.createdAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            planVersionId: binding.planVersionId,
            snapshotId: binding.snapshotId,
            legacyPlanId: binding.legacyPlanId,
          },
        });
      const { persistCommercialCatalogEntity } = await import(
        "./drizzleCatalogPersistence"
      );
      await persistCommercialCatalogEntity("snapshot", captured.id);
    } catch (e) {
      commercialAdoptionObservability.recordResolutionError(
        e instanceof Error ? e.message : String(e)
      );
      commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  commercialAdoptionObservability.recordSnapshotCreated();
  emitAuditEvent({
    eventType: auditEventForBind(input.event),
    category: "COMMERCIAL",
    severity: "info",
    opsCategory: "ADMIN",
    actorId: input.actorId ?? null,
    targetType: "subscription",
    targetId: input.subscriptionId,
    after: {
      snapshotId: captured.id,
      planVersionId: input.planVersionId,
      event: input.event,
    },
    metadata: { event: input.event },
  });
  emitAuditEvent({
    eventType: OPS_EVENT.commercial_snapshot_bound,
    category: "COMMERCIAL",
    severity: "info",
    opsCategory: "ADMIN",
    actorId: input.actorId ?? null,
    targetType: "subscription",
    targetId: input.subscriptionId,
    after: {
      snapshotId: captured.id,
      planVersionId: input.planVersionId,
    },
    metadata: { event: input.event },
  });
  emitAuditEvent({
    eventType: OPS_EVENT.commercial_snapshot_activated,
    category: "COMMERCIAL",
    severity: "info",
    opsCategory: "ADMIN",
    actorId: input.actorId ?? null,
    targetType: "subscription",
    targetId: input.subscriptionId,
    after: {
      snapshotId: captured.id,
      planVersionId: input.planVersionId,
    },
    metadata: { event: input.event },
  });

  return {
    snapshotId: captured.id,
    payload: captured.payload as CommercialSnapshotDefinition,
  };
}

/**
 * Bind Snapshot + SubscriptionBinding from a legacy plan id (activation / transition).
 * Best-effort: records failure metrics; does not throw into payment paths.
 */
export async function ensureCommercialSnapshotBoundForSubscription(input: {
  subscriptionId: number;
  legacyPlanId: number;
  event: CommercialSnapshotBindEvent;
  actorId?: number | null;
  regionId?: string | null;
  promotionId?: string | null;
}): Promise<{ snapshotId: string } | null> {
  try {
    await ensureCatalogReady();
    const planVersionId = resolvePlanVersionIdFromLegacyPlanId(input.legacyPlanId);
    if (!planVersionId) {
      commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
        `no_plan_version:${input.legacyPlanId}`
      );
      return null;
    }
    const created = await createImmutableCommercialSnapshotForSubscription({
      subscriptionId: input.subscriptionId,
      planVersionId,
      legacyPlanId: input.legacyPlanId,
      regionId: input.regionId,
      promotionId: input.promotionId,
      actorId: input.actorId,
      event: input.event,
    });
    return { snapshotId: created.snapshotId };
  } catch (e) {
    commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

export function classifyPlanTransitionEvent(
  previousPlanId: number | null | undefined,
  nextPlanId: number
): CommercialSnapshotBindEvent {
  if (previousPlanId == null || previousPlanId === nextPlanId) {
    return "renewal";
  }
  const prev = bridgeByLegacyPlanId(previousPlanId);
  const next = bridgeByLegacyPlanId(nextPlanId);
  const order = ["basic", "professional", "enterprise"] as const;
  const pi = prev ? order.indexOf(prev.catalogPlanCode as (typeof order)[number]) : -1;
  const ni = next ? order.indexOf(next.catalogPlanCode as (typeof order)[number]) : -1;
  if (pi >= 0 && ni >= 0) {
    if (ni > pi) return "upgrade";
    if (ni < pi) return "downgrade";
    return "renewal";
  }
  if (nextPlanId > previousPlanId) return "upgrade";
  if (nextPlanId < previousPlanId) return "downgrade";
  return "plan_selected";
}

export async function getSubscriptionCommercialBinding(
  subscriptionId: number
): Promise<SubscriptionCatalogBinding | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(commercialSubscriptionBindings)
      .where(eq(commercialSubscriptionBindings.subscriptionId, subscriptionId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      subscriptionId: row.subscriptionId,
      planVersionId: row.planVersionId,
      snapshotId: row.snapshotId,
      legacyPlanId: row.legacyPlanId ?? null,
      createdAt: String(row.createdAt),
    };
  } catch {
    return null;
  }
}

/**
 * Runtime commercial facts from Commercial Snapshot (CC-13).
 * Hydrates snapshot from DB when missing in-process. Never reads live Catalog facts.
 */
export async function resolveCommercialFactsFromSnapshot(
  subscriptionId: number
): Promise<{
  source: "snapshot" | "missing";
  snapshot: CommercialSnapshotDefinition | null;
  featureKeys: string[];
  limits: CommercialSnapshotDefinition["usageLimits"];
}> {
  const binding = await getSubscriptionCommercialBinding(subscriptionId);
  if (!binding) {
    commercialAdoptionObservability.recordLegacyLookup(
      `snapshot_missing:${subscriptionId}`
    );
    return {
      source: "missing",
      snapshot: null,
      featureKeys: [],
      limits: [],
    };
  }

  let stored = commercialSnapshotService.get(binding.snapshotId);
  if (!stored) {
    await hydrateCommercialSnapshotById(binding.snapshotId);
    stored = commercialSnapshotService.get(binding.snapshotId);
  }
  if (!stored) {
    commercialAdoptionObservability.recordLegacyLookup(
      `snapshot_row_missing:${binding.snapshotId}`
    );
    return {
      source: "missing",
      snapshot: null,
      featureKeys: [],
      limits: [],
    };
  }
  const payload = stored.payload;
  return {
    source: "snapshot",
    snapshot: payload,
    featureKeys: payload.includedFeatures
      .filter((f) => f.included)
      .map((f) => f.featureKey),
    limits: payload.usageLimits,
  };
}

export function getAdoptionObservability() {
  return {
    ...commercialAdoptionObservability.snapshot(
      COMMERCIAL_CATALOG_ADOPTION_CONSUMERS.length
    ),
    runtimeAuthority: commercialRuntimeAuthorityObservability.snapshot(),
  };
}

export function resolveLegacyPlanIdFromVersion(
  planVersionId: string
): number | null {
  const version = planVersionService.get(planVersionId);
  if (!version) return null;
  const plan = planService.get(version.planId);
  if (!plan) return null;
  return bridgeByCatalogPlanCode(plan.code)?.legacyPlanId ?? null;
}

export function resolvePlanVersionIdFromLegacyPlanId(
  legacyPlanId: number
): string | null {
  const bridge = bridgeByLegacyPlanId(legacyPlanId);
  if (!bridge) return null;
  const plan = planService
    .list()
    .find((p) => p.code === bridge.catalogPlanCode);
  if (!plan) return null;
  const version = planVersionService
    .list(plan.id)
    .find(
      (v) =>
        v.state === "published" && v.versionCode === bridge.versionCode
    );
  return version?.id ?? null;
}
