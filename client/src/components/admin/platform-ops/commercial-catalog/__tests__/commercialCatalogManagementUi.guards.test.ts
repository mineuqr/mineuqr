/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — management UI guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Live Commercial Plans management UI", () => {
  it("hosts live plan management without version lifecycle panels", () => {
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain("PlansManagementPanel");
    expect(composition).toContain("ValidationManagementPanel");
    expect(composition).toContain("HealthManagementPanel");
    expect(composition).not.toContain("PublicationManagementPanel");
    expect(composition).not.toContain("VersionsManagementPanel");
  });

  it("wires edit/validate/save through existing tRPC", () => {
    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    expect(panels).toContain("commercialCatalog.createPlan");
    expect(panels).toContain("commercialCatalog.saveLivePlan");
    expect(panels).toContain("commercialCatalog.validatePlanSave");
    expect(panels).not.toContain("commercialCatalog.createVersion");
    expect(panels).not.toContain("useCatalogPublishingMutations");
    expect(panels).not.toMatch(/commercialCatalog\.publishVersion/);
    expect(panels).not.toMatch(/commercialCatalog\.deprecateVersion/);
    expect(panels).not.toMatch(/commercialCatalog\.retireVersion/);
  });
});
