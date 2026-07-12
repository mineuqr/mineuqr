import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-CREDENTIAL-GOVERNANCE-1 client guards", () => {
  it("lifecycle sheet uses server-rendered QR without client secret handling", () => {
    const panel = read("client/src/components/screen-management/ScreenAccessTabPanel.tsx");
    const qrPresentation = read("client/src/components/screen-management/screenAccessPresentation.tsx");
    expect(panel).toContain("recoveryQrSvg");
    expect(qrPresentation).toContain("dangerouslySetInnerHTML");
    expect(panel).not.toContain("QRCodeSVG");
    expect(panel).not.toContain(".secret");
    expect(panel).not.toContain("qrPayload");
    expect(qrPresentation).not.toContain("QRCodeSVG");
  });

  it("provisioning panel uses server-rendered recovery QR", () => {
    const panel = read("client/src/components/screen-provisioning/ProvisioningActivationPanel.tsx");
    expect(panel).toContain("recoveryQrSvg");
    expect(panel).not.toContain("QRCodeSVG");
    expect(panel).not.toContain("serializeScreenQrValue");
  });

  it("provisioning session contract stores recovery SVG not plaintext secret", () => {
    const contract = read("client/src/lib/screen-provisioning/provisioningSessionContract.ts");
    expect(contract).toContain("recoveryQrSvg");
    expect(contract).not.toContain("secret:");
  });
});
