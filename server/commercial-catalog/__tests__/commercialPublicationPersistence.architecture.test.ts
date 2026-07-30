/**
 * COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1 — architecture tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  commercialCatalogStore,
  planService,
  planVersionService,
  pricingService,
  featureBundleService,
  limitProfileService,
  migrationPolicyService,
  publicationService,
  CommercialCatalogError,
  getCommercialCatalogHealth,
  setDurablePublicationBackendForTests,
  invalidateCatalogReadyGate,
  ensureCatalogReady,
  InMemoryDurableCatalogBackend,
  COMMERCIAL_PUBLICATION_PERSISTENCE_PROGRAM,
  type DurablePublicationBackend,
} from "../../services/commercial-catalog";
import {
  catalogPublishingService,
  clearAllPublicationOverlays,
  invalidatePublicCatalogCache,
  setPublicCatalogCacheEnabled,
  projectPublicCatalogOfferings,
  listPublicCatalogOfferings,
} from "../publishing";

const root = process.cwd();

function seedPublishable(code: string) {
  const plan = planService.create({
    code,
    name: `Plan ${code}`,
    isHidden: false,
  });
  const version = planVersionService.create({
    planId: plan.id,
    versionCode: "v1",
    versionName: `${code} v1`,
  });
  const monthly =
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
    values: [{ limitKey: "restaurants", value: 1 }],
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
    amount: "9.00",
  });
  return { plan, version };
}

describe("COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1", () => {
  let durable: InMemoryDurableCatalogBackend;

  beforeEach(() => {
    commercialCatalogStore.clear();
    clearAllPublicationOverlays();
    setPublicCatalogCacheEnabled(false);
    invalidatePublicCatalogCache();
    invalidateCatalogReadyGate();
    durable = new InMemoryDurableCatalogBackend();
    setDurablePublicationBackendForTests(durable);
  });

  it("exports persistence program id", () => {
    expect(COMMERCIAL_PUBLICATION_PERSISTENCE_PROGRAM).toBe(
      "COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1"
    );
    const svc = readFileSync(
      resolve(root, "server/commercial-catalog/publishing/catalogPublishingService.ts"),
      "utf8"
    );
    expect(svc).toContain("persistPublishedVersionPublication");
    expect(svc).toContain("publication_persistence_failed");
  });

  it("memory-only PublicationService.publish cannot masquerade as durable published catalog", async () => {
    const { version } = seedPublishable("mem-only");
    publicationService.publish(version.id);
    expect(planVersionService.get(version.id)?.state).toBe("published");
    expect(projectPublicCatalogOfferings()).toHaveLength(1);

    // Simulate process restart: runtime memory cleared; durable authority empty.
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await durable.hydrateInto(commercialCatalogStore);

    expect(getCommercialCatalogHealth().versions.published).toBe(0);
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
  });

  it("durable publish survives restart / ensureCatalogReady hydration", async () => {
    const { version } = seedPublishable("durable-ok");
    await catalogPublishingService.publish(version.id);

    expect(projectPublicCatalogOfferings()).toHaveLength(1);
    expect(durable.snapshot().versions.some((v) => v.id === version.id)).toBe(
      true
    );

    // Restart simulation
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await ensureCatalogReady();

    expect(getCommercialCatalogHealth().versions.published).toBeGreaterThanOrEqual(
      1
    );
    const offerings = await listPublicCatalogOfferings();
    expect(offerings.some((o) => o.planVersionId === version.id)).toBe(true);
    expect(projectPublicCatalogOfferings().some((o) => o.planVersionId === version.id))
      .toBe(true);
  });

  it("admin health and public pricing observe the same published catalog", async () => {
    const { version } = seedPublishable("same-ssot");
    await catalogPublishingService.publish(version.id);

    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await ensureCatalogReady();

    const healthPublished = getCommercialCatalogHealth().versions.published;
    const publicList = await listPublicCatalogOfferings();
    expect(healthPublished).toBe(publicList.length);
    expect(publicList.map((o) => o.planVersionId).sort()).toEqual(
      planVersionService
        .list()
        .filter((v) => v.state === "published")
        .map((v) => v.id)
        .sort()
    );
  });

  it("persistence failure rolls back memory published state (atomic)", async () => {
    const { version } = seedPublishable("rollback");
    const failing: DurablePublicationBackend = {
      kind: "memory",
      async persistPublishedVersion() {
        throw new Error("forced_persist_failure");
      },
      async persistVersionLifecycle() {
        throw new Error("forced_persist_failure");
      },
      async hydrateInto() {
        /* no-op */
      },
    };
    setDurablePublicationBackendForTests(failing);

    await expect(catalogPublishingService.publish(version.id)).rejects.toThrow(
      /Persistent publication failed/i
    );
    expect(planVersionService.get(version.id)?.state).toBe("draft");
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
  });

  it("refusing duplicate durable identities keeps single published version id", async () => {
    const { version } = seedPublishable("once");
    await catalogPublishingService.publish(version.id);
    const firstSnap = durable.snapshot();
    const publishedRows = firstSnap.versions.filter((v) => v.state === "published");
    expect(publishedRows).toHaveLength(1);

    // Re-persist same published graph (idempotent upsert) — still one identity.
    await durable.persistPublishedVersion(version.id, commercialCatalogStore);
    const second = durable.snapshot().versions.filter((v) => v.id === version.id);
    expect(second).toHaveLength(1);
  });

  it("cache invalidation after durable publish still serves from durable authority", async () => {
    setPublicCatalogCacheEnabled(true);
    const { version } = seedPublishable("cache");
    expect(projectPublicCatalogOfferings()).toHaveLength(0);

    await catalogPublishingService.publish(version.id);
    invalidatePublicCatalogCache();

    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await ensureCatalogReady();

    expect(projectPublicCatalogOfferings()).toHaveLength(1);
    expect(projectPublicCatalogOfferings()[0]!.planVersionId).toBe(version.id);
  });
});
