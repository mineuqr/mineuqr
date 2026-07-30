/**
 * COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 — superseded wiring checks
 * COMMERCIAL-PROJECTION-GENERATION-1 — Catalog filter = Projection SSOT.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CAPABILITY_FILTER_KEYS,
  COMMERCIAL_CAPABILITY_FILTER_REGISTRY,
  DISCOVERY_CAPABILITY_CLASSIFICATION,
  assertCommercialCapabilityFilterKeys,
  listCommercializableDiscoveryCaps,
  COMMERCIAL_CAPABILITY_PLATFORM_ADOPTION_PROGRAM,
  COMMERCIAL_PROJECTION_PROGRAM,
} from "@shared/commercial-capability";
import { FEATURE_KEYS } from "@commercial/featureKeys";
import { COMMERCIAL_PROJECTION_IDS } from "@shared/commercial-projection";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 (projection successor)", () => {
  it("exports program ids and Discovery ELIGIBLE classification", () => {
    expect(COMMERCIAL_CAPABILITY_PLATFORM_ADOPTION_PROGRAM).toBe(
      "COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1"
    );
    expect(COMMERCIAL_PROJECTION_PROGRAM).toBe(
      "COMMERCIAL-PROJECTION-GENERATION-1"
    );
    expect(DISCOVERY_CAPABILITY_CLASSIFICATION.length).toBe(
      listCommercializableDiscoveryCaps().length
    );
    expect(DISCOVERY_CAPABILITY_CLASSIFICATION.length).toBe(17);
  });

  it("Catalog FILTER_KEYS are Projection IDs; FEATURE_KEYS is Runtime superset", () => {
    expect([...COMMERCIAL_CAPABILITY_FILTER_KEYS]).toEqual([
      ...COMMERCIAL_PROJECTION_IDS,
    ]);
    expect(COMMERCIAL_CAPABILITY_FILTER_REGISTRY).toHaveLength(
      COMMERCIAL_CAPABILITY_FILTER_KEYS.length
    );
    for (const key of COMMERCIAL_CAPABILITY_FILTER_KEYS) {
      expect(FEATURE_KEYS).toContain(key);
    }
    for (const row of COMMERCIAL_CAPABILITY_FILTER_REGISTRY) {
      expect(row.class).toBe("commercializable");
      expect(row.productionImplemented).toBe(true);
      expect(row.discoveryCapIds.length).toBeGreaterThan(0);
      expect(row.runtimeCapabilityId.startsWith("cap.")).toBe(true);
    }
  });

  it("rejects unknown capability filter keys; accepts Projection + aliases", () => {
    expect(assertCommercialCapabilityFilterKeys(["ordering"]).ok).toBe(true);
    const bad = assertCommercialCapabilityFilterKeys([
      "ordering",
      "notARealCapability",
    ]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.invalid).toContain("notARealCapability");
  });

  it("Catalog UI and display helpers re-export filter SSOT", () => {
    const helpers = read(
      "client/src/components/admin/platform-ops/commercial-catalog/catalogUiHelpers.ts"
    );
    const display = read(
      "client/src/components/admin/platform-ops/commercial-catalog/catalogCommercialDisplay.ts"
    );
    expect(helpers).toContain("@shared/commercial-capability");
    expect(helpers).toContain("COMMERCIAL_CAPABILITY_FILTER_KEYS");
    expect(helpers).not.toMatch(/"qrMenu",\s*"categories"/);
    expect(display).toContain("COMMERCIAL_CAPABILITY_FILTER_KEYS");
  });

  it("FeatureBundleService validates capability filter keys", () => {
    const svc = read("server/services/commercial-catalog/index.ts");
    expect(svc).toContain("assertCommercialCapabilityFilterKeys");
    expect(svc).toContain("isCommercialLimitFilterKey");
    expect(svc).toContain("invalid_capability_filter");
  });

  it("Pricing remains Published Offerings only (I-CPP-01)", () => {
    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).toContain("commercialCatalog.public.listOfferings");
    expect(pricing).not.toMatch(/subscription\.listPlans/);
    expect(pricing).not.toMatch(/COMMERCIAL_CAPABILITY_FILTER_KEYS/);
    expect(pricing).not.toMatch(/DISCOVERY_CAPABILITY/);
  });

  it("featureKeys module delegates Runtime keys to commercial-capability", () => {
    const keys = read("src/lib/commercial/featureKeys.ts");
    expect(keys).toContain("@shared/commercial-capability");
    expect(keys).toContain("RUNTIME_ENTITLEMENT_FEATURE_KEYS as FEATURE_KEYS");
  });
});
