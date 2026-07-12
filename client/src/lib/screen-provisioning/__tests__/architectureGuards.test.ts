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

  it("fleet cards expose credential lifecycle sheet", () => {
    const card = read("client/src/components/screen-management/FleetScreenCard.tsx");
    expect(card).toContain("onLifecycle");
    expect(card).toContain("KeyRound");
    expect(card).not.toContain("onProvision");
  });

  it("screen management hosts credential lifecycle actions", () => {
    const panel = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    expect(panel).toContain("ScreenCredentialLifecycleSheet");
    expect(panel).not.toContain("navigateFleetProvisioning");
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

  it("BUGFIX-F003 — fleet status uses lifecycle sheet not provisioning rotate", () => {
    const fleet = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    expect(fleet).toContain("ScreenCredentialLifecycleSheet");
    expect(fleet).not.toContain('navigateFleetProvisioning(id, "status")');
  });

  it("BUGFIX-F003 — provisioning workspace never auto-rotates on mount", () => {
    const workspace = read("client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx");
    expect(workspace).not.toMatch(
      /useEffect\([\s\S]*urlState\.mode !== "rotate"[\s\S]*rotateMutation\.mutate/
    );
    expect(workspace).toContain("RotateCredentialsConfirmation");
    expect(workspace).toContain("DeviceOperationalStatusPanel");
    expect(workspace).toContain('urlState.mode === "status"');
  });

  it("BUGFIX-F003 — status URL mode is supported", () => {
    const url = read("client/src/lib/screen-provisioning/provisioningUrl.ts");
    expect(url).toContain('"status"');
  });
});
