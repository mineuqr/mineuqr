/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — public live catalog.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { visibilityForLivePlan } from "@shared/commercial-catalog";
import {
  commercialCatalogStore,
  planService,
  pricingService,
  featureBundleService,
  limitProfileService,
  setDurableLivePlanBackendForTests,
  InMemoryDurableCatalogBackend,
  invalidateCatalogReadyGate,
  CommercialCatalogError,
} from "../../services/commercial-catalog";
import {
  invalidatePublicCatalogCache,
  projectPublicCatalogOfferings,
  projectPublicCatalogOffering,
  assertPublicCatalogNotEntitlementAuthority,
} from "../publishing";

describe("Public live catalog", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("hides hidden plans and lists live plans", async () => {
    const plan = planService.create({
      code: "professional",
      name: "Professional",
    });
    const cycle = pricingService.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    const bundle = featureBundleService.create({
      code: "pro-f",
      name: "Pro",
      features: [{ featureKey: "ordering" }],
    });
    const profile = limitProfileService.create({
      code: "pro-l",
      name: "Pro L",
      values: [{ limitKey: "restaurants", value: 3 }],
    });
    pricingService.create({
      planId: plan.id,
      billingCycleId: cycle.id,
      currency: "USD",
      amount: "26.40",
    });
    await planService.saveLive(plan.id, {
      featureBundleId: bundle.id,
      limitProfileId: profile.id,
    });
    const list = projectPublicCatalogOfferings();
    expect(list[0]!.planId).toBe(plan.id);
    expect(list[0]!.planCode).toBe("professional");
    expect(
      visibilityForLivePlan({ isHidden: false }).publiclyBrowsable
    ).toBe(true);

    await planService.saveLive(plan.id, { isHidden: true });
    invalidatePublicCatalogCache();
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    expect(() => projectPublicCatalogOffering(plan.id)).toThrow(
      CommercialCatalogError
    );
  });

  it("is not entitlement authority", () => {
    const marker = assertPublicCatalogNotEntitlementAuthority();
    expect(marker.entitlementAuthority).toBe("subscription-runtime");
    expect(marker.publishedCatalogParticipatesInEntitlement).toBe(false);
  });
});
