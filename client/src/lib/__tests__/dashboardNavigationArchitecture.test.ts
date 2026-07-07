import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-PROVISIONING-NAVIGATION-1 architecture guards", () => {
  it("Dashboard derives navigation from URL via useDashboardNavigation", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(dashboard).toContain("useDashboardNavigation");
    expect(dashboard).not.toContain("setRestaurantTab");
    expect(dashboard).not.toContain("readDashboardUrlState");
  });

  it("useDashboardNavigation subscribes to pathname and search", () => {
    const nav = read("client/src/lib/useDashboardNavigation.ts");
    expect(nav).toContain("useLocation");
    expect(nav).toContain("useSearch");
    expect(nav).not.toContain("useState");
    expect(nav).not.toContain("setRestaurantTab");
  });

  it("provisioning workspace observes live URL state", () => {
    const hook = read("client/src/lib/screen-provisioning/useProvisioningWorkspace.ts");
    expect(hook).toContain("useProvisioningUrlState");
    expect(hook).not.toMatch(/readProvisioningUrlState\(\),\s*\[\]/);
    const panel = read("client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx");
    expect(panel).toContain("useProvisioningUrlState");
    expect(panel).not.toContain("readProvisioningUrlState()");
  });

  it("provisioning entry still uses navigateToProvisioning", () => {
    const fleet = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    expect(fleet).toContain("navigateToProvisioning");
  });

  it("dashboard URL writers use syncDashboardUrl or spaNavigate only", () => {
    const nav = read("client/src/lib/useDashboardNavigation.ts");
    expect(nav).toContain("syncDashboardUrl");
    const url = read("client/src/lib/dashboardUrl.ts");
    expect(url).toContain("spaNavigate");
  });
});
