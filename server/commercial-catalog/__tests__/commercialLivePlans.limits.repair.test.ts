/**
 * COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LIVE_PLAN_LIMIT_KEYS,
  validateLivePlanLimitValues,
} from "@shared/commercial-catalog";
import {
  bootstrapPersistentCommercialCatalog,
  commercialCatalogStore,
  InMemoryDurableCatalogBackend,
  invalidateCatalogReadyGate,
  limitProfileService,
  planService,
  pricingService,
  setDurableLivePlanBackendForTests,
} from "../../services/commercial-catalog";
import { invalidatePublicCatalogCache } from "../publishing";
import { LEGACY_PLAN_COMMERCIAL_PRICE_TERMS } from "../../services/commercial-catalog/legacyPlanCommercialTerms";
import {
  getCachedEntitlements,
  setCachedEntitlements,
} from "../../subscription-runtime/cache";
import { resolveEntitlementsFromLivePlan } from "../../subscription-runtime/entitlementResolver";
import { syncCommercialLifecycle } from "../../subscription-runtime/lifecycleSync";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

const NOW = new Date("2026-08-15T00:00:00.000Z");

function profileValues(planCode: string) {
  const plan = planService.getByCode(planCode)!;
  return limitProfileService
    .listValues(plan.limitProfileId!)
    .sort((a, b) => a.limitKey.localeCompare(b.limitKey));
}

function restaurantValue(planCode: string) {
  return profileValues(planCode).find((v) => v.limitKey === "restaurants")?.value;
}

describe("COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
  });

  it("editor and saveLive expose editable Live Plan limit values", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    const editor = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/LivePlanLimitsEditor.tsx"
    );
    const router = read("server/api/commercialCatalog/commercialCatalogRouter.ts");
    const persist = read("server/services/commercial-catalog/livePlanPersistence.ts");
    const create = read("server/routers.ts");
    expect(wizard).toContain("LivePlanLimitsEditor");
    expect(wizard).toContain("limits: checked.normalized");
    expect(wizard).not.toContain("placeholders.selectLimits");
    expect(editor).toContain("LIVE_PLAN_LIMIT_KEYS");
    expect(editor).not.toMatch(/Basic\s*=\s*1/);
    expect(router).toContain("limits:");
    expect(persist).toContain("commercialLimitValues");
    expect(create).toContain("await assertRestaurantCreateAllowed(ownerUserId)");
    expect(create).not.toContain(
      "if (ctx.user.role !== \"admin\") {\n        await assertRestaurantCreateAllowed"
    );
  });

  it("validates non-negative integers and canonical null unlimited", () => {
    expect(
      validateLivePlanLimitValues([
        { limitKey: "restaurants", value: 5 },
        { limitKey: "categories", value: 25 },
        { limitKey: "items", value: 500 },
      ]).ok
    ).toBe(true);
    expect(
      validateLivePlanLimitValues([
        { limitKey: "restaurants", value: null },
        { limitKey: "categories", value: null },
        { limitKey: "items", value: null },
      ]).ok
    ).toBe(true);
    expect(
      validateLivePlanLimitValues([
        { limitKey: "restaurants", value: -1 },
        { limitKey: "categories", value: 1 },
        { limitKey: "items", value: 1 },
      ]).ok
    ).toBe(false);
    expect(
      validateLivePlanLimitValues([
        { limitKey: "restaurants", value: 1.5 },
        { limitKey: "categories", value: 1 },
        { limitKey: "items", value: 1 },
      ]).ok
    ).toBe(false);
    expect(LIVE_PLAN_LIMIT_KEYS).toEqual(["restaurants", "categories", "items"]);
  });

  it("bootstrap current values remain 1 / 5 / null until save changes them", async () => {
    await bootstrapPersistentCommercialCatalog();
    expect(restaurantValue("basic")).toBe(1);
    expect(restaurantValue("professional")).toBe(5);
    expect(restaurantValue("enterprise")).toBeNull();
  });

  it("saveLive changes Professional restaurants 5 → 10 and hydrates the same value", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const beforePrice = pricingService.currentPriceForPlan(plan.id, "monthly")?.amount;
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: 10 },
          { limitKey: "categories", value: 25 },
          { limitKey: "items", value: 500 },
        ],
      }
    );
    expect(restaurantValue("professional")).toBe(10);
    expect(restaurantValue("basic")).toBe(1);
    expect(restaurantValue("enterprise")).toBeNull();
    expect(pricingService.currentPriceForPlan(plan.id, "monthly")?.amount).toBe(
      beforePrice
    );
    expect(beforePrice).toBe(LEGACY_PLAN_COMMERCIAL_PRICE_TERMS.professional.monthlyUsd);
  });

  it("saveLive Limited → Unlimited and Unlimited → Limited", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("enterprise")!;
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: 50 },
          { limitKey: "categories", value: null },
          { limitKey: "items", value: null },
        ],
      }
    );
    expect(restaurantValue("enterprise")).toBe(50);
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: null },
          { limitKey: "categories", value: null },
          { limitKey: "items", value: null },
        ],
      }
    );
    expect(restaurantValue("enterprise")).toBeNull();
  });

  it("rolls back limit values when saveLive validation fails", async () => {
    await bootstrapPersistentCommercialCatalog();
    const before = restaurantValue("professional");
    await expect(
      planService.saveLive(
        planService.getByCode("professional")!.id,
        { featureBundleId: null, limitProfileId: null },
        {},
        {
          limits: [
            { limitKey: "restaurants", value: 99 },
            { limitKey: "categories", value: 1 },
            { limitKey: "items", value: 1 },
          ],
        }
      )
    ).rejects.toThrow();
    expect(restaurantValue("professional")).toBe(before);
  });

  it("rolls back limit values when capability composition fails", async () => {
    await bootstrapPersistentCommercialCatalog();
    const before = restaurantValue("professional");
    await expect(
      planService.saveLive(
        planService.getByCode("professional")!.id,
        { featureBundleId: null },
        {},
        {
          limits: [
            { limitKey: "restaurants", value: 99 },
            { limitKey: "categories", value: 1 },
            { limitKey: "items", value: 1 },
          ],
        }
      )
    ).rejects.toThrow();
    expect(restaurantValue("professional")).toBe(before);
  });

  it("rolls back limit values when price replace fails validation", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plan = planService.getByCode("professional")!;
    const beforeLimit = restaurantValue("professional");
    const beforePrice = pricingService.currentPriceForPlan(plan.id, "monthly")?.amount;
    await expect(
      planService.saveLive(
        plan.id,
        {},
        {},
        {
          prices: [],
          limits: [
            { limitKey: "restaurants", value: 99 },
            { limitKey: "categories", value: 1 },
            { limitKey: "items", value: 1 },
          ],
        }
      )
    ).rejects.toThrow();
    expect(restaurantValue("professional")).toBe(beforeLimit);
    expect(pricingService.currentPriceForPlan(plan.id, "monthly")?.amount).toBe(
      beforePrice
    );
  });

  it("rejects invalid limit values without persisting", async () => {
    await bootstrapPersistentCommercialCatalog();
    const before = restaurantValue("professional");
    await expect(
      planService.saveLive(
        planService.getByCode("professional")!.id,
        {},
        {},
        {
          limits: [
            { limitKey: "restaurants", value: -4 },
            { limitKey: "categories", value: 25 },
            { limitKey: "items", value: 500 },
          ],
        }
      )
    ).rejects.toThrow(/limit validation/);
    expect(restaurantValue("professional")).toBe(before);
  });

  it("invalidates entitlement cache after limit save", async () => {
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
      featureKeys: [],
      limits: [{ limitKey: "restaurants", value: 5, unit: "count" }],
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
    await planService.saveLive(
      plan.id,
      {},
      {},
      {
        limits: [
          { limitKey: "restaurants", value: 10 },
          { limitKey: "categories", value: 25 },
          { limitKey: "items", value: 500 },
        ],
      }
    );
    expect(getCachedEntitlements(1, NOW)).toBeNull();
    expect(stale.entitlements.limits.restaurants).toBe(5);
  });
});
