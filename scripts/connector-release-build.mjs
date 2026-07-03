#!/usr/bin/env node
/**
 * Stage MineuQR Connector release bundle (no final manifest/checksums).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildInnoSetupDefines,
  getReleaseStagingRoot,
  readCanonicalManifest,
  resolveBuildDate,
  resolveCanonicalManifestPath,
  resolveRepoRoot,
} from "./connector-release-lib.mjs";

const root = resolveRepoRoot();
const manifest = readCanonicalManifest(root);
const manifestPath = resolveCanonicalManifestPath(root);
const buildDate = resolveBuildDate();
const stagingRoot = getReleaseStagingRoot(root, manifest);
const bundleDir = join(stagingRoot, "bundle");
const windowsDir = join(stagingRoot, "windows");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("node", ["scripts/sync-connector-release-constants.mjs"]);
run("npm", ["run", "build:connector:bundle"]);
run("node", ["scripts/stage-connector-service-host.mjs"]);

mkdirSync(bundleDir, { recursive: true });
mkdirSync(windowsDir, { recursive: true });

for (const file of ["rlc-service.mjs", "rlc-enroll.mjs"]) {
  copyFileSync(join(root, "dist", "connector", file), join(bundleDir, file));
}

cpSync(join(root, "connector-product", "windows"), windowsDir, {
  recursive: true,
  filter: (src) => !src.includes(`${join("windows", "generated")}`),
});

copyFileSync(manifestPath, join(stagingRoot, "connector-release.json"));

const innoDefines = buildInnoSetupDefines(manifest);
const generatedDirs = [
  join(windowsDir, "generated"),
  join(root, "connector-product", "windows", "generated"),
];
for (const generatedDir of generatedDirs) {
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(join(generatedDir, "connector-installer-metadata.iss.inc"), innoDefines, "utf8");
}

writeFileSync(
  join(stagingRoot, ".release-build-meta.json"),
  JSON.stringify({ buildDate, version: manifest.version }, null, 2),
  "utf8"
);

console.log(`Connector release staged at dist/connector-release/${manifest.version}`);
console.log("Run connector-product/windows/build-release.ps1 to build the installer and finalize release metadata.");
