import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getWindowsInstallerFileName, readConnectorReleaseManifest } from "../release/connectorRelease";
import { ConnectorProductService } from "../ConnectorProductService";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("PRINT-CONNECTOR-RELEASE-INFRA-1 architecture guards", () => {
  it("canonical manifest lives outside installer scripts", () => {
    const manifestPath = join(root, "connector-product", "release", "connector-release.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.version).toBeTruthy();
    expect(manifest.productName).toBe("MineuQR Connector");
  });

  it("dashboard API derives installer name from canonical manifest", async () => {
    const manifest = readConnectorReleaseManifest();
    const service = new ConnectorProductService();
    const info = await service.getDownloadInfo();
    expect(info.version).toBe(manifest.version);
    expect(info.windowsInstallerName).toBe(getWindowsInstallerFileName(manifest));
  });

  it("signing integration does not embed secrets in repository", () => {
    const signScript = readFileSync(
      join(root, "connector-product", "windows", "sign-release.ps1"),
      "utf8"
    );
    expect(signScript).toContain("CONNECTOR_SIGNING_CERT_SHA1");
    expect(signScript).toContain("CONNECTOR_SIGNING_PFX_PATH");
    expect(signScript).not.toMatch(/BEGIN CERTIFICATE/);
    expect(signScript).not.toMatch(/mineuqr.*\.pfx/i);
  });

  it("release build script exists and stages manifest plus checksums", () => {
    const buildScript = readFileSync(join(root, "scripts", "connector-release-build.mjs"), "utf8");
    expect(buildScript).toContain("release-manifest.json");
    expect(buildScript).toContain("SHA256SUMS.txt");
    expect(buildScript).not.toMatch(/https?:\/\/[^\s"']+\/download/);
  });
});
