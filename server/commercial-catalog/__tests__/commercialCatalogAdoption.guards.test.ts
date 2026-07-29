/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1 — architecture + behavior guards.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CATALOG_ADOPTION_PROGRAM,
  COMMERCIAL_CATALOG_ADOPTION_CONSUMERS,
  LEGACY_COMMERCIAL_SOURCES_SUPERSEDED,
  PLAN_SELECTION_VISIBLE_STATES,
} from "@shared/commercial-catalog";
import {
  CommercialCatalogStore,
  PlanService,
  PlanVersionService,
  PricingService,
  FeatureBundleService,
  LimitProfileService,
  MigrationPolicyService,
  TrialPolicyCatalogService,
  PublicationService,
  CommercialSnapshotService,
} from "../../services/commercial-catalog";
import { LEGACY_PLAN_BRIDGE } from "../../services/commercial-catalog/legacyPlanBridge";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1 contracts", () => {
  it("exports adoption program + consumers", () => {
    expect(COMMERCIAL_CATALOG_ADOPTION_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1"
    );
    expect(COMMERCIAL_CATALOG_ADOPTION_CONSUMERS).toContain("plan_selection");
    expect(COMMERCIAL_CATALOG_ADOPTION_CONSUMERS).toContain(
      "commercial_snapshot_creation"
    );
    expect(LEGACY_COMMERCIAL_SOURCES_SUPERSEDED.length).toBeGreaterThan(0);
    expect(PLAN_SELECTION_VISIBLE_STATES).toEqual(["published"]);
  });

  it("wires listPlans dual-read + trial catalog adoption", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("listPlansForSelectionLegacyShape");
    const trial = read("server/create-trial-subscription.ts");
    expect(trial).toContain("resolveTrialPolicyFromCatalog");
    expect(trial).toContain("createImmutableCommercialSnapshotForSubscription");
    const entitlements = read("server/commercial/getCommercialEntitlements.ts");
    expect(entitlements).toContain("resolveCommercialFactsFromSnapshot");
    expect(entitlements).not.toMatch(/\.\.\.base/);
    expect(entitlements).not.toMatch(/prefer/i);
    expect(entitlements).not.toMatch(/stripe|moyasar|hyperpay/i);
  });

  it("journals binding migration 0085", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0085_commercial_catalog_adoption_bindings");
    expect(
      read("drizzle/0085_commercial_catalog_adoption_bindings.sql")
    ).toContain("commercial_subscription_bindings");
  });

  it("keeps entitlement matrix as Legacy Bridge only (unbound)", () => {
    const matrix = read("src/lib/commercial/planFeatureMatrix.ts");
    expect(matrix).toContain("Legacy Bridge");
    expect(matrix).toContain("PLAN_LIMITS");
  });
});

describe("published plan selection + immutable snapshots", () => {
  let store: CommercialCatalogStore;

  beforeEach(() => {
    store = new CommercialCatalogStore();
  });

  it("exposes only published versions and freezes snapshots", () => {
    const plans = new PlanService(store);
    const versions = new PlanVersionService(store);
    const pricing = new PricingService(store);
    const bundles = new FeatureBundleService(store);
    const limits = new LimitProfileService(store);
    const migration = new MigrationPolicyService(store);
    const trials = new TrialPolicyCatalogService(store);
    const publication = new PublicationService(store);
    const snapshots = new CommercialSnapshotService(store);

    const plan = plans.create({ code: "professional", name: "Professional" });
    const cycle = pricing.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    const bundle = bundles.create({
      code: "pf",
      name: "PF",
      features: [{ featureKey: "ordering" }],
    });
    const profile = limits.create({
      code: "pl",
      name: "PL",
      values: [{ limitKey: "restaurants", value: 5 }],
    });
    const mig = migration.create({ code: "m", name: "M" });
    const ret = migration.createRetirementPolicy({ code: "r", name: "R" });
    trials.create({ code: "t14", name: "T", durationDays: 14 });
    const version = versions.create({
      planId: plan.id,
      versionCode: "v1",
      versionName: "Pro v1",
      featureBundleId: bundle.id,
      limitProfileId: profile.id,
      migrationPolicyId: mig.id,
      retirementPolicyId: ret.id,
    });
    pricing.create({
      planVersionId: version.id,
      billingCycleId: cycle.id,
      currency: "SAR",
      amount: "99.00",
    });

    expect(versions.list().filter((v) => v.state === "published")).toHaveLength(
      0
    );
    publication.publish(version.id);
    expect(versions.list().filter((v) => v.state === "published")).toHaveLength(
      1
    );

    const snap = snapshots.captureFromVersion(version.id);
    expect(Object.isFrozen(snap.payload)).toBe(true);
    expect(LEGACY_PLAN_BRIDGE.some((b) => b.catalogPlanCode === "professional"))
      .toBe(true);
  });
});
