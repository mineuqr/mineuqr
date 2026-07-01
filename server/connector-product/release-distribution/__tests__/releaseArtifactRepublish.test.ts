import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryReleaseRegistry } from "../infrastructure/InMemoryReleaseRegistry";
import { ReleaseAdminService } from "../services/ReleaseAdminService";
import { ReleaseArtifactLifecycleService } from "../services/ReleaseArtifactLifecycleService";
import { ConnectorReleasePublicationService } from "../services/ConnectorReleasePublicationService";
import { readConnectorReleaseManifest } from "../../release/connectorRelease";
import type { ReleaseStoragePort, RetireCanonicalArtifactsInput } from "../contracts/ReleaseStoragePort";
import {
  buildArchivedInstallerKey,
  buildArchivedManifestKey,
  resolveArtifactPublicationPolicy,
} from "../domain/ReleaseArtifactLifecycle";

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
    return moved ? { archivedInstallerKey, archivedManifestKey } : null;
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
    } else if (this.objects.has(storageKey)) {
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

  async resolveDownloadUrl(storageKey: string) {
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

function writeStagedRelease(
  tempDir: string,
  installerContent: Buffer,
  installerFileName: string,
  manifest: ReturnType<typeof readConnectorReleaseManifest>
) {
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

async function seedPublishedVerified(
  registry: InMemoryReleaseRegistry,
  storage: TestReleaseStorage,
  version: string,
  installerFileName: string,
  installerContent: Buffer
) {
  const manifest = readConnectorReleaseManifest();
  const tempDir = mkdtempSync(join(tmpdir(), "republish-seed-"));
  writeStagedRelease(tempDir, installerContent, installerFileName, manifest);

  await registry.registerCandidate({
    version,
    productName: manifest.productName,
    installerFileName,
    audit: { gitTag: "main", commitSha: "abc", workflowRunId: "1", publisher: "ops" },
    registeredAt: new Date().toISOString(),
  });

  const publication = new ConnectorReleasePublicationService(registry, storage);
  await publication.publishRelease({
    version,
    releaseDirectory: tempDir,
    installerFileName,
    activate: false,
  });
  await registry.transitionRelease(version, "verified", new Date().toISOString());
}

describe("RELEASE-ARTIFACT-REPUBLISH-1", () => {
  const manifest = readConnectorReleaseManifest();
  const installerFileName = `MineuQR-Connector-${manifest.version}-Setup.exe`;
  const canonicalKey = `connector-releases/${manifest.version}/${installerFileName}`;

  it("uses reclaim-canonical policy only for candidate registry state", () => {
    expect(resolveArtifactPublicationPolicy("candidate")).toBe("reclaim-canonical");
    expect(resolveArtifactPublicationPolicy("published")).toBe("immutable");
    expect(resolveArtifactPublicationPolicy("active")).toBe("immutable");
  });

  it("fails immutable republish for non-candidate states", async () => {
    const registry = new InMemoryReleaseRegistry();
    const storage = new TestReleaseStorage();
    const firstContent = Buffer.from("first-installer");
    await seedPublishedVerified(registry, storage, manifest.version, installerFileName, firstContent);

    const tempDir = mkdtempSync(join(tmpdir(), "republish-fail-"));
    writeStagedRelease(tempDir, Buffer.from("second-installer"), installerFileName, manifest);

    const publication = new ConnectorReleasePublicationService(registry, storage);
    await expect(
      publication.publishRelease({
        version: manifest.version,
        releaseDirectory: tempDir,
        installerFileName,
        activate: false,
      })
    ).rejects.toThrow(/Immutable release installer already exists/);
  });

  it("allows republish after verified → superseded → candidate", async () => {
    const registry = new InMemoryReleaseRegistry();
    const storage = new TestReleaseStorage();
    const lifecycle = new ReleaseArtifactLifecycleService(storage);
    const admin = new ReleaseAdminService(registry, lifecycle);

    const firstContent = Buffer.from("first-installer");
    await seedPublishedVerified(registry, storage, manifest.version, installerFileName, firstContent);
    expect(storage.objects.has(canonicalKey)).toBe(true);

    await admin.administrativelySupersede(manifest.version);
    expect((await registry.findByVersion(manifest.version))?.status).toBe("superseded");
    expect(storage.objects.has(canonicalKey)).toBe(false);

    await registry.registerCandidate({
      version: manifest.version,
      productName: manifest.productName,
      installerFileName,
      audit: { gitTag: "main", commitSha: "def", workflowRunId: "2", publisher: "ops" },
      registeredAt: new Date().toISOString(),
    });

    const tempDir = mkdtempSync(join(tmpdir(), "republish-pass-"));
    const secondContent = Buffer.from("second-installer");
    writeStagedRelease(tempDir, secondContent, installerFileName, manifest);

    const publication = new ConnectorReleasePublicationService(registry, storage);
    const result = await publication.publishRelease({
      version: manifest.version,
      releaseDirectory: tempDir,
      installerFileName,
      activate: false,
    });

    expect(result.published.status).toBe("published");
    expect(storage.objects.get(canonicalKey)?.equals(secondContent)).toBe(true);
  });

  it("reclaims orphaned canonical artifacts when candidate republishes without prior archive", async () => {
    const registry = new InMemoryReleaseRegistry();
    const storage = new TestReleaseStorage();
    const orphaned = Buffer.from("orphaned-from-prior-run");
    storage.objects.set(canonicalKey, orphaned);
    storage.objects.set(
      `connector-releases/${manifest.version}/release-manifest.json`,
      Buffer.from("{}")
    );

    await registry.registerCandidate({
      version: manifest.version,
      productName: manifest.productName,
      installerFileName,
      audit: { gitTag: "main", commitSha: "ghi", workflowRunId: "3", publisher: "ops" },
      registeredAt: new Date().toISOString(),
    });

    const tempDir = mkdtempSync(join(tmpdir(), "republish-orphan-"));
    const newContent = Buffer.from("new-candidate-installer");
    writeStagedRelease(tempDir, newContent, installerFileName, manifest);

    const publication = new ConnectorReleasePublicationService(registry, storage);
    await publication.publishRelease({
      version: manifest.version,
      releaseDirectory: tempDir,
      installerFileName,
      activate: false,
    });

    expect(storage.objects.get(canonicalKey)?.equals(newContent)).toBe(true);
    expect([...storage.objects.keys()].some((key) => key.includes("/archive/"))).toBe(true);
    expect(storage.objects.has(canonicalKey)).toBe(true);
  });
});
