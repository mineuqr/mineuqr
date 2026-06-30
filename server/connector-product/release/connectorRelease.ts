import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ConnectorDistributionManifest,
  ConnectorReleaseManifest,
  ReleaseArtifactRecord,
} from "./connectorReleaseTypes";

export type {
  ConnectorDistributionManifest,
  ConnectorReleaseManifest,
  ReleaseArtifactRecord,
} from "./connectorReleaseTypes";

export {
  MINEUQR_CONNECTOR_APP_ID,
  MINEUQR_CONNECTOR_COPYRIGHT,
  MINEUQR_CONNECTOR_MIN_DASHBOARD_VERSION,
  MINEUQR_CONNECTOR_PRODUCT_NAME,
  MINEUQR_CONNECTOR_PUBLISHER,
  MINEUQR_CONNECTOR_SUPPORT_URL,
  MINEUQR_CONNECTOR_VERSION,
} from "./connectorReleaseConstants.generated";

const MANIFEST_SEGMENTS = ["connector-product", "release", "connector-release.json"] as const;

export function resolveConnectorReleaseManifestPath(fromModuleDir?: string): string {
  const base = fromModuleDir ?? dirname(fileURLToPath(import.meta.url));
  return join(base, "..", "..", "..", ...MANIFEST_SEGMENTS);
}

export function readConnectorReleaseManifest(manifestPath?: string): ConnectorReleaseManifest {
  const path = manifestPath ?? resolveConnectorReleaseManifestPath();
  return JSON.parse(readFileSync(path, "utf8")) as ConnectorReleaseManifest;
}

export function getWindowsInstallerFileName(
  manifest: ConnectorReleaseManifest = readConnectorReleaseManifest()
): string {
  return `${manifest.installer.outputBaseName}-${manifest.version}-Setup${manifest.installer.fileExtension}`;
}

export function getInnoOutputBaseFilename(
  manifest: ConnectorReleaseManifest = readConnectorReleaseManifest()
): string {
  return `${manifest.installer.outputBaseName}-${manifest.version}-Setup`;
}

export function getReleaseStagingDirectoryName(
  manifest: ConnectorReleaseManifest = readConnectorReleaseManifest()
): string {
  return `${manifest.installer.outputBaseName}-${manifest.version}`;
}

export function buildDistributionManifest(input: {
  manifest: ConnectorReleaseManifest;
  buildDate: string;
  artifacts: ReleaseArtifactRecord[];
  installerSha256?: string | null;
  installerRelativePath?: string;
}): ConnectorDistributionManifest {
  return {
    schemaVersion: 1,
    productName: input.manifest.productName,
    version: input.manifest.version,
    buildDate: input.buildDate,
    publisher: input.manifest.publisher,
    supportUrl: input.manifest.supportUrl,
    copyright: input.manifest.copyright,
    compatibility: {
      minDashboardVersion: input.manifest.minDashboardVersion,
      platforms: ["windows"],
    },
    artifacts: input.artifacts,
    installer: {
      fileName: getWindowsInstallerFileName(input.manifest),
      relativePath: input.installerRelativePath ?? getWindowsInstallerFileName(input.manifest),
      sha256: input.installerSha256 ?? null,
    },
  };
}

export function buildInnoSetupDefines(manifest: ConnectorReleaseManifest): string {
  return [
    `#define MyAppName "${manifest.productName}"`,
    `#define MyAppVersion "${manifest.version}"`,
    `#define MyAppPublisher "${manifest.publisher}"`,
    `#define MyAppCopyright "${manifest.copyright}"`,
    `#define MyAppSupportURL "${manifest.supportUrl}"`,
    `#define MyAppId "${manifest.appId}"`,
    `#define MyOutputBaseFilename "${getInnoOutputBaseFilename(manifest)}"`,
    "",
  ].join("\n");
}
