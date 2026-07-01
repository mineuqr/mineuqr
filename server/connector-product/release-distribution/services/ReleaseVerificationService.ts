import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import type { ReleaseStoragePort } from "../contracts/ReleaseStoragePort";
import { buildManifestStorageKey } from "./ReleaseManifestEnrichment";

export type ReleaseVerificationResult = {
  version: string;
  installerVerified: boolean;
  manifestVerified: boolean;
  registryConsistent: boolean;
};

export class ReleaseVerificationService {
  constructor(
    private readonly registry: ReleaseRegistry,
    private readonly storage: ReleaseStoragePort
  ) {}

  async verifyPublishedRelease(version: string): Promise<ReleaseVerificationResult> {
    const record = await this.registry.findByVersion(version);
    if (!record) {
      throw new Error(`Release ${version} not found in registry`);
    }
    if (record.status !== "published") {
      throw new Error(`Release ${version} must be published before verification (status=${record.status})`);
    }

    const installer = await this.storage.verifyInstallerArtifact(
      record.storageKey,
      record.installerSha256
    );

    const manifestKey =
      record.releaseManifest.distribution?.manifestStorageKey ??
      buildManifestStorageKey(version);
    const manifest = await this.storage.verifyManifestArtifact(manifestKey);
    if (!manifest.exists) {
      throw new Error(`Release manifest missing in storage for ${version}`);
    }

    const registryConsistent =
      record.releaseManifest.installer.sha256 === record.installerSha256 &&
      record.releaseManifest.version === version;

    if (!registryConsistent) {
      throw new Error(`Registry manifest inconsistent for release ${version}`);
    }

    const timestamp = new Date().toISOString();
    await this.registry.transitionRelease(version, "verified", timestamp);

    return {
      version,
      installerVerified: installer.sha256 === record.installerSha256,
      manifestVerified: manifest.exists,
      registryConsistent,
    };
  }
}
