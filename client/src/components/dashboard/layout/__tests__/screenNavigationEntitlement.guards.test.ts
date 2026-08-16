/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1 — Screens UI uses hub entitlements.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1 — Screens UI", () => {
  it("sidebar hides Screens unless hasFeature(devices)", () => {
    const sidebar = read(
      "client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );
    expect(sidebar).toContain("useCommercialFeatureVisibility");
    expect(sidebar).toContain('hasFeature("devices")');
    expect(sidebar).toContain("canManageScreens");
    expect(sidebar).toContain('hasFeature("sessionTableManagement")');
    expect(sidebar).toContain('hasFeature("menuManagement")');
    expect(sidebar).toContain('hasFeature("menuDesign")');
    expect(sidebar).toContain('hasFeature("smartQr")');
    expect(sidebar).not.toMatch(/plan === ["']BASIC["']/);
    expect(sidebar).not.toMatch(/plan === ["']basic["']/);
  });

  it("dashboard and provisioning lock Screens without devices", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const workspace = read(
      "client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx"
    );
    const provisioning = read(
      "client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx"
    );
    expect(dashboard).toContain('featureKey="devices"');
    expect(dashboard).toContain('featureKey="sessionTableManagement"');
    expect(dashboard).toContain('featureKey="menuManagement"');
    expect(dashboard).toContain('featureKey="menuDesign"');
    expect(dashboard).toContain('featureKey="smartQr"');
    expect(workspace).toContain('hasFeature("devices")');
    expect(provisioning).toContain('hasFeature("devices")');
    expect(provisioning).toContain("CommercialUpgradeBanner");
  });
});
