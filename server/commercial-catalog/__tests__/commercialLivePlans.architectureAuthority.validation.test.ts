/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — Architecture Authority mandatory tests.
 * In-memory catalog only. Does not write production subscription rows.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  commercialCatalogStore,
  planService,
  pricingService,
  featureBundleService,
  limitProfileService,
  setDurableLivePlanBackendForTests,
  InMemoryDurableCatalogBackend,
  invalidateCatalogReadyGate,
} from "../../services/commercial-catalog";
import { resolveEntitlementsFromLivePlan } from "../../subscription-runtime/entitlementResolver";
import { syncCommercialLifecycle } from "../../subscription-runtime/lifecycleSync";
import { COMMERCIAL_CAPABILITY_FILTER_KEYS } from "@shared/commercial-capability";

const NOW = new Date("2026-08-14T12:00:00.000Z");

function includedKeys(bundleId: string) {
  return featureBundleService
    .listFeatures(bundleId)
    .filter((f) => f.included)
    .map((f) => f.featureKey);
}

function seedProfessional() {
  const monthly = pricingService.createBillingCycle({
    code: "monthly",
    name: "Monthly",
    intervalCount: 1,
    intervalUnit: "month",
  });
  const bundle = featureBundleService.create({
    code: "pro-bundle",
    name: "Professional bundle",
    features: COMMERCIAL_CAPABILITY_FILTER_KEYS.map((featureKey) => ({
      featureKey,
      included: featureKey === "ordering" || featureKey === "reporting",
    })),
  });
  const profile = limitProfileService.create({
    code: "pro-limits",
    name: "Professional limits",
    values: [{ limitKey: "restaurants", value: 5 }],
  });
  const plan = planService.create({
    code: "professional",
    name: "Professional",
    featureBundleId: bundle.id,
    limitProfileId: profile.id,
  });
  pricingService.create({
    planId: plan.id,
    billingCycleId: monthly.id,
    currency: "SAR",
    amount: "100.00",
  });
  return { plan, bundle, monthly };
}

function entitlementsFor(planId: string, catalogPlanCode: string, featureKeys: string[]) {
  return resolveEntitlementsFromLivePlan({
    ownerId: 1,
    role: "user",
    planId,
    catalogPlanCode,
    featureKeys,
    limits: [{ limitKey: "restaurants", value: 5 }],
    chargedTerms: null,
    legacyPlanId: 30002,
    lifecycle: syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    }),
    dbStatus: "active",
    trialEndsAt: null,
    currentPeriodEnd: "2026-12-01T00:00:00.000Z",
    now: NOW,
  });
}

describe("Architecture Authority — live plan capability propagation", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("subscribers A and B see a newly included capability without version or snapshot", async () => {
    const { plan, bundle } = seedProfessional();
    await planService.saveLive(
      plan.id,
      { featureBundleId: bundle.id, limitProfileId: plan.limitProfileId },
      {},
      { skipPersist: true }
    );

    const keysBefore = includedKeys(plan.featureBundleId!);
    const aBefore = entitlementsFor(plan.id, "professional", keysBefore);
    const bBefore = entitlementsFor(plan.id, "professional", keysBefore);
    expect(aBefore.entitlements.features.kitchen).toBe(false);
    expect(bBefore.entitlements.features.kitchen).toBe(false);

    const nextBundle = featureBundleService.create({
      code: "pro-bundle-kitchen",
      name: "Professional bundle + kitchen",
      features: COMMERCIAL_CAPABILITY_FILTER_KEYS.map((featureKey) => ({
        featureKey,
        included:
          featureKey === "ordering" ||
          featureKey === "reporting" ||
          featureKey === "kitchen",
      })),
    });
    await planService.saveLive(
      plan.id,
      { featureBundleId: nextBundle.id },
      {},
      { skipPersist: true }
    );

    const keysAfter = includedKeys(planService.get(plan.id)!.featureBundleId!);
    const aAfter = entitlementsFor(plan.id, "professional", keysAfter);
    const bAfter = entitlementsFor(plan.id, "professional", keysAfter);
    expect(keysAfter).toContain("kitchen");
    expect(aAfter.entitlements.features.kitchen).toBe(true);
    expect(bAfter.entitlements.features.kitchen).toBe(true);
    expect(aAfter.meta.commercialResolutionSource).toBe("live_plan");
    expect(bAfter.meta.commercialResolutionSource).toBe("live_plan");
  });
});

describe("Architecture Authority — charged price vs live list price", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("keeps a captured 100 SAR list price distinct from a later 150 SAR live price", async () => {
    const { plan, monthly } = seedProfessional();
    const chargedAtBind = pricingService.currentPriceForPlan(plan.id, "monthly");
    expect(chargedAtBind?.amount).toBe("100.00");
    expect(chargedAtBind?.currency).toBe("SAR");

    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        skipPersist: true,
        prices: [
          {
            billingCycleId: monthly.id,
            currency: "SAR",
            amount: "150.00",
          },
        ],
      }
    );
    expect(pricingService.currentPriceForPlan(plan.id, "monthly")?.amount).toBe(
      "150.00"
    );
    expect(chargedAtBind?.amount).toBe("100.00");
  });
});
