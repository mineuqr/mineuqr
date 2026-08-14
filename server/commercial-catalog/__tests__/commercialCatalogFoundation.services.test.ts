/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — service behavior tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  CommercialCatalogStore,
  PlanService,
  PricingService,
  FeatureBundleService,
  LimitProfileService,
  PlanSaveValidator,
  CommercialCatalogError,
} from "../../services/commercial-catalog";

describe("Live Commercial Plan services", () => {
  let store: CommercialCatalogStore;
  let plans: PlanService;
  let pricing: PricingService;
  let bundles: FeatureBundleService;
  let limits: LimitProfileService;
  let validator: PlanSaveValidator;

  beforeEach(() => {
    store = new CommercialCatalogStore();
    plans = new PlanService(store);
    pricing = new PricingService(store);
    bundles = new FeatureBundleService(store);
    limits = new LimitProfileService(store);
    validator = new PlanSaveValidator(store);
  });

  it("refuses incomplete live-plan save", async () => {
    const plan = plans.create({ code: "basic", name: "Basic" });
    await expect(plans.saveLive(plan.id, { name: "Basic+" }, {}, { skipPersist: true })).rejects.toThrow(
      CommercialCatalogError
    );
  });

  it("saves atomically when pricing, bundle, and limits exist", async () => {
    const plan = plans.create({ code: "professional", name: "Professional" });
    const cycle = pricing.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    const bundle = bundles.create({
      code: "pro-features",
      name: "Pro Features",
      features: [{ featureKey: "ordering" }],
    });
    const profile = limits.create({
      code: "pro-limits",
      name: "Pro Limits",
      values: [{ limitKey: "restaurants", value: 5 }],
    });
    pricing.create({
      planId: plan.id,
      billingCycleId: cycle.id,
      currency: "USD",
      amount: "26.40",
    });
    const saved = await plans.saveLive(
      plan.id,
      { featureBundleId: bundle.id, limitProfileId: profile.id },
      {},
      { skipPersist: true }
    );
    expect(saved.featureBundleId).toBe(bundle.id);
    expect(validator.validate(plan.id).ok).toBe(true);
    expect(pricing.currentPriceForPlan(plan.id, "monthly")?.amount).toBe("26.40");
  });

  it("rolls back in-memory plan when validation fails", async () => {
    const plan = plans.create({
      code: "enterprise",
      name: "Enterprise",
      featureBundleId: null,
    });
    await expect(
      plans.saveLive(plan.id, { name: "Enterprise Cloud" }, {}, { skipPersist: true })
    ).rejects.toThrow(CommercialCatalogError);
    expect(plans.get(plan.id)?.name).toBe("Enterprise");
  });

  it("rolls back prices when live save validation fails", async () => {
    const plan = plans.create({ code: "basic", name: "Basic" });
    const cycle = pricing.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    pricing.create({
      planId: plan.id,
      billingCycleId: cycle.id,
      currency: "USD",
      amount: "0.00",
    });
    await expect(
      plans.saveLive(
        plan.id,
        { name: "Basic+" },
        {},
        {
          skipPersist: true,
          prices: [
            {
              billingCycleId: cycle.id,
              currency: "USD",
              amount: "9.00",
            },
          ],
        }
      )
    ).rejects.toThrow(CommercialCatalogError);
    expect(pricing.currentPriceForPlan(plan.id, "monthly")?.amount).toBe("0.00");
    expect(plans.get(plan.id)?.name).toBe("Basic");
  });
});
