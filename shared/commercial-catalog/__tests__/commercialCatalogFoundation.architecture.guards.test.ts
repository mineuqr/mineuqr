/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CATALOG_ARCHITECTURE_PROGRAM,
  COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH,
  COMMERCIAL_CATALOG_DASHBOARD_SECTIONS,
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN,
  COMMERCIAL_CATALOG_PLATFORM_OWNS,
  PUBLICATION_MANDATORY_CHECKS,
  validatePublication,
  canTransitionPlanVersion,
  isPlanVersionImmutable,
  buildCommercialSnapshotDefinition,
  freezeCommercialSnapshot,
} from "../index";
import { getPlatformOpsSection } from "@/lib/admin/platform-ops/platformOpsSections";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 package", () => {
  it("exports program identity and ownership", () => {
    expect(COMMERCIAL_CATALOG_FOUNDATION_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1"
    );
    expect(COMMERCIAL_CATALOG_ARCHITECTURE_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1"
    );
    expect(COMMERCIAL_CATALOG_PLATFORM_OWNS).toContain("plan_version");
    expect(COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN).toContain("payment_gateways");
    expect(COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN).toContain(
      "subscription_runtime"
    );
    expect(COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH).toBe(
      "/admin/platform/commercial-catalog"
    );
    expect(COMMERCIAL_CATALOG_DASHBOARD_SECTIONS.length).toBeGreaterThanOrEqual(
      12
    );
  });

  it("registers Platform Ops section as live foundation", () => {
    const section = getPlatformOpsSection("commercialCatalog");
    expect(section.path).toBe(COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH);
    expect(section.status).toBe("live");
  });

  it("wires App route and composition", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform/commercial-catalog"');
    expect(app).toContain("AdminPlatformOpsCommercialCatalogPage");
    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(pages).toContain("PlatformOpsCommercialCatalogComposition");
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain("platform-ops-ui");
    expect(composition).toContain("commercialCatalog.health");
    expect(composition).not.toMatch(/stripe|moyasar|hyperpay/i);
    expect(composition).not.toContain("entitlement");
  });

  it("registers tRPC router without subscription/payment APIs", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("commercialCatalog: commercialCatalogRouter");
    const api = read(
      "server/api/commercialCatalog/commercialCatalogRouter.ts"
    );
    expect(api).toContain("publishVersion");
    expect(api).toContain("captureSnapshotDefinition");
    expect(api).not.toMatch(/stripe|moyasar|hyperpay|invoice|charge/i);
    expect(api).not.toContain("createSubscription");
  });

  it("includes normalized schema and migration 0084", () => {
    expect(
      existsSync(resolve(root, "server/db/schema/commercial/tables.ts"))
    ).toBe(true);
    expect(
      existsSync(resolve(root, "drizzle/0084_commercial_catalog_foundation.sql"))
    ).toBe(true);
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("commercialPlans");
    expect(schema).toContain("commercialSnapshotDefinitions");
    const tables = read("server/db/schema/commercial/tables.ts");
    expect(tables).toContain("commercial_snapshot_definitions");
    expect(schema).not.toMatch(
      /commercial_user_subscriptions|commercial_subscriptions/
    );
  });
});

describe("CC-16 publication validation", () => {
  it("fails closed when mandatory components missing", () => {
    const result = validatePublication({
      version: {
        id: "v1",
        planId: "p1",
        versionCode: "v1",
        versionName: "V1",
        state: "draft",
        featureBundleId: null,
        limitProfileId: null,
        trialPolicyId: null,
        migrationPolicyId: null,
        retirementPolicyId: null,
        compatibility: {
          upgradeTargets: [],
          downgradeTargets: [],
          migrationRequirements: [],
          breakingCommercialChanges: [],
        },
        publishedAt: null,
        deprecatedAt: null,
        retiredAt: null,
        createdAt: "",
        updatedAt: "",
      },
      prices: [],
      billingCycles: [],
      featureBundle: null,
      limitProfile: null,
      migrationPolicy: null,
      retirementPolicy: null,
    });
    expect(result.ok).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("pricing_exists");
    expect(codes).toContain("feature_bundle_exists");
    expect(codes).toContain("limit_profile_exists");
    expect(codes).toContain("migration_policy_exists");
    expect(codes).toContain("retirement_policy_exists");
    expect(PUBLICATION_MANDATORY_CHECKS).toContain("billing_cycle_exists");
  });
});

describe("lifecycle immutability", () => {
  it("enforces draft→published and published immutability", () => {
    expect(canTransitionPlanVersion("draft", "published")).toBe(true);
    expect(canTransitionPlanVersion("published", "draft")).toBe(false);
    expect(isPlanVersionImmutable("published")).toBe(true);
    expect(isPlanVersionImmutable("draft")).toBe(false);
  });
});

describe("CC-13 snapshot contract", () => {
  it("builds and freezes snapshot definitions", () => {
    const snap = freezeCommercialSnapshot(
      buildCommercialSnapshotDefinition({
        planIdentityId: "p1",
        planVersionId: "v1",
        commercialName: "Business",
        versionName: "v2",
        currency: "SAR",
        billingCycle: {
          id: "c1",
          code: "monthly",
          intervalCount: 1,
          intervalUnit: "month",
        },
        pricing: {
          amount: "349.00",
          currency: "SAR",
          billingCycleId: "c1",
          billingCycleCode: "monthly",
        },
        includedFeatures: [{ featureKey: "orders", included: true }],
        usageLimits: [{ limitKey: "restaurants", value: 5, unit: "count" }],
        effectiveDate: "2026-07-29T00:00:00.000Z",
      })
    );
    expect(snap.snapshotSchemaVersion).toBe(1);
    expect(Object.isFrozen(snap)).toBe(true);
  });
});
