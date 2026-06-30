import type { ConnectorDistributionManifest } from "../../release/connectorReleaseTypes";

export type PublishedReleaseStatus = "published" | "active" | "superseded";

export type PublishedReleaseRecord = {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  storageKey: string;
  releaseManifest: ConnectorDistributionManifest;
  status: PublishedReleaseStatus;
  publishedAt: string;
  activatedAt: string | null;
};

export type RegisterPublishedReleaseInput = {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  storageKey: string;
  releaseManifest: ConnectorDistributionManifest;
  publishedAt: string;
};

export type PublishedReleaseDownload = {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  downloadUrl: string;
  releaseManifest: ConnectorDistributionManifest;
};
