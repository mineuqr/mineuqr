/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — bootstrap + public catalog + save.
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
  isPersistentCatalogUninitialized,
} from "../../services/commercial-catalog";
import {
  projectPublicCatalogOfferings,
  invalidatePublicCatalogCache,
} from "../publishing";

const root = process.cwd();

describe("Live Commercial Plans bootstrap and public catalog", () => {
  let durable: InMemoryDurableCatalogBackend;

  beforeEach(async () => {
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    invalidatePublicCatalogCache();
    durable = new InMemoryDurableCatalogBackend();
    setDurableLivePlanBackendForTests(durable);
  });

  it("bootstraps three live standard plans without publication", async () => {
    const src = readFileSync(
      resolve(root, "server/services/commercial-catalog/persistentCatalogBootstrap.ts"),
      "utf8"
    );
    expect(src).not.toContain("catalogPublishingService.publish");
    expect(src).toContain("persistFullCatalog");

    const first = await bootstrapPersistentCommercialCatalog();
    expect(first.bootstrapped).toBe(true);
    expect(first.livePlans).toBe(3);
    expect(planService.list().map((p) => p.code).sort()).toEqual([
      "basic",
      "enterprise",
      "professional",
    ]);

    const second = await bootstrapPersistentCommercialCatalog();
    expect(second.bootstrapped).toBe(false);
    expect(second.reason).toBe("already_initialized");
    expect(second.livePlans).toBe(first.livePlans);
  });

  it("does not republish when catalog already initialized", async () => {
    await bootstrapPersistentCommercialCatalog();
    const before = projectPublicCatalogOfferings().map((o) => o.planId).sort();
    commercialCatalogStore.clear();
    invalidateCatalogReadyGate();
    await durable.hydrateInto(commercialCatalogStore);
    expect(isPersistentCatalogUninitialized()).toBe(false);
    const again = await bootstrapPersistentCommercialCatalog();
    expect(again.bootstrapped).toBe(false);
    expect(projectPublicCatalogOfferings().map((o) => o.planId).sort()).toEqual(
      before
    );
  });

  it("exposes live plans on the public catalog immediately", async () => {
    await bootstrapPersistentCommercialCatalog();
    const offerings = projectPublicCatalogOfferings();
    expect(offerings.length).toBe(3);
    expect(offerings.every((o) => o.planId && o.planCode)).toBe(true);
    expect(offerings.some((o) => o.planCode === "professional")).toBe(true);
    const pro = offerings.find((o) => o.planCode === "professional")!;
    expect(pro.priceMonthly).toBeTruthy();
    expect(pro.featureKeys.length).toBeGreaterThan(0);
  });

  it("propagates live plan edits to public catalog after save", async () => {
    await bootstrapPersistentCommercialCatalog();
    const pro = planService.getByCode("professional")!;
    await planService.saveLive(pro.id, { name: "Professional Plus" });
    invalidatePublicCatalogCache();
    const offerings = projectPublicCatalogOfferings();
    expect(offerings.find((o) => o.planId === pro.id)?.planName).toBe(
      "Professional Plus"
    );
    expect(pricingService.currentPriceForPlan(pro.id, "monthly")?.amount).toBe(
      "26.40"
    );
  });
});
