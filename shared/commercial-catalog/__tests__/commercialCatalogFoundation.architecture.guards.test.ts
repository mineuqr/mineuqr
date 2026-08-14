/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CATALOG_ARCHITECTURE_PROGRAM,
  COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH,
  COMMERCIAL_CATALOG_DASHBOARD_SECTIONS,
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  COMMERCIAL_LIVE_PLANS_PROGRAM,
  COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN,
  COMMERCIAL_CATALOG_PLATFORM_OWNS,
  PLAN_SAVE_MANDATORY_CHECKS,
  STANDARD_LIVE_PLAN_CODES,
  validateLivePlanSave,
} from "../index";
import { getPlatformOpsSection } from "@/lib/admin/platform-ops/platformOpsSections";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 package", () => {
  it("exports program identity and live-plan ownership", () => {
    expect(COMMERCIAL_CATALOG_FOUNDATION_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1"
    );
    expect(COMMERCIAL_CATALOG_ARCHITECTURE_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1"
    );
    expect(COMMERCIAL_LIVE_PLANS_PROGRAM).toBe(
      "COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1"
    );
    expect(COMMERCIAL_CATALOG_PLATFORM_OWNS).toContain("live_commercial_plans");
    expect(COMMERCIAL_CATALOG_PLATFORM_OWNS).not.toContain("plan_version");
    expect(COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN).toContain("payment_gateways");
    expect(COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN).toContain(
      "subscription_runtime"
    );
    expect(COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH).toBe(
      "/admin/platform/commercial-catalog"
    );
    expect(COMMERCIAL_CATALOG_DASHBOARD_SECTIONS).not.toContain("plan_versions");
    expect(COMMERCIAL_CATALOG_DASHBOARD_SECTIONS).not.toContain(
      "publication_status"
    );
    expect(STANDARD_LIVE_PLAN_CODES).toEqual([
      "basic",
      "professional",
      "enterprise",
    ]);
  });

  it("registers Platform Ops section as live foundation", () => {
    const section = getPlatformOpsSection("commercialCatalog");
    expect(section.path).toBe(COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH);
    expect(section.status).toBe("live");
  });

  it("wires App route and composition without version lifecycle", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform/commercial-catalog"');
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain("platform-ops-ui");
    expect(composition).not.toMatch(/stripe|moyasar|hyperpay/i);
    expect(composition).not.toContain("entitlement");
    expect(composition).not.toContain("VersionsManagementPanel");
    expect(composition).not.toContain("PublicationManagementPanel");
  });

  it("registers tRPC router with live save and without version APIs", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("commercialCatalog: commercialCatalogRouter");
    const api = read(
      "server/api/commercialCatalog/commercialCatalogRouter.ts"
    );
    expect(api).toContain("saveLivePlan");
    expect(api).toContain("validatePlanSave");
    expect(api).not.toContain("publishVersion");
    expect(api).not.toContain("captureSnapshotDefinition");
    expect(api).not.toContain("createVersion");
    expect(api).not.toMatch(/stripe|moyasar|hyperpay|invoice|charge/i);
    expect(api).not.toContain("createSubscription");
  });

  it("includes live-plan schema and migration 0086", () => {
    expect(
      existsSync(resolve(root, "server/db/schema/commercial/tables.ts"))
    ).toBe(true);
    expect(
      existsSync(resolve(root, "drizzle/0086_commercial_live_plans.sql"))
    ).toBe(true);
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("commercialPlans");
    expect(schema).not.toContain("commercialPlanVersions");
    expect(schema).not.toContain("commercialSnapshotDefinitions");
    const tables = read("server/db/schema/commercial/tables.ts");
    expect(tables).toContain("featureBundleId");
    expect(tables).not.toContain("commercial_plan_versions");
  });

  it("save validation fails closed when mandatory components missing", () => {
    const result = validateLivePlanSave({
      plan: {
        id: "p1",
        code: "basic",
        name: "Basic",
        description: null,
        sortOrder: 1,
        isHidden: false,
        featureBundleId: null,
        limitProfileId: null,
        trialPolicyId: null,
        createdAt: "",
        updatedAt: "",
      },
      prices: [],
      billingCycles: [],
      featureBundle: null,
      limitProfile: null,
    });
    expect(result.ok).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("pricing_exists");
    expect(codes).toContain("feature_bundle_exists");
    expect(PLAN_SAVE_MANDATORY_CHECKS).toContain("pricing_exists");
  });

  it("contains no version lifecycle state machine", () => {
    const lifecycle = read("shared/commercial-catalog/types/lifecycle.ts");
    expect(lifecycle).toContain("STANDARD_LIVE_PLAN_CODES");
    expect(lifecycle).not.toContain("draft");
    expect(lifecycle).not.toContain("published");
    expect(lifecycle).not.toContain("retired");
  });
});
