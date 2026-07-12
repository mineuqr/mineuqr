import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("DEVICE-PROVISIONING-UX-2 architecture guards", () => {
  it("dashboard uses activation panel as primary onboarding", () => {
    const workspace = read("client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx");
    expect(workspace).toContain("ProvisioningActivationPanel");
    expect(workspace).not.toContain("ProvisioningCredentialsPanel");
  });

  it("optional QR is collapsed by default", () => {
    const qr = read("client/src/components/screen-provisioning/ProvisioningOptionalQrPanel.tsx");
    expect(qr).toContain('useState(false)');
    expect(qr).toContain("Show QR (optional)");
  });

  it("device activation route exists", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/device"');
    expect(app).toContain("DeviceActivationPage");
  });

  it("runtime supports activation code authentication", () => {
    const router = read("server/operational-device/routers/operationalDeviceRuntimeRouter.ts");
    expect(router).toContain("authenticateByActivationCode");
  });
});
