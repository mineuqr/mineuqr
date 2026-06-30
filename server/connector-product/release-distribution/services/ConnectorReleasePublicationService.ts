import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ConnectorDistributionManifest } from "../../release/connectorReleaseTypes";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import type { ReleaseStoragePort } from "../contracts/ReleaseStoragePort";
import type { PublishedReleaseRecord } from "../domain/PublishedRelease";

export type PublishConnectorReleaseInput = {
  version: string;
  releaseDirectory: string;
  installerFileName: string;
  activate?: boolean;
  publishedAt?: string;
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

  async publishAndActivate(input: PublishConnectorReleaseInput): Promise<PublishConnectorReleaseResult> {
    const manifestPath = `${input.releaseDirectory}/release-manifest.json`;
    const installerPath = `${input.releaseDirectory}/${input.installerFileName}`;
    const manifestRaw = await readFile(manifestPath, "utf8");
    const releaseManifest = JSON.parse(manifestRaw) as ConnectorDistributionManifest;
    const installerBuffer = await readFile(installerPath);
    const installerSha256 = sha256Buffer(installerBuffer);

    if (releaseManifest.installer.sha256 !== installerSha256) {
      throw new Error("Installer checksum mismatch between release-manifest.json and installer file");
    }
    if (releaseManifest.version !== input.version) {
      throw new Error("Release manifest version does not match requested version");
    }
    if (releaseManifest.installer.fileName !== input.installerFileName) {
      throw new Error("Release manifest installer file name mismatch");
    }

    const stored = await this.storage.publishReleaseArtifacts({
      version: input.version,
      installerFileName: input.installerFileName,
      localInstallerPath: installerPath,
      localManifestPath: manifestPath,
    });

    const publishedAt = input.publishedAt ?? new Date().toISOString();
    const published = await this.registry.registerPublishedRelease({
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
    if (input.activate !== false) {
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
}
