import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryReleaseRegistry } from "../infrastructure/InMemoryReleaseRegistry";
import { ReleaseDistributionService } from "../services/ReleaseDistributionService";
import { ConnectorReleasePublicationService } from "../services/ConnectorReleasePublicationService";
import { ReleaseVerificationService } from "../services/ReleaseVerificationService";
import { ReleasePromotionService } from "../services/ReleasePromotionService";
import { ReleaseArtifactLifecycleService } from "../services/ReleaseArtifactLifecycleService";
import type { ReleaseStoragePort, RetireCanonicalArtifactsInput } from "../contracts/ReleaseStoragePort";
import {
  buildArchivedInstallerKey,
  buildArchivedManifestKey,
} from "../domain/ReleaseArtifactLifecycle";
import { ConnectorProductService } from "../../ConnectorProductService";
import { readConnectorReleaseManifest } from "../../release/connectorRelease";

class TestReleaseStorage implements ReleaseStoragePort {
  readonly objects = new Map<string, Buffer>();

  async retireCanonicalArtifacts(input: RetireCanonicalArtifactsInput) {
    const archivedInstallerKey = buildArchivedInstallerKey(
      input.version,
      input.installerFileName,
      input.retiredAt,
      input.workflowRunId,
      input.reason
    );
    const archivedManifestKey = buildArchivedManifestKey(
      input.version,
      input.retiredAt,
      input.workflowRunId,
      input.reason
    );

    let moved = false;
    const installerBody = this.objects.get(input.installerStorageKey);
    if (installerBody) {
      this.objects.set(archivedInstallerKey, installerBody);
      this.objects.delete(input.installerStorageKey);
      moved = true;
    }
    const manifestBody = this.objects.get(input.manifestStorageKey);
    if (manifestBody) {
      this.objects.set(archivedManifestKey, manifestBody);
      this.objects.delete(input.manifestStorageKey);
      moved = true;
    }
    return moved
      ? { archivedInstallerKey, archivedManifestKey }
      : null;
  }

  async publishReleaseArtifacts(input: {
    version: string;
    installerFileName: string;
    localInstallerPath: string;
    localManifestPath: string;
    publicationPolicy?: "immutable" | "reclaim-canonical";
  }) {
    const storageKey = `connector-releases/${input.version}/${input.installerFileName}`;
    const manifestKey = `connector-releases/${input.version}/release-manifest.json`;
    const policy = input.publicationPolicy ?? "immutable";

    if (policy === "reclaim-canonical") {
      await this.retireCanonicalArtifacts({
        version: input.version,
        installerFileName: input.installerFileName,
        installerStorageKey: storageKey,
        manifestStorageKey: manifestKey,
        retiredAt: new Date().toISOString(),
        workflowRunId: null,
        reason: "canonical-reclaim",
      });
    } else if (this.objects.has(storageKey) || this.objects.has(manifestKey)) {
      throw new Error(`Immutable release installer already exists at ${storageKey}`);
    }

    this.objects.set(storageKey, readFileSync(input.localInstallerPath));
    this.objects.set(manifestKey, readFileSync(input.localManifestPath));
    return {
      storageKey,
      installerUrl: `https://cdn.example.com/${storageKey}`,
      manifestStorageKey: manifestKey,
      manifestUrl: `https://cdn.example.com/${manifestKey}`,
    };
  }

  async resolveDownloadUrl(storageKey: string): Promise<string> {
    return `https://cdn.example.com/${storageKey}`;
  }

  async verifyInstallerArtifact(storageKey: string, expectedSha256: string) {
    const body = this.objects.get(storageKey);
    if (!body) throw new Error(`Missing object ${storageKey}`);
    const sha256 = createHash("sha256").update(body).digest("hex");
    if (sha256 !== expectedSha256) throw new Error("Checksum mismatch");
    return { storageKey, sha256, sizeBytes: body.length };
  }

  async verifyManifestArtifact(storageKey: string) {
    return { storageKey, exists: this.objects.has(storageKey) };
  }
}

function writeStagedRelease(tempDir: string, installerContent: Buffer, installerFileName: string, manifest: ReturnType<typeof readConnectorReleaseManifest>) {
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
  return installerSha256;
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
    writeStagedRelease(tempDir, installerContent, installerFileName, manifest);

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
    mkdirSync(tempDir, { recursive: true });
    writeStagedRelease(tempDir, installerContent, installerFileName, manifest);

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

describe("PRINT-RELEASE-AUTOMATION-1 release promotion", () => {
  const manifest = readConnectorReleaseManifest();

  it("enforces promotion state machine before activation", async () => {
    const registry = new InMemoryReleaseRegistry();
    const storage = new TestReleaseStorage();
    const publication = new ConnectorReleasePublicationService(registry, storage);
    const verification = new ReleaseVerificationService(registry, storage);
    const promotion = new ReleasePromotionService(
      registry,
      new ReleaseArtifactLifecycleService(storage)
    );
    const distribution = new ReleaseDistributionService(registry, storage);

    const tempDir = mkdtempSync(join(tmpdir(), "connector-automation-"));
    const installerFileName = `MineuQR-Connector-${manifest.version}-Setup.exe`;
    const installerContent = Buffer.from("automation-installer");
    writeStagedRelease(tempDir, installerContent, installerFileName, manifest);

    await publication.registerCandidate({
      version: manifest.version,
      productName: manifest.productName,
      installerFileName,
      audit: {
        gitTag: `connector-v${manifest.version}`,
        commitSha: "abc123",
        workflowRunId: "42",
        publisher: "release-bot",
      },
    });

    const published = await publication.publishRelease({
      version: manifest.version,
      releaseDirectory: tempDir,
      installerFileName,
      activate: false,
    });
    expect(published.published.status).toBe("published");
    expect(published.published.releaseManifest.distribution?.installerStorageKey).toContain("connector-releases");

    await verification.verifyPublishedRelease(manifest.version);
    await promotion.markSmokeTestPassed(manifest.version);
    await promotion.promote(manifest.version);
    await promotion.activate(manifest.version);

    const active = await registry.findByVersion(manifest.version);
    expect(active?.status).toBe("active");
    expect(active?.audit.gitTag).toBe(`connector-v${manifest.version}`);
    expect(active?.promotedAt).toBeTruthy();
    expect(active?.activatedAt).toBeTruthy();

    const download = await distribution.getCurrentDownloadInfo();
    expect(download?.downloadReady).toBe(true);
  });
});
