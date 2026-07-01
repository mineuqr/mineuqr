import type {
  ArtifactPublicationPolicy,
  RetireCanonicalArtifactsInput,
  RetiredCanonicalArtifacts,
} from "../domain/ReleaseArtifactLifecycle";

export type PublishReleaseArtifactInput = {
  version: string;
  installerFileName: string;
  localInstallerPath: string;
  localManifestPath: string;
  publicationPolicy?: ArtifactPublicationPolicy;
};

export type { RetireCanonicalArtifactsInput, RetiredCanonicalArtifacts };

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
  retireCanonicalArtifacts(
    input: RetireCanonicalArtifactsInput
  ): Promise<RetiredCanonicalArtifacts | null>;
  resolveDownloadUrl(storageKey: string): Promise<string>;
  verifyInstallerArtifact(
    storageKey: string,
    expectedSha256: string
  ): Promise<VerifiedStorageArtifact>;
  verifyManifestArtifact(storageKey: string): Promise<{ storageKey: string; exists: boolean }>;
}
