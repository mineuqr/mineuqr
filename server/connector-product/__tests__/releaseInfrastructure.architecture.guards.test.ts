import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getWindowsInstallerFileName, readConnectorReleaseManifest } from "../release/connectorRelease";
import { ConnectorProductService } from "../ConnectorProductService";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("PRINT-CONNECTOR-RELEASE-1 architecture guards", () => {
  const manifest = readConnectorReleaseManifest();
  const installerFileName = getWindowsInstallerFileName(manifest);

  it("canonical manifest remains the single release authority", () => {
    const manifestPath = join(root, "connector-product", "release", "connector-release.json");
    const canonical = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(canonical.version).toBe(manifest.version);
    expect(canonical.productName).toBe("MineuQR Connector");
  });

  it("dashboard API derives installer name from canonical manifest", async () => {
    const service = new ConnectorProductService();
    const info = await service.getDownloadInfo();
    expect(info.version).toBe(manifest.version);
    expect(info.windowsInstallerName).toBe(installerFileName);
  });

  it("CONNECTOR-VERSION-SYNC-1 — generated constants match canonical manifest", () => {
    const generated = readFileSync(
      join(root, "server", "connector-product", "release", "connectorReleaseConstants.generated.ts"),
      "utf8"
    );
    expect(generated).toContain(`MINEUQR_CONNECTOR_VERSION = ${JSON.stringify(manifest.version)}`);
    expect(generated).toContain(`MINEUQR_CONNECTOR_PRODUCT_NAME = ${JSON.stringify(manifest.productName)}`);
  });

  it("staging build does not publish stale release metadata", () => {
    const stageScript = readFileSync(join(root, "scripts", "connector-release-build.mjs"), "utf8");
    expect(stageScript).not.toContain('writeFileSync(join(stagingRoot, "release-manifest.json")');
    expect(stageScript).not.toContain('writeFileSync(join(stagingRoot, "SHA256SUMS.txt")');
  });

  it("finalize script writes manifest and checksums after installer exists", () => {
    const finalizeScript = readFileSync(join(root, "scripts", "connector-release-finalize.mjs"), "utf8");
    expect(finalizeScript).toContain("release-manifest.json");
    expect(finalizeScript).toContain("SHA256SUMS.txt");
    expect(finalizeScript).toContain("installerSha256");
  });

  it("build-release.ps1 resolves installer name from canonical manifest", () => {
    const buildScript = readFileSync(join(root, "connector-product", "windows", "build-release.ps1"), "utf8");
    expect(buildScript).toContain("connector-release-installer-name.mjs");
    expect(buildScript).not.toMatch(/MineuQR-Connector-\$Version-Setup/);
    expect(buildScript).toContain("connector-release-finalize.mjs");
  });

  it("sign-release.ps1 refreshes metadata after signing", () => {
    const signScript = readFileSync(join(root, "connector-product", "windows", "sign-release.ps1"), "utf8");
    expect(signScript).toContain("connector-release-installer-name.mjs");
    expect(signScript).toContain("verify-release-signature.ps1");
    expect(signScript).toContain("connector-release-finalize.mjs");
  });

  it("verify-release-signature.ps1 enforces Authenticode and timestamp", () => {
    const verifyScript = readFileSync(
      join(root, "connector-product", "windows", "verify-release-signature.ps1"),
      "utf8"
    );
    expect(verifyScript).toContain('signtool verify /pa /v /tw');
    expect(verifyScript).toContain("TimeStamperCertificate");
    expect(verifyScript).toContain('Status -ne "Valid"');
  });
});
