/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Consumer-facing adoption APIs — live Catalog SSOT.
 * Capabilities resolve from the current plan. Charged terms freeze billed price.
 */

import {
  COMMERCIAL_CANONICAL_CURRENCY,
  COMMERCIAL_CATALOG_ADOPTION_CONSUMERS,
  type CommercialChargedTerms,
} from "@shared/commercial-catalog";
import { commercialCatalogStore } from "./CatalogStore";
import {
  planService,
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

export type CommercialPlanBindEvent =
  | "plan_selected"
  | "trial_activated"
  | "upgrade"
  | "downgrade"
  | "renewal";

export type LivePlanOffering = {
  legacyPlanId: number | null;
  planId: string;
  planCode: string;
  planName: string;
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
  planId: string;
  chargedAmount: string | null;
  chargedCurrency: string | null;
  billingCycleId: string | null;
  billingCycleCode: string | null;
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

export function invalidateCatalogReadyGate(): void {
  ensurePromise = null;
}

function offeringFromPlan(plan: {
  id: string;
  code: string;
  name: string;
  isHidden: boolean;
  featureBundleId: string | null;
  limitProfileId: string | null;
  trialPolicyId: string | null;
}): LivePlanOffering | null {
  if (plan.isHidden) return null;
  const prices = pricingService.list(plan.id);
  const cycles = pricingService.listBillingCycles();
  const monthlyCycle = cycles.find((c) => c.code === "monthly");
  const yearlyCycle = cycles.find((c) => c.code === "yearly");
  const monthly = prices.find((p) => p.billingCycleId === monthlyCycle?.id && !p.regionId);
  const yearly = prices.find((p) => p.billingCycleId === yearlyCycle?.id && !p.regionId);
  const features = plan.featureBundleId
    ? [...commercialCatalogStore.bundleFeatures.values()].filter(
        (f) => f.bundleId === plan.featureBundleId && f.included
      )
    : [];
  const limits = plan.limitProfileId
    ? [...commercialCatalogStore.limitValues.values()].filter(
        (l) => l.profileId === plan.limitProfileId
      )
    : [];
  const trial = plan.trialPolicyId
    ? trialPolicyCatalogService.get(plan.trialPolicyId)
    : null;
  const bridge = bridgeByCatalogPlanCode(plan.code);

  return {
    legacyPlanId: bridge?.legacyPlanId ?? null,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    currency:
      monthly?.currency ?? yearly?.currency ?? COMMERCIAL_CANONICAL_CURRENCY,
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
  };
}

export async function listLivePlanOfferings(): Promise<LivePlanOffering[]> {
  await ensureCatalogReady();
  const offerings: LivePlanOffering[] = [];
  for (const plan of planService.list()) {
    const offering = offeringFromPlan(plan);
    if (offering) {
      offerings.push(offering);
      commercialAdoptionObservability.recordPlanAdoption();
    }
  }
  return offerings.sort((a, b) => a.planCode.localeCompare(b.planCode));
}

/** Alias — live plans are the selectable catalog. */
export const listPublishedPlanOfferings = listLivePlanOfferings;

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
        catalogPlanId: string;
      }>;
    }
  | { source: "legacy_required" }
> {
  const offerings = await listLivePlanOfferings();
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
        descriptionEn: o.planName,
        descriptionAr: o.planName,
        priceMonthly: o.priceMonthly ?? "0.00",
        priceYearly: o.priceYearly,
        maxRestaurants: restaurants ?? 1,
        maxItemsPerRestaurant: items ?? 100,
        maxCategories: categories ?? 10,
        features: JSON.stringify(o.featureKeys),
        featuresAr: JSON.stringify(o.featureKeys),
        isActive: true,
        sortOrder: idx + 1,
        catalogPlanId: o.planId,
      };
    }),
  };
}

export async function resolveTrialPolicyFromCatalog(): Promise<{
  durationDays: number;
  trialPolicyId: string | null;
  professionalPlanId: string | null;
  legacyPlanId: number;
}> {
  await ensureCatalogReady();
  const offerings = await listLivePlanOfferings();
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
    professionalPlanId: professional?.planId ?? null,
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

function chargedTermsForPlan(
  planId: string,
  billingCycleCode = "monthly",
  regionId?: string | null
): CommercialChargedTerms | null {
  const plan = planService.get(planId);
  if (!plan) return null;
  const price = pricingService.currentPriceForPlan(
    planId,
    billingCycleCode,
    regionId
  );
  const cycle =
    pricingService.listBillingCycles().find((c) => c.code === billingCycleCode) ??
    (price
      ? pricingService.listBillingCycles().find((c) => c.id === price.billingCycleId)
      : null);
  if (!price || !cycle) return null;
  return {
    planId: plan.id,
    catalogPlanCode: plan.code,
    commercialName: plan.name,
    chargedAmount: price.amount,
    chargedCurrency: price.currency,
    billingCycleId: cycle.id,
    billingCycleCode: cycle.code,
    intervalCount: cycle.intervalCount,
    intervalUnit: cycle.intervalUnit,
    periodStart: null,
    periodEnd: null,
  };
}

function auditEventForBind(event: CommercialPlanBindEvent) {
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

/**
 * Bind a subscription to a live plan.
 * Renewal (event=renewal) records CURRENT plan price as charged terms.
 * Other events also capture current price at bind time; later price edits do not rewrite it.
 */
export async function bindSubscriptionToLivePlan(input: {
  subscriptionId: number;
  planId: string;
  legacyPlanId?: number | null;
  regionId?: string | null;
  billingCycleCode?: string;
  actorId?: number | null;
  event: CommercialPlanBindEvent;
}): Promise<{ planId: string; chargedTerms: CommercialChargedTerms | null }> {
  await ensureCatalogReady();
  const plan = planService.get(input.planId);
  if (!plan) {
    throw new Error(`Live plan ${input.planId} not found`);
  }
  const charged = chargedTermsForPlan(
    input.planId,
    input.billingCycleCode ?? "monthly",
    input.regionId
  );

  const binding: SubscriptionCatalogBinding = {
    subscriptionId: input.subscriptionId,
    planId: input.planId,
    chargedAmount: charged?.chargedAmount ?? null,
    chargedCurrency: charged?.chargedCurrency ?? null,
    billingCycleId: charged?.billingCycleId ?? null,
    billingCycleCode: charged?.billingCycleCode ?? null,
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
          planId: binding.planId,
          chargedAmount: binding.chargedAmount,
          chargedCurrency: binding.chargedCurrency,
          billingCycleId: binding.billingCycleId,
          billingCycleCode: binding.billingCycleCode,
          legacyPlanId: binding.legacyPlanId,
          createdAt: binding.createdAt,
          updatedAt: nowIso(),
        })
        .onDuplicateKeyUpdate({
          set: {
            planId: binding.planId,
            chargedAmount: binding.chargedAmount,
            chargedCurrency: binding.chargedCurrency,
            billingCycleId: binding.billingCycleId,
            billingCycleCode: binding.billingCycleCode,
            legacyPlanId: binding.legacyPlanId,
            updatedAt: nowIso(),
          },
        });
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
      planId: input.planId,
      event: input.event,
      chargedAmount: charged?.chargedAmount ?? null,
    },
    metadata: { event: input.event },
  });

  return { planId: input.planId, chargedTerms: charged };
}

export async function ensureLivePlanBoundForSubscription(input: {
  subscriptionId: number;
  legacyPlanId: number;
  event: CommercialPlanBindEvent;
  actorId?: number | null;
  regionId?: string | null;
}): Promise<{ planId: string } | null> {
  try {
    await ensureCatalogReady();
    const planId = resolvePlanIdFromLegacyPlanId(input.legacyPlanId);
    if (!planId) {
      commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
        `no_live_plan:${input.legacyPlanId}`
      );
      return null;
    }
    const created = await bindSubscriptionToLivePlan({
      subscriptionId: input.subscriptionId,
      planId,
      legacyPlanId: input.legacyPlanId,
      regionId: input.regionId,
      actorId: input.actorId,
      event: input.event,
    });
    return { planId: created.planId };
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
): CommercialPlanBindEvent {
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
      planId: row.planId,
      chargedAmount: row.chargedAmount != null ? String(row.chargedAmount) : null,
      chargedCurrency: row.chargedCurrency ?? null,
      billingCycleId: row.billingCycleId ?? null,
      billingCycleCode: row.billingCycleCode ?? null,
      legacyPlanId: row.legacyPlanId ?? null,
      createdAt: String(row.createdAt),
    };
  } catch {
    return null;
  }
}

/**
 * Runtime capabilities from the LIVE plan bound to the subscription.
 */
export async function resolveLivePlanCapabilities(subscriptionId: number): Promise<{
  source: "live_plan" | "missing";
  planId: string | null;
  catalogPlanCode: string | null;
  featureKeys: string[];
  limits: { limitKey: string; value: number | null; unit: string | null }[];
  chargedTerms: CommercialChargedTerms | null;
}> {
  await ensureCatalogReady();
  const binding = await getSubscriptionCommercialBinding(subscriptionId);
  if (!binding) {
    commercialAdoptionObservability.recordLegacyLookup(
      `binding_missing:${subscriptionId}`
    );
    return {
      source: "missing",
      planId: null,
      catalogPlanCode: null,
      featureKeys: [],
      limits: [],
      chargedTerms: null,
    };
  }

  const plan = planService.get(binding.planId);
  if (!plan) {
    commercialAdoptionObservability.recordLegacyLookup(
      `live_plan_missing:${binding.planId}`
    );
    return {
      source: "missing",
      planId: binding.planId,
      catalogPlanCode: null,
      featureKeys: [],
      limits: [],
      chargedTerms: null,
    };
  }

  const features = plan.featureBundleId
    ? [...commercialCatalogStore.bundleFeatures.values()].filter(
        (f) => f.bundleId === plan.featureBundleId && f.included
      )
    : [];
  const limits = plan.limitProfileId
    ? [...commercialCatalogStore.limitValues.values()].filter(
        (l) => l.profileId === plan.limitProfileId
      )
    : [];
  const cycle = binding.billingCycleId
    ? pricingService.listBillingCycles().find((c) => c.id === binding.billingCycleId)
    : pricingService.listBillingCycles().find((c) => c.code === (binding.billingCycleCode ?? "monthly"));

  const chargedTerms: CommercialChargedTerms | null =
    binding.chargedAmount && binding.chargedCurrency && cycle
      ? {
          planId: plan.id,
          catalogPlanCode: plan.code,
          commercialName: plan.name,
          chargedAmount: binding.chargedAmount,
          chargedCurrency: binding.chargedCurrency,
          billingCycleId: cycle.id,
          billingCycleCode: cycle.code,
          intervalCount: cycle.intervalCount,
          intervalUnit: cycle.intervalUnit,
          periodStart: null,
          periodEnd: null,
        }
      : null;

  return {
    source: "live_plan",
    planId: plan.id,
    catalogPlanCode: plan.code,
    featureKeys: features.map((f) => f.featureKey),
    limits: limits.map((l) => ({
      limitKey: l.limitKey,
      value: l.value,
      unit: l.unit,
    })),
    chargedTerms,
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

export function resolveLegacyPlanIdFromPlan(planId: string): number | null {
  const plan = planService.get(planId);
  if (!plan) return null;
  return bridgeByCatalogPlanCode(plan.code)?.legacyPlanId ?? null;
}

export function resolvePlanIdFromLegacyPlanId(
  legacyPlanId: number
): string | null {
  const bridge = bridgeByLegacyPlanId(legacyPlanId);
  if (!bridge) return null;
  return planService.getByCode(bridge.catalogPlanCode)?.id ?? null;
}

/**
 * COMMERCIAL-SUBSCRIPTION-PLANS-CONSOLIDATION-1
 * Checkout offer from Live Plan only. Does not read subscription_plans.
 * `legacyPlanId` is a compatibility handle, not a price authority.
 */
export type LivePlanCheckoutOffer = {
  legacyPlanId: number;
  planId: string;
  planCode: string;
  commercialName: string;
  amount: string;
  currency: string;
  billingCycleCode: "monthly" | "yearly";
};

export async function resolveCheckoutOfferFromLivePlan(
  legacyPlanId: number,
  billingCycle: "monthly" | "yearly"
): Promise<LivePlanCheckoutOffer | null> {
  await ensureCatalogReady();
  const planId = resolvePlanIdFromLegacyPlanId(legacyPlanId);
  if (!planId) return null;
  const plan = planService.get(planId);
  if (!plan || plan.isHidden) return null;
  const price = pricingService.currentPriceForPlan(planId, billingCycle);
  if (!price?.amount) return null;
  return {
    legacyPlanId,
    planId: plan.id,
    planCode: plan.code,
    commercialName: plan.name,
    amount: price.amount,
    currency: price.currency || COMMERCIAL_CANONICAL_CURRENCY,
    billingCycleCode: billingCycle,
  };
}
