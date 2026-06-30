import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryReleaseRegistry } from "../infrastructure/InMemoryReleaseRegistry";
import { ReleaseDistributionService } from "../services/ReleaseDistributionService";
import { ConnectorReleasePublicationService } from "../services/ConnectorReleasePublicationService";
import type { ReleaseStoragePort } from "../contracts/ReleaseStoragePort";
import { ConnectorProductService } from "../../ConnectorProductService";
import { readConnectorReleaseManifest } from "../../release/connectorRelease";

class TestReleaseStorage implements ReleaseStoragePort {
  readonly objects = new Map<string, string>();

  async publishReleaseArtifacts(input: {
    version: string;
    installerFileName: string;
  }) {
    const storageKey = `connector-releases/${input.version}/${input.installerFileName}`;
    const manifestKey = `connector-releases/${input.version}/release-manifest.json`;
    const installerUrl = `https://cdn.example.com/${storageKey}`;
    const manifestUrl = `https://cdn.example.com/${manifestKey}`;
    this.objects.set(storageKey, installerUrl);
    this.objects.set(manifestKey, manifestUrl);
    return {
      storageKey,
      installerUrl,
      manifestStorageKey: manifestKey,
      manifestUrl,
    };
  }

  async resolveDownloadUrl(storageKey: string): Promise<string> {
    return this.objects.get(storageKey) ?? `https://cdn.example.com/${storageKey}`;
  }
}

describe("PRINT-RELEASE-DISTRIBUTION-1 release distribution", () => {
  const manifest = readConnectorReleaseManifest();

  it("publishes and activates a release for dashboard download", async () => {
    const registry = new InMemoryReleaseRegistry();
    const storage = new TestReleaseStorage();
    const publication = new ConnectorReleasePublicationService(registry, storage);
    const distribution = new ReleaseDistributionService(registry, storage);

    const tempDir = mkdtempSync(join(tmpdir(), "connector-publish-"));
    const installerFileName = `MineuQR-Connector-${manifest.version}-Setup.exe`;
    const installerContent = Buffer.from("fake-installer-binary");
    const installerSha256 = createHash("sha256").update(installerContent).digest("hex");
    writeFileSync(join(tempDir, installerFileName), installerContent);
    writeFileSync(
      join(tempDir, "release-manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        productName: manifest.productName,
        version: manifest.version,
        buildDate: "2026-06-30T00:00:00.000Z",
        publisher: manifest.publisher,
        supportUrl: manifest.supportUrl,
        copyright: manifest.copyright,
        compatibility: { minDashboardVersion: manifest.minDashboardVersion, platforms: ["windows"] },
        artifacts: [],
        installer: { fileName: installerFileName, relativePath: installerFileName, sha256: installerSha256 },
      })
    );

    const published = await publication.publishAndActivate({
      version: manifest.version,
      releaseDirectory: tempDir,
      installerFileName,
    });

    expect(published.activated).toBe(true);
    const download = await distribution.getCurrentDownloadInfo();
    expect(download?.downloadReady).toBe(true);
    expect(download?.downloadUrl).toContain("connector-releases");
    expect(download?.windowsInstallerName).toBe(installerFileName);
  });

  it("ConnectorProductService exposes published download without env URL", async () => {
    const registry = new InMemoryReleaseRegistry();
    const storage = new TestReleaseStorage();
    const distribution = new ReleaseDistributionService(registry, storage);
    const publication = new ConnectorReleasePublicationService(registry, storage);
    const service = new ConnectorProductService(distribution);

    const tempDir = mkdtempSync(join(tmpdir(), "connector-product-"));
    const installerFileName = `MineuQR-Connector-${manifest.version}-Setup.exe`;
    const installerContent = Buffer.from("fake-installer");
    const installerSha256 = createHash("sha256").update(installerContent).digest("hex");
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(join(tempDir, installerFileName), installerContent);
    writeFileSync(
      join(tempDir, "release-manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        productName: manifest.productName,
        version: manifest.version,
        buildDate: "2026-06-30T00:00:00.000Z",
        publisher: manifest.publisher,
        supportUrl: manifest.supportUrl,
        copyright: manifest.copyright,
        compatibility: { minDashboardVersion: manifest.minDashboardVersion, platforms: ["windows"] },
        artifacts: [],
        installer: { fileName: installerFileName, relativePath: installerFileName, sha256: installerSha256 },
      })
    );

    await publication.publishAndActivate({
      version: manifest.version,
      releaseDirectory: tempDir,
      installerFileName,
    });

    const info = await service.getDownloadInfo();
    expect(info.downloadUrl).toBeTruthy();
    expect(info.downloadReady).toBe(true);
    expect(info.version).toBe(manifest.version);
  });
});
