/**
 * COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1 — architecture tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  commercialCatalogStore,
  setDurablePublicationBackendForTests,
  invalidateCatalogReadyGate,
  InMemoryDurableCatalogBackend,
  bootstrapPersistentCommercialCatalog,
  isPersistentCatalogUninitialized,
  COMMERCIAL_BOOTSTRAP_LIFECYCLE_GOVERNANCE_PROGRAM,
  BOOTSTRAP_01_INFRASTRUCTURE_INITIALIZATION_BOUNDARY,
  ensureCatalogReady,
  getCommercialCatalogHealth,
  planService,
  planVersionService,
} from "../../services/commercial-catalog";
import {
  catalogPublishingService,
  clearAllPublicationOverlays,
  invalidatePublicCatalogCache,
  setPublicCatalogCacheEnabled,
  projectPublicCatalogOfferings,
} from "../publishing";

const root = process.cwd();

describe("COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1", () => {
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

  it("exports BOOTSTRAP-01 and empty-catalog predicate (not published-count)", () => {
    expect(COMMERCIAL_BOOTSTRAP_LIFECYCLE_GOVERNANCE_PROGRAM).toBe(
      "COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1"
    );
    expect(BOOTSTRAP_01_INFRASTRUCTURE_INITIALIZATION_BOUNDARY).toBe(
      "BOOTSTRAP-01"
    );
    expect(isPersistentCatalogUninitialized()).toBe(true);
    const src = readFileSync(
      resolve(
        root,
        "server/services/commercial-catalog/persistentCatalogBootstrap.ts"
      ),
      "utf8"
    );
    expect(src).toContain("BOOTSTRAP-01");
    expect(src).toContain("isPersistentCatalogUninitialized");
    expect(src).toContain('version.state === "draft"');
    expect(src).not.toMatch(
      /existingPublished\.length\s*>\s*0[\s\S]*bootstrapped:\s*false/
    );
    const inv = readFileSync(
      resolve(
        root,
        "docs/engineering/programs/COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1/INVARIANT-REGISTRY.md"
      ),
      "utf8"
    );
    expect(inv).toContain("BOOTSTRAP-01");
    expect(inv).toContain("Infrastructure Initialization Boundary");
  });

  it("bootstrap executes only on a truly empty catalog", async () => {
    expect(isPersistentCatalogUninitialized()).toBe(true);
    const first = await bootstrapPersistentCommercialCatalog();
    expect(first.bootstrapped).toBe(true);
    expect(isPersistentCatalogUninitialized()).toBe(false);

    const again = await bootstrapPersistentCommercialCatalog();
    expect(again.bootstrapped).toBe(false);
    expect(again.reason).toBe("already_initialized");
  });

  it("retired catalog does NOT trigger bootstrap or publish", async () => {
    await bootstrapPersistentCommercialCatalog();
    const publishSpy = vi.spyOn(catalogPublishingService, "publish");

    for (const v of planVersionService.list()) {
      if (v.state === "published") {
        await catalogPublishingService.retire(v.id);
      }
    }
    expect(
      planVersionService.list().every((v) => v.state === "retired")
    ).toBe(true);
    expect(
      planVersionService.list().filter((v) => v.state === "published")
    ).toHaveLength(0);

    durable.replaceFromStore(commercialCatalogStore);

    publishSpy.mockClear();
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();

    const result = await bootstrapPersistentCommercialCatalog();
    expect(result.bootstrapped).toBe(false);
    expect(result.reason).toBe("already_initialized");
    expect(result.versionCount).toBeGreaterThan(0);
    expect(result.publishedVersions).toBe(0);
    expect(publishSpy).not.toHaveBeenCalled();

    await expect(ensureCatalogReady()).resolves.toBeTruthy();
    expect(getCommercialCatalogHealth().versions.retired).toBeGreaterThan(0);
    expect(projectPublicCatalogOfferings()).toHaveLength(0);
    expect(publishSpy).not.toHaveBeenCalled();
    publishSpy.mockRestore();
  });

  it("published catalog does NOT re-bootstrap", async () => {
    await bootstrapPersistentCommercialCatalog();
    const publishSpy = vi.spyOn(catalogPublishingService, "publish");
    publishSpy.mockClear();

    const result = await bootstrapPersistentCommercialCatalog();
    expect(result.reason).toBe("already_initialized");
    expect(result.publishedVersions).toBeGreaterThan(0);
    expect(publishSpy).not.toHaveBeenCalled();
    publishSpy.mockRestore();
  });

  it("draft-only catalog does NOT trigger bootstrap publication", async () => {
    const plan = planService.create({
      code: "draft-only",
      name: "Draft Only",
    });
    planVersionService.create({
      planId: plan.id,
      versionCode: "v1",
      versionName: "Draft v1",
    });
    durable.replaceFromStore(commercialCatalogStore);
    expect(isPersistentCatalogUninitialized()).toBe(false);

    const publishSpy = vi.spyOn(catalogPublishingService, "publish");
    const result = await bootstrapPersistentCommercialCatalog();
    expect(result.bootstrapped).toBe(false);
    expect(result.reason).toBe("already_initialized");
    expect(publishSpy).not.toHaveBeenCalled();
    expect(planVersionService.get(
      planVersionService.list(plan.id)[0]!.id
    )?.state).toBe("draft");
    publishSpy.mockRestore();
  });

  it("ensureCatalogReady hydrates retired catalog without CC-16", async () => {
    await bootstrapPersistentCommercialCatalog();
    for (const v of [...planVersionService.list()]) {
      if (v.state === "published") {
        await catalogPublishingService.retire(v.id);
      }
    }
    durable.replaceFromStore(commercialCatalogStore);

    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();

    await expect(ensureCatalogReady()).resolves.toBeTruthy();
    expect(getCommercialCatalogHealth().status).toBeTruthy();
    expect(
      planVersionService.list().every((v) => v.state === "retired")
    ).toBe(true);
    expect(commercialCatalogStore.lastPublicationError).toBeNull();
  });

  it("bootstrap remains idempotent after governance; restart preserves skip", async () => {
    await bootstrapPersistentCommercialCatalog();
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await ensureCatalogReady();
    const mid = await bootstrapPersistentCommercialCatalog();
    expect(mid.reason).toBe("already_initialized");

    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await ensureCatalogReady();
    expect(getCommercialCatalogHealth().versions.published).toBeGreaterThan(0);
  });
});
