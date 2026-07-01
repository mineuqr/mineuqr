import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readConnectorReleaseManifest } from "../../release/connectorRelease";
import type { ConnectorDistributionManifest } from "../../release/connectorReleaseTypes";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import type { ReleaseStoragePort } from "../contracts/ReleaseStoragePort";
import type { PublishedReleaseRecord, ReleaseAuditContext } from "../domain/PublishedRelease";
import {
  buildInstallerStorageKey,
  buildManifestStorageKey,
  enrichDistributionManifest,
} from "./ReleaseManifestEnrichment";

export type PublishConnectorReleaseInput = {
  version: string;
  releaseDirectory: string;
  installerFileName: string;
  activate?: boolean;
  publishedAt?: string;
  requireCandidate?: boolean;
};

export type PublishConnectorReleaseResult = {
  published: PublishedReleaseRecord;
  activated: boolean;
  installerUrl: string;
  manifestUrl: string;
};

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export class ConnectorReleasePublicationService {
  constructor(
    private readonly registry: ReleaseRegistry,
    private readonly storage: ReleaseStoragePort
  ) {}

  async registerCandidate(input: {
    version: string;
    productName: string;
    installerFileName: string;
    audit: ReleaseAuditContext;
    registeredAt?: string;
  }): Promise<PublishedReleaseRecord> {
    return this.registry.registerCandidate({
      version: input.version,
      productName: input.productName,
      installerFileName: input.installerFileName,
      audit: input.audit,
      registeredAt: input.registeredAt ?? new Date().toISOString(),
    });
  }

  async publishRelease(input: PublishConnectorReleaseInput): Promise<PublishConnectorReleaseResult> {
    const manifestPath = `${input.releaseDirectory}/release-manifest.json`;
    const installerPath = `${input.releaseDirectory}/${input.installerFileName}`;
    const manifestRaw = await readFile(manifestPath, "utf8");
    const stagedManifest = JSON.parse(manifestRaw) as ConnectorDistributionManifest;
    const installerBuffer = await readFile(installerPath);
    const installerSha256 = sha256Buffer(installerBuffer);

    if (stagedManifest.installer.sha256 !== installerSha256) {
      throw new Error("Installer checksum mismatch between release-manifest.json and installer file");
    }
    if (stagedManifest.version !== input.version) {
      throw new Error("Release manifest version does not match requested version");
    }
    if (stagedManifest.installer.fileName !== input.installerFileName) {
      throw new Error("Release manifest installer file name mismatch");
    }

    const canonicalManifest = readConnectorReleaseManifest();
    if (canonicalManifest.version !== input.version) {
      throw new Error("Canonical release authority version does not match requested version");
    }

    const installerStorageKey = buildInstallerStorageKey(input.version, input.installerFileName);
    const manifestStorageKey = buildManifestStorageKey(input.version);

    const releaseManifest = enrichDistributionManifest({
      manifest: canonicalManifest,
      buildDate: stagedManifest.buildDate,
      artifacts: stagedManifest.artifacts,
      installerSha256,
      installerStorageKey,
      manifestStorageKey,
    });

    const stored = await this.storage.publishReleaseArtifacts({
      version: input.version,
      installerFileName: input.installerFileName,
      localInstallerPath: installerPath,
      localManifestPath: manifestPath,
    });

    const publishedAt = input.publishedAt ?? new Date().toISOString();
    const existing = await this.registry.findByVersion(input.version);
    const published =
      existing?.status === "candidate"
        ? await this.registry.completePublication({
            version: input.version,
            productName: releaseManifest.productName,
            installerFileName: input.installerFileName,
            installerSha256,
            storageKey: stored.storageKey,
            releaseManifest,
            publishedAt,
          })
        : await this.registry.registerPublishedRelease({
            version: input.version,
            productName: releaseManifest.productName,
            installerFileName: input.installerFileName,
            installerSha256,
            storageKey: stored.storageKey,
            releaseManifest,
            publishedAt,
          });

    let activated = false;
    let record = published;
    if (input.activate === true) {
      await this.registry.transitionRelease(input.version, "verified", publishedAt);
      await this.registry.transitionRelease(input.version, "smoke_test_passed", publishedAt);
      await this.registry.transitionRelease(input.version, "promoted", publishedAt);
      const active = await this.registry.activateRelease(input.version, publishedAt);
      if (!active) {
        throw new Error(`Failed to activate release ${input.version}`);
      }
      record = active;
      activated = true;
    }

    return {
      published: record,
      activated,
      installerUrl: stored.installerUrl,
      manifestUrl: stored.manifestUrl,
    };
  }

  async publishAndActivate(input: PublishConnectorReleaseInput): Promise<PublishConnectorReleaseResult> {
    const shouldActivate = input.activate !== false;
    return this.publishRelease({ ...input, activate: shouldActivate });
  }
}
