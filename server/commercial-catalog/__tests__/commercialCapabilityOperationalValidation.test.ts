/**
 * COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 — Operational Validation (E2E)
 * Docs/tests only — no architecture/product redesign.
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
  planVersionService,
  pricingService,
  featureBundleService,
  limitProfileService,
  migrationPolicyService,
  commercialSnapshotService,
  CommercialCatalogError,
} from "../../services/commercial-catalog";
import {
  catalogPublishingService,
  clearAllPublicationOverlays,
  invalidatePublicCatalogCache,
  setPublicCatalogCacheEnabled,
  projectPublicCatalogOfferings,
  projectPublicCatalogOffering,
} from "../publishing";
import { resolveEntitlementsFromSnapshot } from "../../subscription-runtime/entitlementResolver";
import { syncCommercialLifecycle } from "../../subscription-runtime/lifecycleSync";
import type { CommercialSnapshotDefinition } from "@shared/commercial-catalog";

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

/** Enabled: ordering + reporting; all other projection keys present as disabled. */
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

function seedOperationalPlan(code: string) {
  const { monthly, yearly } = ensureCycles();
  const plan = planService.create({
    code,
    name: `Operational ${code}`,
    description: "E2E operational validation plan",
  });
  const version = planVersionService.create({
    planId: plan.id,
    versionCode: "v1",
    versionName: `${code} Published Name`,
  });
  const bundle = buildFilterBundle(code);
  const profile = limitProfileService.create({
    code: `${code}-lim`,
    name: "Limits",
    values: [{ limitKey: "restaurants", value: 2 }],
  });
  const mig = migrationPolicyService.create({
    code: `${code}-mig`,
    name: "Mig",
  });
  const ret = migrationPolicyService.createRetirementPolicy({
    code: `${code}-ret`,
    name: "Ret",
  });
  planVersionService.updateDraft(version.id, {
    featureBundleId: bundle.id,
    limitProfileId: profile.id,
    migrationPolicyId: mig.id,
    retirementPolicyId: ret.id,
    compatibility: {
      upgradeTargets: [],
      downgradeTargets: [],
      migrationRequirements: [],
      breakingCommercialChanges: [],
    },
  });
  pricingService.create({
    planVersionId: version.id,
    billingCycleId: monthly.id,
    currency: "USD",
    amount: "19.00",
  });
  pricingService.create({
    planVersionId: version.id,
    billingCycleId: yearly.id,
    currency: "USD",
    amount: "190.00",
  });
  return { plan, version, bundle };
}

describe("COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 Operational Validation", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    clearAllPublicationOverlays();
    setPublicCatalogCacheEnabled(false);
    invalidatePublicCatalogCache();
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
    expect(
      assertCommercialCapabilityFilterKeys(["ghostCapability"]).ok
    ).toBe(false);
  });

  it("2. Commercial Plan — projection-only selection; unknown keys rejected", () => {
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

    const { bundle } = seedOperationalPlan("cap-plan");
    const features = featureBundleService.listFeatures(bundle.id);
    expect(features).toHaveLength(15);
    expect(features.every((f) => isCommercialCapabilityFilterKey(f.featureKey)))
      .toBe(true);
    expect(features.filter((f) => f.included).map((f) => f.featureKey).sort()).toEqual(
      ["ordering", "reporting"]
    );
  });

  it("3–5. Approve → draft private; Publish → public offering drives pricing projection", () => {
    const { version, plan } = seedOperationalPlan("price-plan");

    catalogPublishingService.approveVersion(version.id);
    expect(catalogPublishingService.getStatus(version.id).workflowState).toBe(
      "approved"
    );
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    expect(() => projectPublicCatalogOffering(version.id)).toThrow(
      /not publicly accessible/i
    );

    const { version: published } = catalogPublishingService.publish(
      version.id,
      {},
      { enforceWorkflow: true }
    );
    expect(published.state).toBe("published");

    const offerings = projectPublicCatalogOfferings();
    expect(offerings).toHaveLength(1);
    const offering = offerings[0]!;
    expect(offering.planVersionId).toBe(version.id);
    expect(offering.planId).toBe(plan.id);
    expect(offering.planName).toBe("Operational price-plan");
    expect(offering.versionName).toContain("Published Name");
    expect(offering.versionCode).toBe("v1");
    expect(offering.priceMonthly).toBe("19.00");
    expect(offering.priceYearly).toBe("190.00");
    expect(offering.currency).toBe("USD");
    expect(offering.featureKeys.sort()).toEqual(["ordering", "reporting"]);
    expect(offering.workflowState).toBe("published");
    expect(offering.visibility.publiclyBrowsable).toBe(true);
    expect(offering.visibility.openForNewAdoption).toBe(true);

    // Public source exclusivity: only published browse projection
    expect(
      offerings.every((o) => o.workflowState === "published")
    ).toBe(true);
  });

  it("6–7. Retire removes from Pricing; Archive inaccessible; snapshots untouched", () => {
    const { version } = seedOperationalPlan("retire-plan");
    catalogPublishingService.publish(version.id);

    const snap = commercialSnapshotService.captureFromVersion(version.id);
    const snapshotId = snap.id;
    const before = commercialSnapshotService.get(snapshotId);
    expect(before).toBeTruthy();

    catalogPublishingService.deprecate(version.id);
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    // Historically addressable while deprecated
    expect(projectPublicCatalogOffering(version.id).workflowState).toBe(
      "deprecated"
    );

    catalogPublishingService.retire(version.id);
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    expect(() => projectPublicCatalogOffering(version.id)).toThrow(
      /not publicly accessible/i
    );

    // Existing snapshot identity preserved (I-CPL-13 companion: no mutate)
    const afterRetire = commercialSnapshotService.get(snapshotId);
    expect(afterRetire).toEqual(before);

    catalogPublishingService.archiveVersion(version.id);
    expect(catalogPublishingService.getStatus(version.id).workflowState).toBe(
      "archived"
    );
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    expect(() => projectPublicCatalogOffering(version.id)).toThrow(
      /not publicly accessible/i
    );
    expect(commercialSnapshotService.get(snapshotId)).toEqual(before);
  });

  it("8. Subscription Runtime — enabled/disabled from Snapshot; vocabulary = Feature Registry", () => {
    // Use bridgeable catalog plan code so Runtime can resolve commercial plan identity
    const { version } = seedOperationalPlan("professional");
    catalogPublishingService.publish(version.id);
    const { payload } = commercialSnapshotService.captureFromVersion(version.id);
    const NOW = new Date("2026-07-30T12:00:00.000Z");
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      now: NOW,
    });

    const resolved = resolveEntitlementsFromSnapshot({
      ownerId: 42,
      role: "user",
      snapshot: payload as CommercialSnapshotDefinition,
      snapshotId: "op-val-snap",
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

  it("9. Runtime enforcement surfaces (source / architecture evidence)", () => {
    const enforcement = read("server/subscription-runtime/enforcement.ts");
    expect(enforcement).toContain("export async function hasFeature");
    expect(enforcement).toContain("export async function requireFeature");
    expect(enforcement).toContain("export async function checkCapability");
    expect(enforcement).toContain("export async function checkLimit");

    const guest = read("server/commercial/guestOrderingAuthority.ts");
    expect(guest).toContain('hasFeature');
    expect(guest).toContain('"ordering"');

    const visibility = read("client/src/lib/commercial/featureVisibility.ts");
    expect(visibility).toContain("hasCommercialFeature");
    expect(visibility).toContain("entitlements.features");

    // Device/Screen commercial gating not in filter plane — residual (not UI-hide-as-enforcement for ordering)
    const deviceHits = [
      "client/src/lib/commercial/clientGateRegistry.ts",
      "server/subscription-runtime/enforcement.ts",
    ].map(read).join("\n");
    expect(deviceHits).not.toMatch(/cap\.device|deviceRegistrationFeature/);
  });

  it("10. Regression boundaries — no billing/discovery redesign in capability SSOT", () => {
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

  it("UI wiring — Plan Builder/Editor use Projection picker; Pricing not Capability Catalog", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    const picker = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx"
    );
    expect(wizard).toContain("CapabilityFilterPicker");
    expect(panels).toContain("CATALOG_FEATURE_KEYS");
    expect(picker).toContain("catalogFeatureNameKey");

    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).not.toMatch(/DISCOVERY_CAPABILITY|COMMERCIAL_CAPABILITY_FILTER_KEYS/);
    expect(pricing).toContain("offering.featureKeys");
    expect(pricing).toContain("catalogFeatureNameKey");
  });
});
