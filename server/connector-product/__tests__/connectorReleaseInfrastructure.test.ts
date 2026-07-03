import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MINEUQR_CONNECTOR_PRODUCT_NAME,
  MINEUQR_CONNECTOR_VERSION,
} from "../../connector-local/infrastructure/productIdentity";
import {
  MINEUQR_CONNECTOR_MIN_DASHBOARD_VERSION,
  buildDistributionManifest,
  buildInnoSetupDefines,
  getInnoOutputBaseFilename,
  getWindowsInstallerFileName,
  readConnectorReleaseManifest,
} from "../release/connectorRelease";
import {
  MINEUQR_CONNECTOR_PRODUCT_NAME as GENERATED_PRODUCT_NAME,
  MINEUQR_CONNECTOR_VERSION as GENERATED_VERSION,
} from "../release/connectorReleaseConstants.generated";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("PRINT-CONNECTOR-RELEASE-1 release infrastructure", () => {
  const manifest = readConnectorReleaseManifest();
  const installerFileName = getWindowsInstallerFileName(manifest);

  it("uses a single canonical manifest for product version", () => {
    expect(manifest.version).toBe(GENERATED_VERSION);
    expect(manifest.productName).toBe(GENERATED_PRODUCT_NAME);
    expect(MINEUQR_CONNECTOR_VERSION).toBe(manifest.version);
    expect(MINEUQR_CONNECTOR_PRODUCT_NAME).toBe(manifest.productName);
  });

  it("derives installer filename consistently", () => {
    expect(installerFileName).toBe(
      `${manifest.installer.outputBaseName}-${manifest.version}-Setup${manifest.installer.fileExtension}`
    );
    expect(installerFileName).toBe("MineuQR-Connector-1.0.1-Setup.exe");
  });

  it("includes required installer metadata fields", () => {
    expect(manifest.publisher).toBeTruthy();
    expect(manifest.copyright).toBeTruthy();
    expect(manifest.supportUrl).toMatch(/^https?:\/\//);
    expect(manifest.appId).toMatch(/^[A-F0-9-]{36}$/i);
    expect(manifest.minDashboardVersion).toBe(MINEUQR_CONNECTOR_MIN_DASHBOARD_VERSION);
  });

  it("generates Inno Setup defines from manifest", () => {
    const defines = buildInnoSetupDefines(manifest);
    expect(defines).toContain(`#define MyAppVersion "${manifest.version}"`);
    expect(defines).toContain(`#define MyAppPublisher "${manifest.publisher}"`);
    expect(defines).toContain(`#define MyAppSupportURL "${manifest.supportUrl}"`);
    expect(defines).toContain(`#define MyOutputBaseFilename "${getInnoOutputBaseFilename(manifest)}"`);
  });

  it("builds distribution manifest with installer checksum", () => {
    const distribution = buildDistributionManifest({
      manifest,
      buildDate: "2026-06-30T00:00:00.000Z",
      artifacts: [
        {
          name: installerFileName,
          relativePath: installerFileName,
          sha256: "installer-hash",
          sizeBytes: 2048,
        },
      ],
      installerSha256: "installer-hash",
    });

    expect(distribution.installer.fileName).toBe(installerFileName);
    expect(distribution.installer.sha256).toBe("installer-hash");
    expect(distribution.compatibility.minDashboardVersion).toBe(manifest.minDashboardVersion);
  });

  it("finalizes release metadata only after installer exists", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "connector-release-"));
    const manifestDir = join(tempRoot, "connector-product", "release");
    mkdirSync(manifestDir, { recursive: true });
    copyFileSync(
      join(repoRoot, "connector-product", "release", "connector-release.json"),
      join(manifestDir, "connector-release.json")
    );

    const releaseDir = join(tempRoot, "dist", "connector-release", manifest.version);
    mkdirSync(join(releaseDir, "bundle"), { recursive: true });
    writeFileSync(join(releaseDir, "bundle", "rlc-service.mjs"), "console.log('test');\n", "utf8");
    writeFileSync(
      join(releaseDir, ".release-build-meta.json"),
      JSON.stringify({ buildDate: "2026-06-30T00:00:00.000Z", version: manifest.version }),
      "utf8"
    );
    writeFileSync(join(releaseDir, installerFileName), "fake-installer-binary", "utf8");

    const result = spawnSync(
      "node",
      [join(repoRoot, "scripts", "connector-release-finalize.mjs")],
      {
        cwd: tempRoot,
        env: {
          ...process.env,
          CONNECTOR_RELEASE_REPO_ROOT: tempRoot,
        },
        encoding: "utf8",
      }
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);

    const releaseManifest = JSON.parse(readFileSync(join(releaseDir, "release-manifest.json"), "utf8"));
    const checksums = readFileSync(join(releaseDir, "SHA256SUMS.txt"), "utf8");

    expect(releaseManifest.installer.fileName).toBe(installerFileName);
    expect(releaseManifest.installer.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(checksums).toContain(installerFileName);
    expect(readFileSync(join(releaseDir, "README.txt"), "utf8")).toContain("Release status: complete");
  });
});
