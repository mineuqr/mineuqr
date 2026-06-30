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

export interface ReleaseStoragePort {
  publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact>;
  resolveDownloadUrl(storageKey: string): Promise<string>;
}
