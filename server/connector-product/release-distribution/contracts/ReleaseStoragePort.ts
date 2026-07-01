export type PublishReleaseArtifactInput = {
  version: string;
  installerFileName: string;
  localInstallerPath: string;
  localManifestPath: string;
};

export type PublishedStorageArtifact = {
  storageKey: string;
  installerUrl: string;
  manifestStorageKey: string;
  manifestUrl: string;
};

export type VerifiedStorageArtifact = {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
};

export interface ReleaseStoragePort {
  publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact>;
  resolveDownloadUrl(storageKey: string): Promise<string>;
  verifyInstallerArtifact(
    storageKey: string,
    expectedSha256: string
  ): Promise<VerifiedStorageArtifact>;
  verifyManifestArtifact(storageKey: string): Promise<{ storageKey: string; exists: boolean }>;
}
