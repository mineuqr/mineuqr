import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-PROVISIONING-WORKSPACE-1 architecture guards", () => {
  it("fleet workspace has no provisioning dialogs", () => {
    const panel = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    expect(panel).not.toContain("<Dialog");
    expect(panel).not.toContain("qrOpen");
    expect(panel).not.toContain("createOpen");
    expect(panel).toContain("navigateToProvisioning");
  });

  it("fleet cards delegate provisioning to workspace", () => {
    const card = read("client/src/components/screen-management/FleetScreenCard.tsx");
    expect(card).toContain("onProvision");
    expect(card).not.toContain("rotateToken");
    expect(card).not.toContain("RotateCw");
  });

  it("provisioning workspace uses session manager", () => {
    const workspace = read("client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx");
    expect(workspace).toContain("ProvisioningWorkspacePanel");
    expect(workspace).toContain("provisioningSessionManager");
    expect(workspace).toContain("useProvisioningWorkspace");
    expect(workspace).not.toContain("<Dialog");
  });

  it("provisioning session contract defines canonical states", () => {
    const contract = read("client/src/lib/screen-provisioning/provisioningSessionContract.ts");
    expect(contract).toContain("ProvisioningSession");
    expect(contract).toContain("ProvisioningPairingState");
    expect(contract).toContain("ProvisioningActivationState");
  });

  it("dashboard routes screen-provisioning section", () => {
    const url = read("client/src/lib/dashboardUrl.ts");
    expect(url).toContain("screen-provisioning");
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(dashboard).toContain("ProvisioningWorkspacePanel");
  });

  it("presentation does not compute provisioning status", () => {
    const status = read("client/src/components/screen-provisioning/ProvisioningStatusPanel.tsx");
    expect(status).toContain("ProvisioningHealth");
    expect(status).not.toContain("resolveProvisioning");
  });
});
