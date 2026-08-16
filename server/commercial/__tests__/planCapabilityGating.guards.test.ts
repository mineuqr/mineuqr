/**
 * COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG_PROMOTED_PROJECTION_IDS } from "@shared/commercial-projection";
import { FEATURE_KEYS } from "@commercial/featureKeys";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1 guards", () => {
  it("registers the four keys as Projection / FEATURE_KEYS identities", () => {
    expect([...CATALOG_PROMOTED_PROJECTION_IDS]).toEqual([
      "sessionTableManagement",
      "menuManagement",
      "menuDesign",
      "smartQr",
    ]);
    for (const key of CATALOG_PROMOTED_PROJECTION_IDS) {
      expect(FEATURE_KEYS).toContain(key);
    }
  });

  it("Plan Editor cards are configurable Projection keys", () => {
    const registry = read("shared/commercial-catalog-presentation/registry.ts");
    expect(registry).toContain('presentationId: "sessionTableManagement"');
    expect(registry).toContain('projectionKeys: ["sessionTableManagement"]');
    expect(registry).not.toMatch(
      /presentationId: "sessionTableManagement"[\s\S]{0,200}alwaysEnabled: true/
    );
    expect(registry).not.toMatch(
      /Always-on commercial presentation \(core platform value\)/
    );
  });

  it("routers enforce requireRestaurantPlanFeature on contracted procedures", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("requireRestaurantPlanFeature");
    expect(routers).toContain('requireRestaurantPlanFeature(input.restaurantId, "sessionTableManagement")');
    expect(routers).toContain('requireRestaurantPlanFeature(input.restaurantId, "menuManagement")');
    expect(routers).toContain('requireRestaurantPlanFeature(input.id, "menuDesign")');
    expect(routers).toContain('requireRestaurantPlanFeature(input.restaurantId, "smartQr")');
    expect(routers).not.toContain("isSubscriptionActive");
    expect(routers).not.toMatch(/if \(ctx\.user\.role !== "admin"\) \{\s*if \(!\(await isSubscriptionActive/);
  });

  it("session gate does not own table CRUD", () => {
    const routers = read("server/routers.ts");
    const tableCreate = routers.slice(
      routers.indexOf("return createTable(input)"),
      routers.indexOf("return createTable(input)") + 1
    );
    void tableCreate;
    expect(routers).toMatch(
      /requireRestaurantPlanFeature\(input\.restaurantId, "smartQr"\);\s*return createTable/
    );
    expect(routers).not.toMatch(
      /requireRestaurantPlanFeature\([^)]+"sessionTableManagement"\);\s*return createTable/
    );
  });

  it("does not hardcode plan names for authorization", () => {
    const adapter = read(
      "server/subscription-runtime/requireRestaurantPlanFeature.ts"
    );
    expect(adapter).not.toMatch(/plan === ["']basic["']/i);
    expect(adapter).not.toMatch(/if \(isOwner\) return true/);
    expect(adapter).toContain("requireFeature(restaurant.userId, featureKey");
  });

  it("seed is Always-On preservation only", () => {
    const seed = read(
      "server/services/commercial-catalog/seedCatalogPromotedCapabilities.ts"
    );
    expect(seed).toContain("CATALOG_PROMOTED_PROJECTION_IDS");
    expect(seed).toContain("included=true");
    expect(seed).not.toMatch(/BASIC.*=.*OFF/);
    expect(seed).toContain("Do not run against Production");
  });
});
