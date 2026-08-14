/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — durable live-plan save.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  commercialCatalogStore,
  PlanService,
  PricingService,
  FeatureBundleService,
  LimitProfileService,
  InMemoryDurableCatalogBackend,
  setDurableLivePlanBackendForTests,
  persistLivePlan,
} from "../../services/commercial-catalog";
import { CommercialCatalogError } from "../../services/commercial-catalog/commercialCatalogError";

const root = process.cwd();

describe("Live plan durable save", () => {
  let durable: InMemoryDurableCatalogBackend;
  let plans: PlanService;
  let pricing: PricingService;
  let bundles: FeatureBundleService;
  let limits: LimitProfileService;

  beforeEach(() => {
    commercialCatalogStore.clear();
    durable = new InMemoryDurableCatalogBackend();
    setDurableLivePlanBackendForTests(durable);
    plans = new PlanService();
    pricing = new PricingService();
    bundles = new FeatureBundleService();
    limits = new LimitProfileService();
  });

  it("does not keep a publication persistence pipeline", () => {
    expect(
      existsSync(
        resolve(root, "server/commercial-catalog/publishing/catalogPublishingService.ts")
      )
    ).toBe(false);
    expect(
      existsSync(
        resolve(root, "server/services/commercial-catalog/publicationPersistence.ts")
      )
    ).toBe(false);
  });

  it("persists a valid live plan subgraph atomically", async () => {
    const plan = plans.create({ code: "basic", name: "Basic" });
    const cycle = pricing.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    const bundle = bundles.create({
      code: "basic-features",
      name: "Basic Features",
      features: [{ featureKey: "ordering" }],
    });
    const profile = limits.create({
      code: "basic-limits",
      name: "Basic Limits",
      values: [{ limitKey: "restaurants", value: 1 }],
    });
    pricing.create({
      planId: plan.id,
      billingCycleId: cycle.id,
      currency: "USD",
      amount: "0.00",
    });
    await plans.saveLive(plan.id, {
      featureBundleId: bundle.id,
      limitProfileId: profile.id,
    });
    commercialCatalogStore.clear();
    await durable.hydrateInto(commercialCatalogStore);
    expect(plans.get(plan.id)?.featureBundleId).toBe(bundle.id);
  });

  it("does not persist when save validation fails", async () => {
    const plan = plans.create({ code: "pro", name: "Pro" });
    await expect(plans.saveLive(plan.id, { name: "Pro+" })).rejects.toThrow(
      CommercialCatalogError
    );
    await persistLivePlan(plan.id);
    const snap = durable.snapshot();
    expect(snap.plans.find((p) => p.id === plan.id)?.name).not.toBe("Pro+");
  });
});
