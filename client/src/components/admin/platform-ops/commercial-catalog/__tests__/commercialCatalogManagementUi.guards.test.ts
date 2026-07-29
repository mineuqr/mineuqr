/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CATALOG-MANAGEMENT-UI-1", () => {
  it("replaces read-only dashboard with management workspace", () => {
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain("COMMERCIAL-CATALOG-MANAGEMENT-UI-1");
    expect(composition).toContain("PlansManagementPanel");
    expect(composition).toContain("PublicationManagementPanel");
    expect(composition).toContain("ValidationManagementPanel");
    expect(composition).toContain("HealthManagementPanel");
    expect(composition).not.toMatch(/Create plans and draft versions via commercialCatalog APIs/);
  });

  it("wires create/update/publish mutations through existing tRPC", () => {
    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    expect(panels).toContain("commercialCatalog.createPlan");
    expect(panels).toContain("commercialCatalog.updatePlan");
    expect(panels).toContain("commercialCatalog.createVersion");
    expect(panels).toContain("commercialCatalog.publishVersion");
    expect(panels).toContain("commercialCatalog.deprecateVersion");
    expect(panels).toContain("commercialCatalog.retireVersion");
    expect(panels).toContain("commercialCatalog.createPrice");
    expect(panels).toContain("commercialCatalog.createFeatureBundle");
    expect(panels).toContain("commercialCatalog.createLimitProfile");
    expect(panels).toContain("commercialCatalog.createTrialPolicy");
    expect(panels).toContain("commercialCatalog.createRegion");
    expect(panels).toContain("commercialCatalog.updateRegion");
    expect(panels).toContain("commercialCatalog.createPromotion");
    expect(panels).toContain("commercialCatalog.createMigrationPolicy");
    expect(panels).toContain("commercialCatalog.updateMigrationPolicy");
    expect(panels).toContain("commercialCatalog.createRetirementPolicy");
    expect(panels).toContain("commercialCatalog.validatePublication");
    expect(panels).not.toMatch(/drizzle|mysql|getDb\(/i);
  });

  it("exposes updateMigrationPolicy on commercialCatalog router", () => {
    const router = read(
      "server/api/commercialCatalog/commercialCatalogRouter.ts"
    );
    expect(router).toContain("updateMigrationPolicy");
  });

  it("keeps management modules under platform-ops commercial-catalog", () => {
    expect(
      read(
        "client/src/components/admin/platform-ops/commercial-catalog/CatalogEntityPanel.tsx"
      )
    ).toContain("PlatformOpsToolbar");
    expect(
      read(
        "client/src/components/admin/platform-ops/commercial-catalog/CatalogFormDialog.tsx"
      )
    ).toContain("Dialog");
  });
});
