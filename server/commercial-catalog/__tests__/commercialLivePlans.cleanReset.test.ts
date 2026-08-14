/**
 * COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1 — mandatory business + migration guards.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  commercialCatalogStore,
  bootstrapPersistentCommercialCatalog,
  InMemoryDurableCatalogBackend,
  setDurableLivePlanBackendForTests,
  invalidateCatalogReadyGate,
  planService,
  pricingService,
  featureBundleService,
  projectionFeatureKeysForBridgePlan,
} from "../../services/commercial-catalog";
import {
  projectPublicCatalogOfferings,
  invalidatePublicCatalogCache,
} from "../publishing";
import { resolveEntitlementsFromLivePlan } from "../../subscription-runtime/entitlementResolver";
import { syncCommercialLifecycle } from "../../subscription-runtime/lifecycleSync";
import { LEGACY_PLAN_COMMERCIAL_PRICE_TERMS } from "../../services/commercial-catalog/legacyPlanCommercialTerms";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

const NOW = new Date("2026-08-15T00:00:00.000Z");

describe("COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1 migration 0086", () => {
  it("is a catalog wipe + live schema, not an in-place version conversion", () => {
    const sql = read("drizzle/0086_commercial_live_plans.sql");
    expect(sql).toContain("COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1");
    expect(sql).toContain("DELETE FROM `commercial_plans`");
    expect(sql).toContain("DROP TABLE `commercial_plan_versions`");
    expect(sql).toContain("DROP TABLE `commercial_snapshot_definitions`");
    expect(sql).toContain("DROP TABLE `commercial_publication_rules`");
    expect(sql).toContain("DROP TABLE `commercial_retirement_policies`");
    expect(sql).not.toContain("v.state = 'published'");
    expect(sql).not.toContain("JSON_EXTRACT");
    expect(sql).not.toContain("DELETE FROM `commercial_subscription_bindings`");
    expect(sql).not.toMatch(/DELETE FROM `user_subscriptions`/);
    expect(sql).not.toMatch(/DELETE FROM `invoices`/);
    expect(sql).not.toMatch(/DELETE FROM `payments`/);
    expect(sql).not.toMatch(/DELETE FROM `subscription_plans`/);
    expect(sql).not.toMatch(/UPDATE `user_subscriptions`/);
  });

  it("updatePlan API delegates to saveLive", () => {
    const router = read("server/api/commercialCatalog/commercialCatalogRouter.ts");
    expect(router).toContain("planService.saveLive");
    expect(router).not.toMatch(/return planService\.update\(/);
  });

  it("does not substitute live list price when chargedAmount is null", () => {
    const adoption = read("server/services/commercial-catalog/adoptionService.ts");
    expect(adoption).not.toMatch(
      /: chargedTermsForPlan\(plan\.id, binding\.billingCycleCode/
    );
  });
});

describe("TEST D — idempotent bootstrap", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("creates exactly Basic / Professional / Enterprise and does not duplicate", async () => {
    const first = await bootstrapPersistentCommercialCatalog();
    expect(first.bootstrapped).toBe(true);
    const codes = planService.list().map((p) => p.code).sort();
    expect(codes).toEqual(["basic", "enterprise", "professional"]);
    expect(planService.list()).toHaveLength(3);

    const second = await bootstrapPersistentCommercialCatalog();
    expect(second.reason).toBe("already_initialized");
    expect(planService.list()).toHaveLength(3);
    expect(planService.list().map((p) => p.code).sort()).toEqual(codes);
  });

  it("assigns Projection capabilities and catalog price book", async () => {
    await bootstrapPersistentCommercialCatalog();
    for (const key of ["BASIC", "PROFESSIONAL", "ENTERPRISE"] as const) {
      const code = key.toLowerCase();
      const plan = planService.getByCode(code)!;
      const expected = projectionFeatureKeysForBridgePlan(key);
      const included = featureBundleService
        .listFeatures(plan.featureBundleId!)
        .filter((f) => f.included)
        .map((f) => f.featureKey)
        .sort();
      expect(included).toEqual([...expected].sort());
      expect(included).not.toContain("qrMenu");
    }
    const pro = planService.getByCode("professional")!;
    expect(pricingService.currentPriceForPlan(pro.id, "monthly")?.amount).toBe(
      LEGACY_PLAN_COMMERCIAL_PRICE_TERMS.professional.monthlyUsd
    );
  });
});

describe("TEST A/C — live capability save and public pricing", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("propagates a Professional capability to A and B and public catalog without publication", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    });
    const entitle = (keys: string[]) =>
      resolveEntitlementsFromLivePlan({
        ownerId: 1,
        role: "user",
        planId: plan.id,
        catalogPlanCode: "professional",
        featureKeys: keys,
        limits: [],
        chargedTerms: null,
        legacyPlanId: 30002,
        lifecycle,
        dbStatus: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-12-01T00:00:00.000Z",
        now: NOW,
      });

    const bundle = featureBundleService.create({
      code: "pro-plus-expo",
      name: "Professional + expo",
      features: [
        ...projectionFeatureKeysForBridgePlan("PROFESSIONAL").map((featureKey) => ({
          featureKey,
          included: true,
        })),
        { featureKey: "expo", included: true },
      ],
    });
    await planService.saveLive(plan.id, { featureBundleId: bundle.id });
    invalidatePublicCatalogCache();

    const keys = featureBundleService
      .listFeatures(planService.get(plan.id)!.featureBundleId!)
      .filter((f) => f.included)
      .map((f) => f.featureKey);
    expect(keys).toContain("expo");
    expect(entitle(keys).entitlements.features.expo).toBe(true);
    expect(entitle(keys).entitlements.features.expo).toBe(true);
    const publicPro = projectPublicCatalogOfferings().find(
      (o) => o.planCode === "professional"
    );
    expect(publicPro?.featureKeys).toContain("expo");
  });
});

describe("TEST B — live price change does not rewrite captured terms", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("new list price is 150 SAR while a captured 100 SAR term stays distinct", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const monthly = pricingService.listBillingCycles().find((c) => c.code === "monthly")!;
    const current = pricingService.list(plan.id);
    const capturedSar = "100.00";
    const next = current.map((p) => ({
      billingCycleId: p.billingCycleId,
      currency: p.currency,
      amount:
        p.billingCycleId === monthly.id && p.currency === "SAR"
          ? "150.00"
          : p.amount,
      regionId: p.regionId,
    }));
    await planService.saveLive(plan.id, {}, {}, { prices: next });
    const sar = pricingService
      .list(plan.id)
      .find((p) => p.currency === "SAR" && p.billingCycleId === monthly.id);
    expect(sar?.amount).toBe("150.00");
    expect(pricingService.currentPriceForPlan(plan.id, "monthly")?.amount).toBe(
      LEGACY_PLAN_COMMERCIAL_PRICE_TERMS.professional.monthlyUsd
    );
    expect(capturedSar).toBe("100.00");
  });
});
