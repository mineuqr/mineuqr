/**
 * COMMERCIAL-PROJECTION-GENERATION-1 — Projection SSOT + Catalog/Runtime wiring guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CAPABILITY_FILTER_KEYS,
  COMMERCIAL_CAPABILITY_FILTER_REGISTRY,
  DISCOVERY_CAPABILITY_CLASSIFICATION,
  assertCommercialCapabilityFilterKeys,
  normalizeFeatureKeysForProjection,
  COMMERCIAL_PROJECTION_PROGRAM,
  RUNTIME_ENTITLEMENT_FEATURE_KEYS,
} from "@shared/commercial-capability";
import {
  COMMERCIAL_PROJECTION_IDS,
  COMMERCIAL_PROJECTION_REGISTRY,
  expandFeatureKeysForRuntime,
  generateCommercialProjectionRegistry,
} from "@shared/commercial-projection";
import { DISCOVERY_COMMERCIAL_ELIGIBLE } from "@shared/capability-discovery";
import { FEATURE_KEYS } from "@commercial/featureKeys";
import { CAPABILITY_ENTITLEMENT_MATRIX } from "../../../server/subscription-runtime/capabilityMatrix";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-PROJECTION-GENERATION-1", () => {
  it("generates projection solely from Discovery ELIGIBLE (no orphans)", () => {
    expect(COMMERCIAL_PROJECTION_PROGRAM).toBe(
      "COMMERCIAL-PROJECTION-GENERATION-1"
    );
    expect(DISCOVERY_COMMERCIAL_ELIGIBLE).toHaveLength(17);
    expect(COMMERCIAL_PROJECTION_REGISTRY).toHaveLength(
      COMMERCIAL_PROJECTION_IDS.length
    );
    expect(COMMERCIAL_PROJECTION_IDS).toHaveLength(19);
    // Regeneration is deterministic and covers every eligible CAP.
    expect(generateCommercialProjectionRegistry()).toEqual([
      ...COMMERCIAL_PROJECTION_REGISTRY,
    ]);
    const covered = new Set(
      COMMERCIAL_PROJECTION_REGISTRY.flatMap((r) => [
        ...r.discoveryCapabilityIds,
      ])
    );
    for (const cap of DISCOVERY_COMMERCIAL_ELIGIBLE) {
      expect(covered.has(cap.capabilityId)).toBe(true);
    }
  });

  it("Catalog filter keys are Projection IDs only (not legacy FEATURE_KEYS list)", () => {
    expect([...COMMERCIAL_CAPABILITY_FILTER_KEYS]).toEqual([
      ...COMMERCIAL_PROJECTION_IDS,
    ]);
    expect(COMMERCIAL_CAPABILITY_FILTER_REGISTRY).toHaveLength(19);
    for (const row of COMMERCIAL_CAPABILITY_FILTER_REGISTRY) {
      expect(row.discoveryCapIds.length).toBeGreaterThan(0);
      expect(row.runtimeCapabilityId.startsWith("cap.")).toBe(true);
      expect(row.class).toBe("commercializable");
    }
    expect(COMMERCIAL_CAPABILITY_FILTER_KEYS).not.toContain("qrMenu");
    expect(COMMERCIAL_CAPABILITY_FILTER_KEYS).not.toContain("cart");
    expect(COMMERCIAL_CAPABILITY_FILTER_KEYS).toContain("kitchen");
    expect(COMMERCIAL_CAPABILITY_FILTER_KEYS).toContain("ordering");
  });

  it("FEATURE_KEYS is Runtime vocabulary = Projection ∪ Legacy Compat", () => {
    expect([...FEATURE_KEYS]).toEqual([...RUNTIME_ENTITLEMENT_FEATURE_KEYS]);
    expect(FEATURE_KEYS).toContain("ordering");
    expect(FEATURE_KEYS).toContain("kitchen");
    expect(FEATURE_KEYS).toContain("templates");
    expect(FEATURE_KEYS).toContain("qrMenu");
  });

  it("normalizes legacy aliases to Projection; rejects deprecated orphans for Catalog", () => {
    expect(assertCommercialCapabilityFilterKeys(["ordering"]).ok).toBe(true);
    expect(assertCommercialCapabilityFilterKeys(["kitchen"]).ok).toBe(true);
    const alias = assertCommercialCapabilityFilterKeys(["reports", "callWaiter"]);
    expect(alias.ok).toBe(true);
    if (alias.ok) {
      expect(alias.normalized).toEqual(["reporting", "waiter"]);
    }
    const bad = assertCommercialCapabilityFilterKeys(["notARealCapability"]);
    expect(bad.ok).toBe(false);
    const deprecated = assertCommercialCapabilityFilterKeys(["qrMenu"]);
    expect(deprecated.ok).toBe(false);
    expect(normalizeFeatureKeysForProjection(["reports", "excelExport", "ordering"])).toEqual([
      "reporting",
      "ordering",
    ]);
  });

  it("Runtime expands legacy snapshot keys onto Projection IDs", () => {
    const expanded = expandFeatureKeysForRuntime([
      "ordering",
      "reports",
      "callWaiter",
      "templates",
    ]);
    expect(expanded.has("ordering")).toBe(true);
    expect(expanded.has("reporting")).toBe(true);
    expect(expanded.has("reports")).toBe(true);
    expect(expanded.has("waiter")).toBe(true);
    expect(expanded.has("callWaiter")).toBe(true);
    expect(expanded.has("templates")).toBe(true);
  });

  it("capability matrix maps every Projection runtimeCapabilityId", () => {
    for (const row of COMMERCIAL_PROJECTION_REGISTRY) {
      const hit = CAPABILITY_ENTITLEMENT_MATRIX.find(
        (m) => m.capabilityId === row.runtimeCapabilityId
      );
      expect(hit?.entitlementKey).toBe(row.projectionId);
    }
  });

  it("Catalog UI and public read consume Projection (not Discovery / not raw FEATURE_KEYS list)", () => {
    const helpers = read(
      "client/src/components/admin/platform-ops/commercial-catalog/catalogUiHelpers.ts"
    );
    const publicRead = read(
      "server/commercial-catalog/publishing/publicCatalogReadModel.ts"
    );
    const featureKeysMod = read("src/lib/commercial/featureKeys.ts");
    expect(helpers).toContain("@shared/commercial-capability");
    expect(helpers).toContain("COMMERCIAL_CAPABILITY_FILTER_KEYS");
    expect(publicRead).toContain("normalizeFeatureKeysForProjection");
    expect(featureKeysMod).toContain("RUNTIME_ENTITLEMENT_FEATURE_KEYS as FEATURE_KEYS");
    expect(DISCOVERY_CAPABILITY_CLASSIFICATION).toHaveLength(17);
  });

  it("seed adoption uses Projection IDs", () => {
    const seed = read("server/services/commercial-catalog/persistentCatalogBootstrap.ts");
    expect(seed).toContain("listProjectionIdsForCommercialPlan");
    expect(seed).toContain("COMMERCIAL_PROJECTION_IDS");
    expect(seed).not.toMatch(/DEFAULT_FEATURES[\s\S]*"qrMenu"/);
  });
});
