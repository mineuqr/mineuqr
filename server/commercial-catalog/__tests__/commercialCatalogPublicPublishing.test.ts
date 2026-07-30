/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1 — workflow, visibility, public read model.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM,
  resolvePublicationWorkflowState,
  visibilityForWorkflowState,
  PLAN_SELECTION_VISIBLE_STATES,
} from "@shared/commercial-catalog";
import {
  commercialCatalogStore,
  planService,
  planVersionService,
  pricingService,
  featureBundleService,
  limitProfileService,
  migrationPolicyService,
  CommercialCatalogError,
  setDurablePublicationBackendForTests,
  invalidateCatalogReadyGate,
} from "../../services/commercial-catalog";
import {
  catalogPublishingService,
  clearAllPublicationOverlays,
  invalidatePublicCatalogCache,
  setPublicCatalogCacheEnabled,
  projectPublicCatalogOfferings,
  projectPublicCatalogOffering,
  assertPublicCatalogNotEntitlementAuthority,
} from "../publishing";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

function seedPublishableVersion(code = "pub-plan") {
  const plan = planService.create({ code, name: `Plan ${code}` });
  const version = planVersionService.create({
    planId: plan.id,
    versionCode: "v1",
    versionName: `${code} v1`,
  });
  const cycle =
    pricingService.listBillingCycles().find((c) => c.code === "monthly") ??
    pricingService.createBillingCycle({
      code: "monthly",
      name: "Monthly",
      intervalCount: 1,
      intervalUnit: "month",
    });
  if (!pricingService.listBillingCycles().find((c) => c.code === "yearly")) {
    pricingService.createBillingCycle({
      code: "yearly",
      name: "Yearly",
      intervalCount: 1,
      intervalUnit: "year",
    });
  }
  const bundle = featureBundleService.create({
    code: `${code}-feat`,
    name: "Features",
    features: [{ featureKey: "ordering" }],
  });
  const profile = limitProfileService.create({
    code: `${code}-lim`,
    name: "Limits",
    values: [{ limitKey: "restaurants", value: 3 }],
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
    billingCycleId: cycle.id,
    currency: "USD",
    amount: "29.00",
  });
  return { plan, version };
}

describe("COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1 contracts", () => {
  it("exports program id and selection remains published-only", () => {
    expect(COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1"
    );
    expect(PLAN_SELECTION_VISIBLE_STATES).toEqual(["published"]);
  });

  it("wires public + publishing routers without subscription-runtime imports", () => {
    const router = read(
      "server/api/commercialCatalog/commercialCatalogPublicRouter.ts"
    );
    expect(router).toContain("commercialCatalogPublicRouter");
    expect(router).toContain("listOfferings");
    expect(router).not.toMatch(/subscription-runtime/);
    expect(router).not.toMatch(/hasFeature|checkEntitlement|requireFeature/);

    const parent = read(
      "server/api/commercialCatalog/commercialCatalogRouter.ts"
    );
    expect(parent).toContain("commercialCatalogPublicRouter");
    expect(parent).toContain("commercialCatalogPublishingRouter");
    expect(parent).toContain("public:");
    expect(parent).toContain("publishing:");
  });

  it("asserts published catalog is not entitlement authority", () => {
    const a = assertPublicCatalogNotEntitlementAuthority();
    expect(a.entitlementAuthority).toBe("subscription-runtime");
    expect(a.publishedCatalogParticipatesInEntitlement).toBe(false);
    expect(a.runtimeConsumesMutableCatalog).toBe(false);
  });
});

describe("publication workflow visibility rules", () => {
  it("maps foundation + overlay to workflow states", () => {
    expect(
      resolvePublicationWorkflowState({ foundationState: "draft" })
    ).toBe("draft");
    expect(
      resolvePublicationWorkflowState({
        foundationState: "draft",
        approved: true,
      })
    ).toBe("approved");
    expect(
      resolvePublicationWorkflowState({
        foundationState: "draft",
        approved: true,
        scheduledEffectiveAt: "2099-01-01T00:00:00.000Z",
        now: new Date("2026-01-01T00:00:00.000Z"),
      })
    ).toBe("scheduled");
    expect(
      resolvePublicationWorkflowState({ foundationState: "published" })
    ).toBe("published");
    expect(
      resolvePublicationWorkflowState({ foundationState: "deprecated" })
    ).toBe("deprecated");
    expect(
      resolvePublicationWorkflowState({ foundationState: "retired" })
    ).toBe("retired");
    expect(
      resolvePublicationWorkflowState({
        foundationState: "retired",
        archived: true,
      })
    ).toBe("archived");
  });

  it("enforces public visibility matrix", () => {
    expect(visibilityForWorkflowState("published")).toMatchObject({
      publiclyBrowsable: true,
      openForNewAdoption: true,
      publiclyInaccessible: false,
    });
    expect(visibilityForWorkflowState("deprecated")).toMatchObject({
      publiclyBrowsable: false,
      historicallyAddressable: true,
      openForNewAdoption: false,
    });
    expect(visibilityForWorkflowState("draft").publiclyInaccessible).toBe(true);
    expect(visibilityForWorkflowState("archived").publiclyInaccessible).toBe(
      true
    );
    expect(visibilityForWorkflowState("retired").publiclyInaccessible).toBe(
      true
    );
  });
});

describe("CatalogPublishingService + public read model", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    clearAllPublicationOverlays();
    setPublicCatalogCacheEnabled(false);
    invalidatePublicCatalogCache();
    setDurablePublicationBackendForTests(null);
    invalidateCatalogReadyGate();
  });

  it("keeps drafts private and publishes for public browse", async () => {
    const { version } = seedPublishableVersion("alpha");
    expect(catalogPublishingService.getStatus(version.id).workflowState).toBe(
      "draft"
    );
    expect(() => projectPublicCatalogOffering(version.id)).toThrow(
      /not publicly accessible/i
    );
    expect(projectPublicCatalogOfferings()).toHaveLength(0);

    catalogPublishingService.approveVersion(version.id);
    expect(catalogPublishingService.getStatus(version.id).workflowState).toBe(
      "approved"
    );
    expect(projectPublicCatalogOfferings()).toHaveLength(0);

    const { version: published } = await catalogPublishingService.publish(
      version.id,
      {},
      { enforceWorkflow: true }
    );
    expect(published.state).toBe("published");
    const list = projectPublicCatalogOfferings();
    expect(list).toHaveLength(1);
    expect(list[0]!.planVersionId).toBe(version.id);
    expect(list[0]!.workflowState).toBe("published");
    expect(list[0]!.visibility.openForNewAdoption).toBe(true);
  });

  it("requires approve before schedule; schedule before workflow publish", () => {
    const { version } = seedPublishableVersion("sched");
    expect(() =>
      catalogPublishingService.schedulePublish(
        version.id,
        "2099-06-01T00:00:00.000Z"
      )
    ).toThrow(CommercialCatalogError);

    catalogPublishingService.approveVersion(version.id);
    catalogPublishingService.schedulePublish(
      version.id,
      "2099-06-01T00:00:00.000Z"
    );
    expect(catalogPublishingService.getStatus(version.id).workflowState).toBe(
      "scheduled"
    );
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
  });

  it("exposes deprecated historically but not for browse/adoption; archives hide retired", async () => {
    const { version } = seedPublishableVersion("hist");
    await catalogPublishingService.publish(version.id);
    await catalogPublishingService.deprecate(version.id);

    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    const hist = projectPublicCatalogOffering(version.id);
    expect(hist.workflowState).toBe("deprecated");
    expect(hist.visibility.historicallyAddressable).toBe(true);
    expect(hist.visibility.openForNewAdoption).toBe(false);

    await catalogPublishingService.retire(version.id);
    expect(() => projectPublicCatalogOffering(version.id)).toThrow(
      /not publicly accessible/i
    );

    catalogPublishingService.archiveVersion(version.id);
    expect(catalogPublishingService.getStatus(version.id).workflowState).toBe(
      "archived"
    );
    expect(() => projectPublicCatalogOffering(version.id)).toThrow(
      /not publicly accessible/i
    );
  });

  it("does not import subscription-runtime into publishing module", () => {
    const svc = read(
      "server/commercial-catalog/publishing/catalogPublishingService.ts"
    );
    const rm = read(
      "server/commercial-catalog/publishing/publicCatalogReadModel.ts"
    );
    expect(svc).not.toMatch(/from ["'].*subscription-runtime/);
    expect(rm).not.toMatch(/from ["'].*subscription-runtime/);
    expect(svc).not.toMatch(/hasFeature|checkEntitlement|requireFeature/);
    expect(rm).not.toMatch(/hasFeature|checkEntitlement|requireFeature/);
    // Documentary isolation marker only (not a runtime import):
    expect(rm).toContain('entitlementAuthority: "subscription-runtime"');
  });
});
