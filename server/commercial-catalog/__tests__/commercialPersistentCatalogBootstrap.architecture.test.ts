/**
 * COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1 — architecture tests.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCIAL_PROJECTION_IDS } from "@shared/commercial-projection";
import {
  commercialCatalogStore,
  setDurablePublicationBackendForTests,
  invalidateCatalogReadyGate,
  InMemoryDurableCatalogBackend,
  bootstrapPersistentCommercialCatalog,
  projectionFeatureKeysForBridgePlan,
  COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM,
  ensureCatalogReady,
  getCommercialCatalogHealth,
} from "../../services/commercial-catalog";
import {
  clearAllPublicationOverlays,
  invalidatePublicCatalogCache,
  setPublicCatalogCacheEnabled,
  projectPublicCatalogOfferings,
  listPublicCatalogOfferings,
} from "../publishing";

const root = process.cwd();

describe("COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1", () => {
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

  it("exports program and derives capability keys from Projection + Presentation", () => {
    expect(COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM).toBe(
      "COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1"
    );
    const basic = projectionFeatureKeysForBridgePlan("BASIC");
    expect(basic).toContain("ordering");
    expect(basic).toContain("printing");
    expect(basic).toContain("realtime");
    for (const key of basic) {
      expect(COMMERCIAL_PROJECTION_IDS).toContain(key);
    }
    const src = readFileSync(
      resolve(
        root,
        "server/services/commercial-catalog/persistentCatalogBootstrap.ts"
      ),
      "utf8"
    );
    expect(src).toContain("listProjectionIdsForCommercialPlan");
    expect(src).toContain("applyCommercialPresentationRules");
    expect(src).toContain("catalogPublishingService.publish");
    expect(src).not.toMatch(/DEFAULT_FEATURES/);
  });

  it("bootstraps only when durable catalog has no published versions", async () => {
    const first = await bootstrapPersistentCommercialCatalog();
    expect(first.bootstrapped).toBe(true);
    expect(first.reason).toBe("bootstrapped");
    expect(first.publishedVersions).toBeGreaterThan(0);
    expect(first.planCount).toBeGreaterThan(0);
    expect(first.billingCycleCount).toBeGreaterThan(0);
    expect(first.priceCount).toBeGreaterThan(0);
    expect(first.capabilityMappingCount).toBeGreaterThan(0);

    const second = await bootstrapPersistentCommercialCatalog();
    expect(second.bootstrapped).toBe(false);
    expect(second.reason).toBe("already_published");
    expect(second.publishedVersions).toBe(first.publishedVersions);
    expect(second.planCount).toBe(first.planCount);
  });

  it("is idempotent — no duplicate plans, versions, cycles, or prices", async () => {
    await bootstrapPersistentCommercialCatalog();
    const plans1 = commercialCatalogStore.plans.size;
    const versions1 = commercialCatalogStore.versions.size;
    const cycles1 = commercialCatalogStore.billingCycles.size;
    const prices1 = commercialCatalogStore.prices.size;
    const codes = [...commercialCatalogStore.plans.values()].map((p) => p.code);

    await bootstrapPersistentCommercialCatalog();
    expect(commercialCatalogStore.plans.size).toBe(plans1);
    expect(commercialCatalogStore.versions.size).toBe(versions1);
    expect(commercialCatalogStore.billingCycles.size).toBe(cycles1);
    expect(commercialCatalogStore.prices.size).toBe(prices1);
    expect(
      [...commercialCatalogStore.plans.values()].map((p) => p.code).sort()
    ).toEqual([...codes].sort());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("survives restart hydrate and exposes identical admin/public published data", async () => {
    await bootstrapPersistentCommercialCatalog();
    const before = projectPublicCatalogOfferings().map((o) => o.planVersionId).sort();
    expect(before.length).toBeGreaterThan(0);

    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    await ensureCatalogReady();

    expect(getCommercialCatalogHealth().versions.published).toBe(before.length);
    const after = (await listPublicCatalogOfferings())
      .map((o) => o.planVersionId)
      .sort();
    expect(after).toEqual(before);
    expect(projectPublicCatalogOfferings().map((o) => o.planVersionId).sort()).toEqual(
      before
    );
  });

  it("ensureCatalogReady delegates empty catalog to bootstrap (no DEFAULT_FEATURES seed)", async () => {
    const seed = readFileSync(
      resolve(root, "server/services/commercial-catalog/seedAdoptionCatalog.ts"),
      "utf8"
    );
    expect(seed).toContain("bootstrapPersistentCommercialCatalog");
    expect(seed).not.toContain("DEFAULT_FEATURES");
    expect(seed).not.toContain("DEFAULT_PRICES");

    await ensureCatalogReady();
    expect(getCommercialCatalogHealth().versions.published).toBeGreaterThan(0);
    expect(projectPublicCatalogOfferings().length).toBeGreaterThan(0);
  });
});
