export type ConnectorReleaseManifest = {
  schemaVersion: number;
  productName: string;
  version: string;
  publisher: string;
  copyright: string;
  supportUrl: string;
  appId: string;
  minDashboardVersion: string;
  installer: {
    outputBaseName: string;
    fileExtension: string;
  };
};

export type ReleaseArtifactRecord = {
  name: string;
  relativePath: string;
  sha256: string;
  sizeBytes: number;
};

export type ConnectorDistributionManifest = {
  schemaVersion: 1;
  productName: string;
  version: string;
  buildDate: string;
  publisher: string;
  supportUrl: string;
  copyright: string;
  compatibility: {
    minDashboardVersion: string;
    platforms: string[];
  };
  artifacts: ReleaseArtifactRecord[];
  installer: {
    fileName: string;
    sha256: string | null;
  };
};
