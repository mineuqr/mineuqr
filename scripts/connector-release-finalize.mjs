#!/usr/bin/env node
/**
 * Finalize MineuQR Connector release metadata after installer exists (and optional signing).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDistributionManifest,
  buildReleaseReadme,
  collectReleaseArtifacts,
  getReleaseStagingRoot,
  getWindowsInstallerFileName,
  readCanonicalManifest,
  resolveBuildDate,
  resolveRepoRoot,
  sha256File,
} from "./connector-release-lib.mjs";

const root = resolveRepoRoot();
const manifest = readCanonicalManifest(root);
const stagingRoot = getReleaseStagingRoot(root, manifest);
const installerFileName = getWindowsInstallerFileName(manifest);
const installerPath = join(stagingRoot, installerFileName);

if (!existsSync(installerPath)) {
  console.error(`Installer not found: ${installerPath}`);
  console.error("Build the installer before finalizing release metadata.");
  process.exit(1);
}

const buildMetaPath = join(stagingRoot, ".release-build-meta.json");
const buildMeta = existsSync(buildMetaPath)
  ? JSON.parse(readFileSync(buildMetaPath, "utf8"))
  : null;
const buildDate = resolveBuildDate(buildMeta?.buildDate);

const artifactFiles = collectReleaseArtifacts(stagingRoot);
const artifacts = artifactFiles.map((file) => ({
  ...file,
  sha256: sha256File(file.absolutePath),
}));

const installerSha256 = sha256File(installerPath);
const releaseManifest = buildDistributionManifest({
  manifest,
  buildDate,
  artifacts,
  installerSha256,
});

writeFileSync(join(stagingRoot, "release-manifest.json"), JSON.stringify(releaseManifest, null, 2), "utf8");

const checksumLines = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.relativePath}`);
writeFileSync(join(stagingRoot, "SHA256SUMS.txt"), `${checksumLines.join("\n")}\n`, "utf8");

writeFileSync(
  join(stagingRoot, "README.txt"),
  buildReleaseReadme({ manifest, buildDate, installerFileName, complete: true }),
  "utf8"
);

console.log(`Release metadata finalized at dist/connector-release/${manifest.version}`);
console.log(`Installer checksum: ${installerSha256}`);
