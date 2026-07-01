import path from "node:path";
import { normalizeKey } from "../../../storage/shared";
import type { ConnectorDistributionManifest, ConnectorReleaseManifest } from "../../release/connectorReleaseTypes";
import { buildDistributionManifest, getWindowsInstallerFileName } from "../../release/connectorRelease";

export function buildInstallerArtifactId(version: string, installerFileName: string): string {
  return `connector-installer:${version}:${installerFileName}`;
}

export function buildInstallerStorageKey(version: string, installerFileName: string): string {
  return normalizeKey(path.posix.join("connector-releases", version, installerFileName));
}

export function buildManifestStorageKey(version: string): string {
  return normalizeKey(path.posix.join("connector-releases", version, "release-manifest.json"));
}

export function enrichDistributionManifest(input: {
  manifest: ConnectorReleaseManifest;
  buildDate: string;
  artifacts: ConnectorDistributionManifest["artifacts"];
  installerSha256: string;
  installerStorageKey: string;
  manifestStorageKey: string;
}): ConnectorDistributionManifest {
  const installerFileName = getWindowsInstallerFileName(input.manifest);
  const base = buildDistributionManifest({
    manifest: input.manifest,
    buildDate: input.buildDate,
    artifacts: input.artifacts,
    installerSha256: input.installerSha256,
  });

  return {
    ...base,
    schemaVersion: 2,
    distribution: {
      installerStorageKey: input.installerStorageKey,
      installerArtifactId: buildInstallerArtifactId(input.manifest.version, installerFileName),
      manifestStorageKey: input.manifestStorageKey,
    },
    policy: {
      rollbackTo: input.manifest.releasePolicy?.rollbackTo ?? null,
      minSupportedVersion:
        input.manifest.releasePolicy?.minSupportedVersion ?? input.manifest.minDashboardVersion,
      forceUpdate: input.manifest.releasePolicy?.forceUpdate ?? false,
    },
  };
}
