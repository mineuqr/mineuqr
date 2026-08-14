/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — adoption guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CATALOG_ADOPTION_PROGRAM,
  COMMERCIAL_CATALOG_ADOPTION_CONSUMERS,
  LEGACY_COMMERCIAL_SOURCES_SUPERSEDED,
} from "@shared/commercial-catalog";
import { LEGACY_PLAN_BRIDGE } from "../../services/commercial-catalog/legacyPlanBridge";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Live plan adoption contracts", () => {
  it("exports adoption program + consumers without snapshot freeze", () => {
    expect(COMMERCIAL_CATALOG_ADOPTION_PROGRAM).toBe(
      "COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1"
    );
    expect(COMMERCIAL_CATALOG_ADOPTION_CONSUMERS).toContain("plan_selection");
    expect(COMMERCIAL_CATALOG_ADOPTION_CONSUMERS).toContain("feature_resolution");
    expect(COMMERCIAL_CATALOG_ADOPTION_CONSUMERS).not.toContain(
      "commercial_snapshot_creation"
    );
    expect(LEGACY_COMMERCIAL_SOURCES_SUPERSEDED.length).toBeGreaterThan(0);
  });

  it("wires trial bind to live plan", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("listPlansForSelectionLegacyShape");
    const trial = read("server/create-trial-subscription.ts");
    expect(trial).toContain("resolveTrialPolicyFromCatalog");
    expect(trial).toContain("bindSubscriptionToLivePlan");
    expect(trial).not.toContain("createImmutableCommercialSnapshotForSubscription");
  });

  it("keeps three standard plan identities on the legacy bridge", () => {
    expect(LEGACY_PLAN_BRIDGE.map((b) => b.catalogPlanCode)).toEqual([
      "basic",
      "professional",
      "enterprise",
    ]);
    expect(LEGACY_PLAN_BRIDGE.every((b) => !("versionCode" in b))).toBe(true);
  });
});
