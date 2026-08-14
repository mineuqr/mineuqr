/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Public catalog read model — live plans that are not hidden.
 * NEVER used as invoice/payment authority.
 */

import {
  PUBLIC_OFFERING_SCHEMA_VERSION,
  visibilityForLivePlan,
  type PublicCatalogOffering,
  COMMERCIAL_CANONICAL_CURRENCY,
} from "@shared/commercial-catalog";
import { normalizeFeatureKeysForProjection } from "@shared/commercial-capability";
import {
  CommercialCatalogError,
  planService,
  pricingService,
  trialPolicyCatalogService,
  commercialCatalogStore,
} from "../../services/commercial-catalog";
import { bridgeByCatalogPlanCode } from "../../services/commercial-catalog/legacyPlanBridge";
import { ensureCatalogReady } from "../../services/commercial-catalog/adoptionService";
import {
  getPublicCatalogCache,
  setPublicCatalogCache,
} from "./publicCatalogCache";

function buildOffering(planId: string): PublicCatalogOffering | null {
  const plan = planService.get(planId);
  if (!plan || plan.isHidden) return null;

  const prices = pricingService.list(plan.id);
  const cycles = pricingService.listBillingCycles();
  const monthlyCycle = cycles.find((c) => c.code === "monthly");
  const yearlyCycle = cycles.find((c) => c.code === "yearly");
  const monthly = prices.find(
    (p) => p.billingCycleId === monthlyCycle?.id && !p.regionId
  );
  const yearly = prices.find(
    (p) => p.billingCycleId === yearlyCycle?.id && !p.regionId
  );
  const features = plan.featureBundleId
    ? Array.from(commercialCatalogStore.bundleFeatures.values()).filter(
        (f) => f.bundleId === plan.featureBundleId && f.included
      )
    : [];
  const limits = plan.limitProfileId
    ? Array.from(commercialCatalogStore.limitValues.values()).filter(
        (l) => l.profileId === plan.limitProfileId
      )
    : [];
  const trial = plan.trialPolicyId
    ? trialPolicyCatalogService.get(plan.trialPolicyId)
    : null;
  const bridge = bridgeByCatalogPlanCode(plan.code);

  return {
    schemaVersion: PUBLIC_OFFERING_SCHEMA_VERSION,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    visibility: visibilityForLivePlan({ isHidden: plan.isHidden }),
    currency:
      monthly?.currency ?? yearly?.currency ?? COMMERCIAL_CANONICAL_CURRENCY,
    priceMonthly: monthly?.amount ?? null,
    priceYearly: yearly?.amount ?? null,
    featureKeys: normalizeFeatureKeysForProjection(
      features.map((f) => f.featureKey)
    ),
    limits: limits.map((l) => ({
      limitKey: l.limitKey,
      value: l.value,
      unit: l.unit,
    })),
    trialDurationDays: trial?.durationDays ?? null,
    legacyPlanId: bridge?.legacyPlanId ?? null,
    updatedAt: plan.updatedAt,
  };
}

export function projectPublicCatalogOfferings(): PublicCatalogOffering[] {
  const cached = getPublicCatalogCache();
  if (cached) return cached;

  const offerings: PublicCatalogOffering[] = [];
  for (const plan of planService.list()) {
    const offering = buildOffering(plan.id);
    if (offering) offerings.push(offering);
  }
  offerings.sort((a, b) => a.planCode.localeCompare(b.planCode));
  setPublicCatalogCache(offerings);
  return offerings;
}

export async function listPublicCatalogOfferings(): Promise<
  PublicCatalogOffering[]
> {
  await ensureCatalogReady();
  return projectPublicCatalogOfferings();
}

export function projectPublicCatalogOffering(planId: string): PublicCatalogOffering {
  const offering = buildOffering(planId);
  if (!offering) {
    throw new CommercialCatalogError(
      "Offering is not publicly accessible",
      "not_found"
    );
  }
  return offering;
}

export async function getPublicCatalogOffering(
  planId: string
): Promise<PublicCatalogOffering> {
  await ensureCatalogReady();
  return projectPublicCatalogOffering(planId);
}

export function assertPublicCatalogNotEntitlementAuthority(): {
  entitlementAuthority: "subscription-runtime";
  publishedCatalogParticipatesInEntitlement: false;
} {
  return {
    entitlementAuthority: "subscription-runtime",
    publishedCatalogParticipatesInEntitlement: false,
  };
}
