/**
 * COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 — Operational Validation
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — live plan save / public catalog / runtime.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CAPABILITY_FILTER_KEYS,
  COMMERCIAL_CAPABILITY_FILTER_REGISTRY,
  DISCOVERY_CAPABILITY_CLASSIFICATION,
  assertCommercialCapabilityFilterKeys,
  isCommercialCapabilityFilterKey,
} from "@shared/commercial-capability";
import { FEATURE_KEYS } from "@commercial/featureKeys";
import {
  commercialCatalogStore,
  planService,
  pricingService,
  featureBundleService,
  limitProfileService,
  CommercialCatalogError,
  setDurableLivePlanBackendForTests,
  InMemoryDurableCatalogBackend,
  invalidateCatalogReadyGate,
} from "../../services/commercial-catalog";
import {
  invalidatePublicCatalogCache,
  setPublicCatalogCacheEnabled,
  projectPublicCatalogOfferings,
  projectPublicCatalogOffering,
} from "../publishing";
import { resolveEntitlementsFromLivePlan } from "../../subscription-runtime/entitlementResolver";
import { syncCommercialLifecycle } from "../../subscription-runtime/lifecycleSync";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

function ensureCycles() {
  const monthly =
    pricingService.listBillingCycles().find((c) => c.code === "monthly") ??
    pricingService.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
  const yearly =
    pricingService.listBillingCycles().find((c) => c.code === "yearly") ??
    pricingService.createBillingCycle({
      code: "yearly",
      name: "Yearly",
      intervalCount: 1,
      intervalUnit: "year",
    });
  return { monthly, yearly };
}

function buildFilterBundle(code: string) {
  return featureBundleService.create({
    code: `${code}-feat`,
    name: "Filter Bundle",
    features: COMMERCIAL_CAPABILITY_FILTER_KEYS.map((featureKey) => ({
      featureKey,
      included: featureKey === "ordering" || featureKey === "reporting",
    })),
  });
}

async function seedOperationalPlan(code: string) {
  const { monthly, yearly } = ensureCycles();
  const plan = planService.create({
    code,
    name: `Operational ${code}`,
    description: "E2E operational validation plan",
  });
  const bundle = buildFilterBundle(code);
  const profile = limitProfileService.create({
    code: `${code}-lim`,
    name: "Limits",
    values: [{ limitKey: "restaurants", value: 2 }],
  });
  pricingService.create({
    planId: plan.id,
    billingCycleId: monthly.id,
    currency: "USD",
    amount: "19.00",
  });
  pricingService.create({
    planId: plan.id,
    billingCycleId: yearly.id,
    currency: "USD",
    amount: "190.00",
  });
  const saved = await planService.saveLive(plan.id, {
    featureBundleId: bundle.id,
    limitProfileId: profile.id,
  });
  invalidatePublicCatalogCache();
  return { plan: saved, bundle };
}

describe("COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 Operational Validation", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    setPublicCatalogCacheEnabled(false);
    invalidatePublicCatalogCache();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
    invalidateCatalogReadyGate();
  });

  it("1. Capability Registry — Projection SSOT loaded, unique, no unknown keys", () => {
    expect(COMMERCIAL_CAPABILITY_FILTER_KEYS).toHaveLength(15);
    expect(new Set(COMMERCIAL_CAPABILITY_FILTER_KEYS).size).toBe(15);
    expect(COMMERCIAL_CAPABILITY_FILTER_REGISTRY).toHaveLength(15);
    for (const key of COMMERCIAL_CAPABILITY_FILTER_KEYS) {
      expect(FEATURE_KEYS).toContain(key);
    }
    expect(DISCOVERY_CAPABILITY_CLASSIFICATION).toHaveLength(17);
    for (const row of COMMERCIAL_CAPABILITY_FILTER_REGISTRY) {
      expect(isCommercialCapabilityFilterKey(row.filterKey)).toBe(true);
      expect(row.productionImplemented).toBe(true);
    }
    expect(assertCommercialCapabilityFilterKeys(["ghostCapability"]).ok).toBe(
      false
    );
  });

  it("2. Commercial Plan — projection-only selection; unknown keys rejected", async () => {
    expect(() =>
      featureBundleService.create({
        code: "bad-bundle",
        name: "Bad",
        features: [{ featureKey: "notInRegistry", included: true }],
      })
    ).toThrow(CommercialCatalogError);

    expect(() =>
      limitProfileService.create({
        code: "bad-lim",
        name: "Bad",
        values: [{ limitKey: "notALimit", value: 1 }],
      })
    ).toThrow(CommercialCatalogError);

    const { bundle } = await seedOperationalPlan("cap-plan");
    const features = featureBundleService.listFeatures(bundle.id);
    expect(features).toHaveLength(15);
    expect(features.every((f) => isCommercialCapabilityFilterKey(f.featureKey)))
      .toBe(true);
    expect(features.filter((f) => f.included).map((f) => f.featureKey).sort()).toEqual(
      ["ordering", "reporting"]
    );
  });

  it("3. Atomic live save exposes the plan on the public catalog", async () => {
    const { plan } = await seedOperationalPlan("price-plan");
    const offerings = projectPublicCatalogOfferings();
    expect(offerings).toHaveLength(1);
    const offering = offerings[0]!;
    expect(offering.planId).toBe(plan.id);
    expect(offering.planName).toBe("Operational price-plan");
    expect(offering.priceMonthly).toBe("19.00");
    expect(offering.priceYearly).toBe("190.00");
    expect(offering.currency).toBe("USD");
    expect(offering.featureKeys.sort()).toEqual(["ordering", "reporting"]);
    expect(offering.visibility.publiclyBrowsable).toBe(true);
    expect(offering.visibility.openForNewAdoption).toBe(true);
  });

  it("4. Hiding a live plan removes it from Pricing immediately", async () => {
    const { plan } = await seedOperationalPlan("retire-plan");
    expect(projectPublicCatalogOfferings()).toHaveLength(1);
    await planService.saveLive(plan.id, { isHidden: true });
    invalidatePublicCatalogCache();
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    expect(() => projectPublicCatalogOffering(plan.id)).toThrow(
      /not publicly accessible/i
    );
  });

  it("5. Subscription Runtime — enabled/disabled from live plan; vocabulary = Feature Registry", async () => {
    const { plan } = await seedOperationalPlan("professional");
    const NOW = new Date("2026-07-30T12:00:00.000Z");
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    });
    const features = featureBundleService.listFeatures(plan.featureBundleId!);
    const limits = limitProfileService.listValues(plan.limitProfileId!);

    const resolved = resolveEntitlementsFromLivePlan({
      ownerId: 42,
      role: "user",
      planId: plan.id,
      catalogPlanCode: plan.code,
      featureKeys: features.filter((f) => f.included).map((f) => f.featureKey),
      limits,
      chargedTerms: {
        planId: plan.id,
        catalogPlanCode: plan.code,
        commercialName: plan.name,
        chargedAmount: "19.00",
        chargedCurrency: "USD",
        billingCycleId: "bc",
        billingCycleCode: "monthly",
        intervalCount: 1,
        intervalUnit: "month",
        periodStart: null,
        periodEnd: null,
      },
      legacyPlanId: 30002,
      lifecycle,
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    });

    expect(Object.keys(resolved.entitlements.features).sort()).toEqual(
      [...FEATURE_KEYS].sort()
    );
    expect(resolved.entitlements.features.ordering).toBe(true);
    expect(resolved.entitlements.features.reporting).toBe(true);
    expect(resolved.entitlements.features.hotelMode).toBe(false);
    expect(resolved.entitlements.features.templates).toBe(false);
    expect(resolved.entitlements.features.cart).toBe(false);
    expect(resolved.entitlements.plan).toBe("PROFESSIONAL");

    for (const key of COMMERCIAL_CAPABILITY_FILTER_KEYS) {
      expect(isCommercialCapabilityFilterKey(key)).toBe(true);
      expect(FEATURE_KEYS).toContain(key);
    }
  });

  it("6. Runtime enforcement surfaces (source / architecture evidence)", () => {
    const enforcement = read("server/subscription-runtime/enforcement.ts");
    expect(enforcement).toContain("export async function hasFeature");
    expect(enforcement).toContain("export async function requireFeature");
    expect(enforcement).toContain("export async function checkCapability");
    expect(enforcement).toContain("export async function checkLimit");

    const guest = read("server/commercial/guestOrderingAuthority.ts");
    expect(guest).toContain("hasFeature");
    expect(guest).toContain('"ordering"');

    const visibility = read("client/src/lib/commercial/featureVisibility.ts");
    expect(visibility).toContain("hasCommercialFeature");
    expect(visibility).toContain("entitlements.features");

    const deviceHits = [
      "client/src/lib/commercial/clientGateRegistry.ts",
      "server/subscription-runtime/enforcement.ts",
    ]
      .map(read)
      .join("\n");
    expect(deviceHits).not.toMatch(/cap\.device|deviceRegistrationFeature/);
  });

  it("7. Regression boundaries — no billing/discovery redesign in capability SSOT", () => {
    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).toContain("commercialCatalog.public.listOfferings");
    expect(pricing).toContain("createCheckoutSession");
    expect(pricing).toContain("createTapCheckout");

    const discovery = read(
      "docs/engineering/programs/PLATFORM-CAPABILITY-DISCOVERY-1/PLATFORM_CAPABILITY_CATALOG.md"
    );
    expect(discovery).toContain("CAP-01");
    expect(discovery).toContain("CAP-46");

    const featureKeys = read("src/lib/commercial/featureKeys.ts");
    expect(featureKeys).toContain("@shared/commercial-capability");

    const helpers = read(
      "client/src/components/admin/platform-ops/commercial-catalog/catalogUiHelpers.ts"
    );
    expect(helpers).toContain("COMMERCIAL_CAPABILITY_FILTER_KEYS");
    expect(helpers).not.toMatch(/"qrMenu",\s*"categories"/);
  });

  it("UI wiring — Plan Editor uses Projection picker; Pricing not Capability Catalog", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    const picker = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx"
    );
    expect(wizard).toContain("saveLivePlan");
    expect(panels).toContain("CATALOG_FEATURE_KEYS");
    expect(picker).toContain("presentationNameI18nKey");
    expect(picker).toContain("COMMERCIAL-CATALOG-RATIONALIZATION-1");

    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).not.toMatch(
      /DISCOVERY_CAPABILITY|COMMERCIAL_CAPABILITY_FILTER_KEYS/
    );
    expect(pricing).toContain("offering.featureKeys");
    expect(pricing).toContain("presentationNameI18nKey");
  });
});
