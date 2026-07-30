/**
 * COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 — SSOT + filter adoption guards.
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
  listInternalOnlyDiscoveryCaps,
  COMMERCIAL_CAPABILITY_PLATFORM_ADOPTION_PROGRAM,
} from "@shared/commercial-capability";
import { FEATURE_KEYS } from "@commercial/featureKeys";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1", () => {
  it("exports program id and complete discovery classification", () => {
    expect(COMMERCIAL_CAPABILITY_PLATFORM_ADOPTION_PROGRAM).toBe(
      "COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1"
    );
    expect(DISCOVERY_CAPABILITY_CLASSIFICATION).toHaveLength(46);
    for (const row of DISCOVERY_CAPABILITY_CLASSIFICATION) {
      expect(["commercializable", "internal_only"]).toContain(row.class);
    }
    expect(
      listCommercializableDiscoveryCaps().length +
        listInternalOnlyDiscoveryCaps().length
    ).toBe(46);
  });

  it("FEATURE_KEYS is Capability Filter SSOT (no duplicate hardcoded list)", () => {
    expect([...FEATURE_KEYS]).toEqual([...COMMERCIAL_CAPABILITY_FILTER_KEYS]);
    expect(COMMERCIAL_CAPABILITY_FILTER_REGISTRY).toHaveLength(
      COMMERCIAL_CAPABILITY_FILTER_KEYS.length
    );
    for (const row of COMMERCIAL_CAPABILITY_FILTER_REGISTRY) {
      expect(row.class).toBe("commercializable");
      expect(row.productionImplemented).toBe(true);
      expect(row.discoveryCapIds.length).toBeGreaterThan(0);
      expect(row.runtimeCapabilityId.startsWith("cap.")).toBe(true);
    }
  });

  it("rejects unknown capability filter keys", () => {
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

  it("featureKeys module delegates to commercial-capability registry", () => {
    const keys = read("src/lib/commercial/featureKeys.ts");
    expect(keys).toContain("@shared/commercial-capability");
    expect(keys).toContain("COMMERCIAL_CAPABILITY_FILTER_KEYS as FEATURE_KEYS");
  });
});
