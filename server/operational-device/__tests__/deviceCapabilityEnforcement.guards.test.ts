/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const MANAGEMENT_PROCEDURES = [
  "create",
  "list",
  "get",
  "disable",
  "enable",
  "rotateToken",
  "regenerateCredential",
  "getScreenCredential",
  "deleteScreen",
  "revokeToken",
  "updateScreenSettings",
  "getHealthSummary",
] as const;

const FLEET_READS = ["queryScreens", "getKpis", "getObservability"] as const;

describe("COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1 guards", () => {
  it("management mutations and reads enforce devices after restaurant access", () => {
    const management = read(
      "server/operational-device/routers/operationalDeviceManagementRouter.ts"
    );
    const auth = read(
      "server/operational-device/authorization/assertDeviceManagementAccess.ts"
    );
    const adapter = read(
      "server/operational-device/authorization/requireDevicesFeature.ts"
    );

    expect(management).toContain("assertDeviceManagementAccess");
    expect(management).not.toContain("assertRestaurantAccess(");
    expect(auth).toContain("assertRestaurantAccess");
    expect(auth).toContain("requireDevicesFeature");
    expect(adapter).toContain('requireFeature(userId, "devices"');
    expect(adapter).not.toContain('"kitchen"');
    expect(adapter).not.toMatch(/planFeatureMatrix/);
    expect(adapter).not.toMatch(/plan === ["']basic["']/i);
    expect(management).not.toMatch(/isPlatformOwner/);
    expect(management).not.toMatch(/userId === 1/);

    for (const name of MANAGEMENT_PROCEDURES) {
      expect(management).toContain(`operationalDevice.management.${name}`);
    }
    const accessCalls = management.match(/assertDeviceManagementAccess\(/g) ?? [];
    expect(accessCalls.length).toBeGreaterThanOrEqual(MANAGEMENT_PROCEDURES.length);
  });

  it("fleet management reads enforce the same devices boundary", () => {
    const fleet = read("server/operational-device/fleet/routers/fleetReadRouter.ts");
    expect(fleet).toContain("assertDeviceManagementAccess");
    expect(fleet).not.toContain("assertRestaurantAccess(");
    for (const name of FLEET_READS) {
      expect(fleet).toContain(`operationalDevice.fleet.${name}`);
    }
  });

  it("device runtime does not use devices commercial entitlement", () => {
    const runtime = read(
      "server/operational-device/routers/operationalDeviceRuntimeRouter.ts"
    );
    expect(runtime).not.toContain("requireDevicesFeature");
    expect(runtime).not.toContain("assertDeviceManagementAccess");
    expect(runtime).not.toContain('requireFeature');
    expect(runtime).toContain("deviceProcedure");
  });

  it("UI gates Screens from the same entitlement hub, not plan names", () => {
    const sidebar = read(
      "client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const workspace = read(
      "client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx"
    );
    const provisioning = read(
      "client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx"
    );

    expect(sidebar).toContain('hasFeature("devices")');
    expect(sidebar).toContain("useCommercialFeatureVisibility");
    expect(sidebar).not.toMatch(/plan === ["']basic["']/i);
    expect(dashboard).toContain('hasFeature("devices")');
    expect(dashboard).toContain("CommercialUpgradeBanner");
    expect(dashboard).toContain('featureKey="devices"');
    expect(workspace).toContain('hasFeature("devices")');
    expect(provisioning).toContain('hasFeature("devices")');
  });

  it("does not introduce a duplicate capability matrix", () => {
    const adapter = read(
      "server/operational-device/authorization/requireDevicesFeature.ts"
    );
    const auth = read(
      "server/operational-device/authorization/assertDeviceManagementAccess.ts"
    );
    expect(adapter).not.toMatch(/DEVICE_PLAN_MATRIX|SCREEN_PLAN_MATRIX|BASIC_SCREEN_RULES/);
    expect(auth).not.toMatch(/DEVICE_PLAN_MATRIX|planFeatureMatrix/);
    expect(adapter).toContain("from \"../../subscription-runtime\"");
  });
});
