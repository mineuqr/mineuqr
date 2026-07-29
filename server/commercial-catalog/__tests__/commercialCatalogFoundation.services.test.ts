/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — service behavior tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  CommercialCatalogStore,
  PlanService,
  PlanVersionService,
  PricingService,
  FeatureBundleService,
  LimitProfileService,
  MigrationPolicyService,
  RegionalPolicyService,
  PublicationService,
  CommercialSnapshotService,
  CommercialCatalogError,
} from "../../services/commercial-catalog";

describe("Commercial Catalog services", () => {
  let store: CommercialCatalogStore;
  let plans: PlanService;
  let versions: PlanVersionService;
  let pricing: PricingService;
  let bundles: FeatureBundleService;
  let limits: LimitProfileService;
  let migration: MigrationPolicyService;
  let regions: RegionalPolicyService;
  let publication: PublicationService;
  let snapshots: CommercialSnapshotService;

  beforeEach(() => {
    store = new CommercialCatalogStore();
    plans = new PlanService(store);
    versions = new PlanVersionService(store);
    pricing = new PricingService(store);
    bundles = new FeatureBundleService(store);
    limits = new LimitProfileService(store);
    migration = new MigrationPolicyService(store);
    regions = new RegionalPolicyService(store);
    publication = new PublicationService(store);
    snapshots = new CommercialSnapshotService(store);
  });

  it("publishes only when CC-16 mandatory metadata is complete", () => {
    const plan = plans.create({ code: "business", name: "Business" });
    const version = versions.create({
      planId: plan.id,
      versionCode: "v1",
      versionName: "Business v1",
    });
    expect(() => publication.publish(version.id)).toThrow(CommercialCatalogError);

    const cycle = pricing.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
    const bundle = bundles.create({
      code: "biz-features",
      name: "Business Features",
      features: [{ featureKey: "orders" }],
    });
    const profile = limits.create({
      code: "biz-limits",
      name: "Business Limits",
      values: [{ limitKey: "restaurants", value: 5 }],
    });
    const mig = migration.create({ code: "explicit", name: "Explicit migrate" });
    const ret = migration.createRetirementPolicy({
      code: "no-renew",
      name: "No renewals",
    });
    versions.updateDraft(version.id, {
      featureBundleId: bundle.id,
      limitProfileId: profile.id,
      migrationPolicyId: mig.id,
      retirementPolicyId: ret.id,
      compatibility: {
        upgradeTargets: [],
        downgradeTargets: [],
        migrationRequirements: ["admin_approval"],
        breakingCommercialChanges: [],
      },
    });
    pricing.create({
      planVersionId: version.id,
      billingCycleId: cycle.id,
      currency: "SAR",
      amount: "349.00",
    });

    const published = publication.publish(version.id);
    expect(published.state).toBe("published");
    expect(() =>
      versions.updateDraft(version.id, { versionName: "hack" })
    ).toThrow(/immutable/i);
  });

  it("captures immutable commercial snapshot definitions", () => {
    const plan = plans.create({ code: "starter", name: "Starter" });
    const version = versions.create({
      planId: plan.id,
      versionCode: "v1",
      versionName: "Starter v1",
    });
    const cycle = pricing.createBillingCycle({
      code: "yearly",
      name: "Yearly",
      intervalCount: 1,
      intervalUnit: "year",
    });
    const region = regions.create({
      code: "sa",
      name: "Saudi Arabia",
      countryCode: "SA",
      currency: "SAR",
    });
    const bundle = bundles.create({
      code: "st-features",
      name: "Starter Features",
      features: [{ featureKey: "menu" }],
    });
    const profile = limits.create({
      code: "st-limits",
      name: "Starter Limits",
      values: [{ limitKey: "items", value: 100 }],
    });
    const mig = migration.create({ code: "m1", name: "M1" });
    const ret = migration.createRetirementPolicy({ code: "r1", name: "R1" });
    versions.updateDraft(version.id, {
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
      regionId: region.id,
    });
    publication.publish(version.id);

    const captured = snapshots.captureFromVersion(version.id, {
      regionId: region.id,
    });
    expect(captured.payload.commercialName).toBe("Starter");
    expect(captured.payload.currency).toBe("SAR");
    expect(Object.isFrozen(captured.payload)).toBe(true);
  });
});
