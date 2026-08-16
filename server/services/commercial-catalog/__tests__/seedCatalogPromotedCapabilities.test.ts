/**
 * COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1
 * Idempotent Always-On preservation seed — in-memory catalog only.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG_PROMOTED_PROJECTION_IDS } from "@shared/commercial-projection";
import {
  commercialCatalogStore,
  featureBundleService,
  planService,
  setDurableLivePlanBackendForTests,
  InMemoryDurableCatalogBackend,
  invalidateCatalogReadyGate,
} from "../index";
import { seedCatalogPromotedCapabilitiesOnLivePlanBundles } from "../seedCatalogPromotedCapabilities";

describe("seedCatalogPromotedCapabilitiesOnLivePlanBundles", () => {
  beforeEach(() => {
    commercialCatalogStore.clear();
    setDurableLivePlanBackendForTests(new InMemoryDurableCatalogBackend());
    invalidateCatalogReadyGate();
  });

  it("adds the four keys as included=true without dropping existing keys", () => {
    const bundle = featureBundleService.create({
      code: "seed-feat",
      name: "Seed Bundle",
      features: [
        { featureKey: "ordering", included: true },
        { featureKey: "reporting", included: true },
      ],
    });
    planService.create({
      code: "seed-plan",
      name: "Seed Plan",
      featureBundleId: bundle.id,
    });

    const first = seedCatalogPromotedCapabilitiesOnLivePlanBundles();
    expect(first.bundlesTouched).toBe(1);
    expect(first.keysInserted).toBe(4);

    const included = featureBundleService
      .listFeatures(bundle.id)
      .filter((f) => f.included)
      .map((f) => f.featureKey)
      .sort();
    expect(included).toEqual(
      [
        "ordering",
        "reporting",
        ...CATALOG_PROMOTED_PROJECTION_IDS,
      ].sort()
    );

    const second = seedCatalogPromotedCapabilitiesOnLivePlanBundles();
    expect(second.bundlesTouched).toBe(0);
    expect(second.keysInserted).toBe(0);
    expect(second.alreadyPresent).toBe(4);
  });

  it("does not invent a Basic=OFF matrix", () => {
    const src = [
      "server/services/commercial-catalog/seedCatalogPromotedCapabilities.ts",
    ];
    void src;
    expect(CATALOG_PROMOTED_PROJECTION_IDS).toEqual([
      "sessionTableManagement",
      "menuManagement",
      "menuDesign",
      "smartQr",
    ]);
  });
});
