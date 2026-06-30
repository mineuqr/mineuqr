#!/usr/bin/env node
/**
 * MineuQR Connector release build — bundles runtime, stages artifacts, checksums, manifest.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "connector-product", "release", "connector-release.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const buildDate = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString();

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function listFilesRecursive(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function collectFiles(dir, baseDir = dir) {
  return listFilesRecursive(dir).map((absolutePath) => ({
    absolutePath,
    relativePath: relative(baseDir, absolutePath).replace(/\\/g, "/"),
    sizeBytes: statSync(absolutePath).size,
  }));
}

run("node", ["scripts/sync-connector-release-constants.mjs"]);
run("npm", ["run", "build:connector:bundle"]);

const version = manifest.version;
const stagingRoot = join(root, "dist", "connector-release", version);
const bundleDir = join(stagingRoot, "bundle");
const windowsDir = join(stagingRoot, "windows");

mkdirSync(bundleDir, { recursive: true });
mkdirSync(windowsDir, { recursive: true });

const bundleFiles = ["rlc-service.mjs", "rlc-enroll.mjs"];
for (const file of bundleFiles) {
  copyFileSync(join(root, "dist", "connector", file), join(bundleDir, file));
}

cpSync(join(root, "connector-product", "windows"), windowsDir, {
  recursive: true,
  filter: (src) => !src.includes(`${join("windows", "generated")}`),
});

copyFileSync(manifestPath, join(stagingRoot, "connector-release.json"));

const innoDefines = [
  `#define MyAppName "${manifest.productName}"`,
  `#define MyAppVersion "${manifest.version}"`,
  `#define MyAppPublisher "${manifest.publisher}"`,
  `#define MyAppCopyright "${manifest.copyright}"`,
  `#define MyAppSupportURL "${manifest.supportUrl}"`,
  `#define MyAppId "{${manifest.appId}}"`,
  `#define MyOutputBaseFilename "${manifest.installer.outputBaseName}-${manifest.version}-Setup"`,
  "",
].join("\n");

const generatedDir = join(windowsDir, "generated");
mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, "connector-installer-metadata.iss.inc"), innoDefines, "utf8");
writeFileSync(
  join(root, "connector-product", "windows", "generated", "connector-installer-metadata.iss.inc"),
  innoDefines,
  "utf8"
);

const artifactFiles = collectFiles(stagingRoot);
const artifacts = artifactFiles.map((file) => ({
  name: file.relativePath.split("/").pop(),
  relativePath: file.relativePath,
  sha256: sha256File(file.absolutePath),
  sizeBytes: file.sizeBytes,
}));

const installerFileName = `${manifest.installer.outputBaseName}-${manifest.version}-Setup${manifest.installer.fileExtension}`;
const releaseManifest = {
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
  artifacts,
  installer: {
    fileName: installerFileName,
    sha256: null,
  },
};

writeFileSync(join(stagingRoot, "release-manifest.json"), JSON.stringify(releaseManifest, null, 2), "utf8");

const checksumLines = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.relativePath}`);
writeFileSync(join(stagingRoot, "SHA256SUMS.txt"), `${checksumLines.join("\n")}\n`, "utf8");

const readme = [
  "MineuQR Connector release artifact layout",
  `Version: ${manifest.version}`,
  `Build date: ${buildDate}`,
  "",
  "Contents:",
  "- bundle/ — Node.js connector runtime entrypoints",
  "- windows/ — installer scripts and Inno Setup project",
  "- connector-release.json — canonical release metadata",
  "- release-manifest.json — distribution manifest with checksums",
  "- SHA256SUMS.txt — artifact checksums",
  "",
  "Installer build (Windows release machine):",
  "  powershell -File connector-product/windows/build-release.ps1",
  "",
  "Code signing (after installer build):",
  "  powershell -File connector-product/windows/sign-release.ps1",
  "",
].join("\n");
writeFileSync(join(stagingRoot, "README.txt"), readme, "utf8");

console.log(`Connector release staged at dist/connector-release/${version}`);
