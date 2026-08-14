/**
 * COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1
 * Individual capability composition via saveLive.
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
import {
  getCachedEntitlements,
  setCachedEntitlements,
} from "../../subscription-runtime/cache";
import { LEGACY_PLAN_COMMERCIAL_PRICE_TERMS } from "../../services/commercial-catalog/legacyPlanCommercialTerms";
import { applyCommercialPresentationRules } from "@shared/commercial-catalog-presentation";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

const NOW = new Date("2026-08-15T00:00:00.000Z");

function includedKeys(planCode: string) {
  const plan = planService.getByCode(planCode)!;
  return featureBundleService
    .listFeatures(plan.featureBundleId!)
    .filter((f) => f.included)
    .map((f) => f.featureKey)
    .sort();
}

describe("COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("live plan editor exposes individual capabilities and saveLivePlan capabilities", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    const router = read("server/api/commercialCatalog/commercialCatalogRouter.ts");
    expect(wizard).toContain("CapabilityFilterPicker");
    expect(wizard).toContain("capabilities: capabilityPayload");
    expect(wizard).not.toContain("placeholders.selectBundle");
    const picker = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx"
    );
    expect(picker).toContain("nameAr");
    expect(picker).toContain("nameEn");
    expect(picker).toContain("identity");
    expect(router).toContain("capabilities:");
    expect(router).not.toContain("publishVersion");
    expect(router).not.toContain("commercial_plan_versions");
  });

  it("saveLive replaces Professional capabilities atomically and hydrates the same keys", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const beforePrices = pricingService.list(plan.id).map((p) => ({
      currency: p.currency,
      amount: p.amount,
      regionId: p.regionId,
    }));
    const next = applyCommercialPresentationRules({
      ordering: true,
      reporting: true,
      kitchen: true,
      waiter: true,
      expo: true,
    });
    const capabilities = Object.entries(next).map(([featureKey, included]) => ({
      featureKey,
      included: Boolean(included),
    }));

    await planService.saveLive(plan.id, {}, {}, { capabilities });
    const keys = includedKeys("professional");
    expect(keys).toContain("expo");
    expect(keys).toContain("kitchen");
    expect(keys).toContain("devices");
    expect(keys).toContain("printing");
    expect(includedKeys("basic")).toEqual(
      [...projectionFeatureKeysForBridgePlan("BASIC")].sort()
    );
    expect(includedKeys("enterprise")).toEqual(
      [...projectionFeatureKeysForBridgePlan("ENTERPRISE")].sort()
    );
    const afterPrices = pricingService.list(plan.id).map((p) => ({
      currency: p.currency,
      amount: p.amount,
      regionId: p.regionId,
    }));
    expect(afterPrices).toEqual(beforePrices);
    expect(
      pricingService.currentPriceForPlan(plan.id, "monthly")?.amount
    ).toBe(LEGACY_PLAN_COMMERCIAL_PRICE_TERMS.professional.monthlyUsd);
  });

  it("rolls back capability composition when saveLive validation fails", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const before = includedKeys("professional");
    await expect(
      planService.saveLive(
        plan.id,
        { featureBundleId: null, limitProfileId: null },
        {},
        {
          capabilities: [{ featureKey: "ordering", included: true }],
        }
      )
    ).rejects.toThrow();
    expect(includedKeys("professional")).toEqual(before);
  });

  it("propagates add then remove to Professional subscribers A and B without rebind", async () => {
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

    const withExpo = applyCommercialPresentationRules({
      ...Object.fromEntries(
        projectionFeatureKeysForBridgePlan("PROFESSIONAL").map((k) => [k, true])
      ),
      expo: true,
    });
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        capabilities: Object.entries(withExpo).map(([featureKey, included]) => ({
          featureKey,
          included: Boolean(included),
        })),
      }
    );
    const added = includedKeys("professional");
    expect(entitle(added).entitlements.features.expo).toBe(true);
    expect(entitle(added).entitlements.features.expo).toBe(true);
    expect(
      projectPublicCatalogOfferings().find((o) => o.planCode === "professional")
        ?.featureKeys
    ).toContain("expo");

    const withoutExpo = applyCommercialPresentationRules({
      ...Object.fromEntries(
        projectionFeatureKeysForBridgePlan("PROFESSIONAL").map((k) => [k, true])
      ),
      expo: false,
    });
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        capabilities: Object.entries(withoutExpo).map(([featureKey, included]) => ({
          featureKey,
          included: Boolean(included),
        })),
      }
    );
    const removed = includedKeys("professional");
    expect(removed).not.toContain("expo");
    expect(entitle(removed).entitlements.features.expo).toBe(false);
    expect(entitle(removed).entitlements.features.expo).toBe(false);
  });

  it("invalidates public catalog and entitlement caches after capability save", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    });
    const stale = resolveEntitlementsFromLivePlan({
      ownerId: 1,
      role: "user",
      planId: plan.id,
      catalogPlanCode: "professional",
      featureKeys: includedKeys("professional"),
      limits: [],
      chargedTerms: null,
      legacyPlanId: 30002,
      lifecycle,
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    });
    setCachedEntitlements(1, stale, NOW, 60_000);
    expect(getCachedEntitlements(1, NOW)).not.toBeNull();

    const first = projectPublicCatalogOfferings();
    expect(first.find((o) => o.planCode === "professional")?.featureKeys).not.toContain(
      "expo"
    );

    const withExpo = applyCommercialPresentationRules({
      ...Object.fromEntries(
        projectionFeatureKeysForBridgePlan("PROFESSIONAL").map((k) => [k, true])
      ),
      expo: true,
    });
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        capabilities: Object.entries(withExpo).map(([featureKey, included]) => ({
          featureKey,
          included: Boolean(included),
        })),
      }
    );

    expect(getCachedEntitlements(1, NOW)).toBeNull();
    const second = projectPublicCatalogOfferings();
    expect(second.find((o) => o.planCode === "professional")?.featureKeys).toContain(
      "expo"
    );
    expect(
      pricingService.currentPriceForPlan(plan.id, "monthly")?.amount
    ).toBe(LEGACY_PLAN_COMMERCIAL_PRICE_TERMS.professional.monthlyUsd);
  });
});
