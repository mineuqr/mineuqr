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
import { z } from "zod";
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

  return {
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
        id: string;
        planCode: string;
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
  if (!offerings.length) {
    return { source: "catalog", plans: [] };
  }

  return {
    source: "catalog",
    plans: offerings.map((o, idx) => {
      const restaurants =
        o.limits.find((l) => l.limitKey === "restaurants")?.value ?? 1;
      const items = o.limits.find((l) => l.limitKey === "items")?.value ?? 100;
      const categories =
        o.limits.find((l) => l.limitKey === "categories")?.value ?? 10;
      return {
        id: o.planId,
        planCode: o.planCode,
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
}> {
  await ensureCatalogReady();
  const offerings = await listLivePlanOfferings();
  const professional =
    offerings.find((o) => o.planCode === "professional") ??
    offerings.find((o) => o.trialDurationDays != null) ??
    offerings[0];

  const duration =
    professional?.trialDurationDays ??
    trialPolicyCatalogService.list().find((t) => t.code.includes("14"))
      ?.durationDays ??
    14;

  return {
    durationDays: duration,
    trialPolicyId: professional?.trialPolicyId ?? null,
    professionalPlanId: professional?.planId ?? null,
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
  planId: string;
  event: CommercialPlanBindEvent;
  actorId?: number | null;
  regionId?: string | null;
}): Promise<{ planId: string } | null> {
  try {
    await ensureCatalogReady();
    if (!isLivePlanUuid(input.planId) || !planService.get(input.planId)) {
      commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
        `no_live_plan:${input.planId}`
      );
      return null;
    }
    const created = await bindSubscriptionToLivePlan({
      subscriptionId: input.subscriptionId,
      planId: input.planId,
      legacyPlanId: null,
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

function catalogCodeFromPlanRef(
  planRef: number | string | null | undefined
): string | null {
  if (planRef == null) return null;
  if (typeof planRef === "string" && isLivePlanUuid(planRef)) {
    return planService.get(planRef)?.code ?? null;
  }
  return null;
}

export function classifyPlanTransitionEvent(
  previousPlanId: number | string | null | undefined,
  nextPlanId: number | string
): CommercialPlanBindEvent {
  if (previousPlanId == null || previousPlanId === nextPlanId) {
    return "renewal";
  }
  const order = ["basic", "professional", "enterprise"] as const;
  const prevCode = catalogCodeFromPlanRef(previousPlanId);
  const nextCode = catalogCodeFromPlanRef(nextPlanId);
  const pi = prevCode ? order.indexOf(prevCode as (typeof order)[number]) : -1;
  const ni = nextCode ? order.indexOf(nextCode as (typeof order)[number]) : -1;
  if (pi >= 0 && ni >= 0) {
    if (ni > pi) return "upgrade";
    if (ni < pi) return "downgrade";
    return "renewal";
  }
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

/** Unbound UUID path — Live Plan capabilities without a binding. */
export async function resolveLivePlanCapabilitiesByPlanId(planId: string): Promise<{
  source: "live_plan" | "missing";
  planId: string | null;
  catalogPlanCode: string | null;
  featureKeys: string[];
  limits: { limitKey: string; value: number | null; unit: string | null }[];
}> {
  await ensureCatalogReady();
  if (!isLivePlanUuid(planId)) {
    return {
      source: "missing",
      planId: null,
      catalogPlanCode: null,
      featureKeys: [],
      limits: [],
    };
  }
  const plan = planService.get(planId);
  if (!plan) {
    return {
      source: "missing",
      planId,
      catalogPlanCode: null,
      featureKeys: [],
      limits: [],
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

export type LivePlanDisplay = {
  id: number;
  nameEn: string;
  nameAr: string;
};

/**
 * COMMERCIAL-SUBSCRIPTION-PLANS-LEGACY-RESIDUAL-CLEANUP-1
 * Display name from Live Plan (or bridge identity label). Never reads the legacy plan table.
 */
export async function resolveLivePlanDisplayByLegacyId(
  legacyPlanId: number
): Promise<LivePlanDisplay | null> {
  const bridge = bridgeByLegacyPlanId(legacyPlanId);
  if (!bridge) return null;
  try {
    await ensureCatalogReady();
    const plan = planService.getByCode(bridge.catalogPlanCode);
    if (plan?.name) {
      return { id: legacyPlanId, nameEn: plan.name, nameAr: plan.name };
    }
  } catch {
    /* catalog unavailable — identity label only */
  }
  return {
    id: legacyPlanId,
    nameEn: bridge.catalogPlanName,
    nameAr: bridge.catalogPlanName,
  };
}

/**
 * Compatibility plan view for subscription DTOs. Live Plan catalog only.
 * Returns null when the integer id is unknown — no legacy table fallback.
 */
export async function resolveSubscriptionPlanView(
  planRef: number | string
) {
  const legacy = parseLegacyPlanInteger(planRef);
  if (legacy != null) {
    const catalogPlanId = resolvePlanIdFromLegacyPlanId(legacy);
    const display = await resolveLivePlanDisplayByLegacyId(legacy);
    if (!display && !catalogPlanId) return null;
    return {
      id: catalogPlanId ?? String(display?.id ?? legacy),
      planCode: bridgeByLegacyPlanId(legacy)?.catalogPlanCode ?? null,
      nameEn: display?.nameEn ?? "Unknown",
      nameAr: display?.nameAr ?? "Unknown",
      descriptionEn: display?.nameEn ?? null,
      descriptionAr: display?.nameAr ?? null,
      priceMonthly: null as string | null,
      priceYearly: null as string | null,
      maxRestaurants: null as number | null,
      maxItemsPerRestaurant: null as number | null,
      maxCategories: null as number | null,
      features: null as string | null,
      featuresAr: null as string | null,
      isActive: true,
      sortOrder: 0,
      catalogPlanId,
    };
  }
  if (typeof planRef === "string" && isLivePlanUuid(planRef)) {
    await ensureCatalogReady();
    const plan = planService.get(planRef);
    if (!plan) return null;
    return {
      id: plan.id,
      planCode: plan.code,
      nameEn: plan.name,
      nameAr: plan.name,
      descriptionEn: plan.description ?? plan.name,
      descriptionAr: plan.description ?? plan.name,
      priceMonthly: null as string | null,
      priceYearly: null as string | null,
      maxRestaurants: null as number | null,
      maxItemsPerRestaurant: null as number | null,
      maxCategories: null as number | null,
      features: null as string | null,
      featuresAr: null as string | null,
      isActive: !plan.isHidden,
      sortOrder: plan.sortOrder,
      catalogPlanId: plan.id,
    };
  }
  return null;
}

export function isKnownLegacyPlanId(legacyPlanId: number): boolean {
  return bridgeByLegacyPlanId(legacyPlanId) != null;
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

const LIVE_PLAN_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLivePlanUuid(value: string): boolean {
  return LIVE_PLAN_UUID_RE.test(value);
}

/** Public/admin plan identity input — canonical Live Plan UUID only. */
export const livePlanUuidInput = z
  .string()
  .refine((value) => isLivePlanUuid(value), { message: "invalid_live_plan_id" });

/**
 * Webhook dual-read: UUID or leftover integer handle.
 * Returns null for malformed values (caller fail-closes).
 */
export function parseWebhookPlanRef(raw: unknown): number | string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  const text = String(raw).trim();
  if (isLivePlanUuid(text)) return text;
  if (/^\d+$/.test(text)) return Number(text);
  return null;
}

export function parseLegacyPlanInteger(
  planRef: number | string
): number | null {
  if (typeof planRef === "number" && Number.isInteger(planRef)) return planRef;
  if (typeof planRef === "string" && /^\d+$/.test(planRef)) return Number(planRef);
  return null;
}

/**
 * COMMERCIAL-OD-2 — resolve a checkout/admin/trial handle to commercial_plans.id.
 * Accepts a Live Plan UUID or a bridged legacy integer. Fail closed otherwise.
 */
export async function resolveLivePlanById(planId: string): Promise<string> {
  await ensureCatalogReady();
  if (!isLivePlanUuid(planId)) {
    throw new Error("invalid_live_plan_id");
  }
  const plan = planService.get(planId);
  if (!plan) {
    throw new Error(`unknown_live_plan:${planId}`);
  }
  return plan.id;
}

/** Webhook dual-read only. Public/admin/checkout must use resolveLivePlanById. */
export async function resolveCanonicalLivePlanId(
  planRef: number | string
): Promise<string> {
  await ensureCatalogReady();
  if (typeof planRef === "string" && isLivePlanUuid(planRef)) {
    return resolveLivePlanById(planRef);
  }
  const legacy = parseLegacyPlanInteger(planRef);
  if (legacy == null) {
    throw new Error("invalid_plan_ref");
  }
  const id = resolvePlanIdFromLegacyPlanId(legacy);
  if (!id) {
    throw new Error(`unmapped_legacy_plan:${legacy}`);
  }
  return id;
}

export async function resolveLivePlanDisplayByPlanRef(
  planRef: number | string
): Promise<LivePlanDisplay | null> {
  const legacy = parseLegacyPlanInteger(planRef);
  if (legacy != null) {
    return resolveLivePlanDisplayByLegacyId(legacy);
  }
  if (typeof planRef === "string" && isLivePlanUuid(planRef)) {
    try {
      await ensureCatalogReady();
      const plan = planService.get(planRef);
      if (!plan) return null;
      const legacyId = bridgeByCatalogPlanCode(plan.code)?.legacyPlanId ?? 0;
      return { id: legacyId, nameEn: plan.name, nameAr: plan.name };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * COMMERCIAL-SUBSCRIPTION-PLANS-CONSOLIDATION-1
 * Checkout offer from Live Plan only. Does not read subscription_plans.
 * Public identity is the Live Plan UUID.
 */
export type LivePlanCheckoutOffer = {
  planId: string;
  planCode: string;
  commercialName: string;
  amount: string;
  currency: string;
  billingCycleCode: "monthly" | "yearly";
};

export async function resolveCheckoutOfferFromLivePlan(
  planRef: string,
  billingCycle: "monthly" | "yearly"
): Promise<LivePlanCheckoutOffer | null> {
  await ensureCatalogReady();
  let planId: string;
  try {
    planId = await resolveLivePlanById(planRef);
  } catch {
    return null;
  }
  const plan = planService.get(planId);
  if (!plan || plan.isHidden) return null;
  const price = pricingService.currentPriceForPlan(planId, billingCycle);
  if (!price?.amount) return null;
  return {
    planId: plan.id,
    planCode: plan.code,
    commercialName: plan.name,
    amount: price.amount,
    currency: price.currency || COMMERCIAL_CANONICAL_CURRENCY,
    billingCycleCode: billingCycle,
  };
}

