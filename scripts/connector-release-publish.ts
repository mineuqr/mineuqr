#!/usr/bin/env tsx
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getReleaseStagingRoot,
  getWindowsInstallerFileName,
  readConnectorReleaseManifest,
} from "../server/connector-product/release/connectorRelease";
import { releaseDistributionComposition, shutdownReleaseDistributionResources } from "../server/connector-product/release-distribution/releaseDistributionComposition";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const manifest = readConnectorReleaseManifest();
  const versionArgIndex = process.argv.indexOf("--version");
  const version = versionArgIndex >= 0 ? process.argv[versionArgIndex + 1] : manifest.version;
  if (!version) {
    throw new Error("Release version is required");
  }

  const releaseManifest = { ...manifest, version };
  const releaseDirectory = getReleaseStagingRoot(repoRoot, releaseManifest);
  const installerFileName = getWindowsInstallerFileName(releaseManifest);
  const activate = process.argv.includes("--activate");

  const result = await releaseDistributionComposition.publicationService.publishRelease({
    version,
    releaseDirectory,
    installerFileName,
    activate,
  });

  console.log(`Published connector release ${result.published.version}`);
  console.log(`Activated: ${result.activated}`);
  console.log(`Installer URL: ${result.installerUrl}`);
  console.log(`Manifest URL: ${result.manifestUrl}`);
}

async function runCli(): Promise<void> {
  try {
    await main();
  } finally {
    await shutdownReleaseDistributionResources();
  }
}

void runCli().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
