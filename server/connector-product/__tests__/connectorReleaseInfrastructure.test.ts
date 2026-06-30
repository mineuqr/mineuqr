import { describe, expect, it } from "vitest";
import {
  MINEUQR_CONNECTOR_PRODUCT_NAME,
  MINEUQR_CONNECTOR_VERSION,
} from "../../connector-local/infrastructure/productIdentity";
import {
  MINEUQR_CONNECTOR_MIN_DASHBOARD_VERSION,
  buildDistributionManifest,
  buildInnoSetupDefines,
  getWindowsInstallerFileName,
  readConnectorReleaseManifest,
} from "../release/connectorRelease";
import {
  MINEUQR_CONNECTOR_PRODUCT_NAME as GENERATED_PRODUCT_NAME,
  MINEUQR_CONNECTOR_VERSION as GENERATED_VERSION,
} from "../release/connectorReleaseConstants.generated";

describe("PRINT-CONNECTOR-RELEASE-INFRA-1 release infrastructure", () => {
  const manifest = readConnectorReleaseManifest();

  it("uses a single canonical manifest for product version", () => {
    expect(manifest.version).toBe(GENERATED_VERSION);
    expect(manifest.productName).toBe(GENERATED_PRODUCT_NAME);
    expect(MINEUQR_CONNECTOR_VERSION).toBe(manifest.version);
    expect(MINEUQR_CONNECTOR_PRODUCT_NAME).toBe(manifest.productName);
  });

  it("derives installer filename consistently", () => {
    const fileName = getWindowsInstallerFileName(manifest);
    expect(fileName).toBe(`${manifest.installer.outputBaseName}-${manifest.version}-Setup${manifest.installer.fileExtension}`);
    expect(fileName).toBe("MineuQR-Connector-1.0.0-Setup.exe");
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
    expect(defines).toContain(`#define MyOutputBaseFilename "${manifest.installer.outputBaseName}-${manifest.version}-Setup"`);
  });

  it("builds distribution manifest with compatibility and checksums", () => {
    const distribution = buildDistributionManifest({
      manifest,
      buildDate: "2026-06-30T00:00:00.000Z",
      artifacts: [
        {
          name: "rlc-service.mjs",
          relativePath: "bundle/rlc-service.mjs",
          sha256: "abc123",
          sizeBytes: 1024,
        },
      ],
    });

    expect(distribution.version).toBe(manifest.version);
    expect(distribution.buildDate).toBe("2026-06-30T00:00:00.000Z");
    expect(distribution.compatibility.minDashboardVersion).toBe(manifest.minDashboardVersion);
    expect(distribution.compatibility.platforms).toEqual(["windows"]);
    expect(distribution.installer.fileName).toBe(getWindowsInstallerFileName(manifest));
    expect(distribution.artifacts[0]?.sha256).toBe("abc123");
  });
});
