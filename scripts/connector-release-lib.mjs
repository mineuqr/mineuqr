import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function resolveRepoRoot() {
  return process.env.CONNECTOR_RELEASE_REPO_ROOT?.trim() || defaultRoot;
}

export function resolveCanonicalManifestPath(root = resolveRepoRoot()) {
  return join(root, "connector-product", "release", "connector-release.json");
}

export function readCanonicalManifest(root = resolveRepoRoot()) {
  return JSON.parse(readFileSync(resolveCanonicalManifestPath(root), "utf8"));
}

export function getWindowsInstallerFileName(manifest) {
  return `${manifest.installer.outputBaseName}-${manifest.version}-Setup${manifest.installer.fileExtension}`;
}

export function getInnoOutputBaseFilename(manifest) {
  return `${manifest.installer.outputBaseName}-${manifest.version}-Setup`;
}

export function getReleaseStagingRoot(root, manifest) {
  return join(root, "dist", "connector-release", manifest.version);
}

export function buildInnoSetupDefines(manifest) {
  return [
    `#define MyAppName "${manifest.productName}"`,
    `#define MyAppVersion "${manifest.version}"`,
    `#define MyAppPublisher "${manifest.publisher}"`,
    `#define MyAppCopyright "${manifest.copyright}"`,
    `#define MyAppSupportURL "${manifest.supportUrl}"`,
    `#define MyAppId "{${manifest.appId}}"`,
    `#define MyOutputBaseFilename "${getInnoOutputBaseFilename(manifest)}"`,
    "",
  ].join("\n");
}

export function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function listFilesRecursive(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.name === ".release-build-meta.json") continue;
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

export function collectReleaseArtifacts(stagingRoot) {
  return listFilesRecursive(stagingRoot).map((absolutePath) => ({
    absolutePath,
    relativePath: relative(stagingRoot, absolutePath).replace(/\\/g, "/"),
    sizeBytes: statSync(absolutePath).size,
  }));
}

export function buildDistributionManifest({ manifest, buildDate, artifacts, installerSha256 }) {
  const installerFileName = getWindowsInstallerFileName(manifest);
  const installerRelativePath = artifacts.find(
    (artifact) => artifact.relativePath === installerFileName
  )?.relativePath ?? installerFileName;

  return {
    schemaVersion: 1,
    productName: manifest.productName,
    version: manifest.version,
    buildDate,
    publisher: manifest.publisher,
    supportUrl: manifest.supportUrl,
    copyright: manifest.copyright,
    compatibility: {
      minDashboardVersion: manifest.minDashboardVersion,
      platforms: ["windows"],
    },
    artifacts: artifacts.map((artifact) => ({
      name: artifact.relativePath.split("/").pop(),
      relativePath: artifact.relativePath,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes,
    })),
    installer: {
      fileName: installerFileName,
      relativePath: installerRelativePath,
      sha256: installerSha256 ?? null,
    },
  };
}

export function buildReleaseReadme({ manifest, buildDate, installerFileName, complete }) {
  const lines = [
    "MineuQR Connector release artifact layout",
    `Version: ${manifest.version}`,
    `Build date: ${buildDate}`,
    "",
    "Contents:",
    "- bundle/ — Node.js connector runtime entrypoints",
    "- windows/ — installer scripts and Inno Setup project",
    ` - ${installerFileName} — Windows installer`,
    "- connector-release.json — canonical release metadata",
    "- release-manifest.json — distribution manifest with checksums",
    "- SHA256SUMS.txt — artifact checksums",
    "",
  ];

  if (complete) {
    lines.push("Release status: complete — installer metadata and checksums reflect the distributable installer.");
  } else {
    lines.push("Release status: staged — run connector-product/windows/build-release.ps1 to produce the installer and finalize metadata.");
  }

  return `${lines.join("\n")}\n`;
}

export function resolveBuildDate(existingBuildDate) {
  if (existingBuildDate) return existingBuildDate;
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString();
  }
  return new Date().toISOString();
}
