#!/usr/bin/env node
/**
 * Sync TypeScript release constants from connector-product/release/connector-release.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "connector-product", "release", "connector-release.json");
const outputPath = join(
  root,
  "server",
  "connector-product",
  "release",
  "connectorReleaseConstants.generated.ts"
);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const lines = [
  "/** AUTO-GENERATED from connector-product/release/connector-release.json — run npm run connector:sync-version */",
  `export const MINEUQR_CONNECTOR_PRODUCT_NAME = ${JSON.stringify(manifest.productName)} as const;`,
  `export const MINEUQR_CONNECTOR_VERSION = ${JSON.stringify(manifest.version)} as const;`,
  `export const MINEUQR_CONNECTOR_PUBLISHER = ${JSON.stringify(manifest.publisher)} as const;`,
  `export const MINEUQR_CONNECTOR_COPYRIGHT = ${JSON.stringify(manifest.copyright)} as const;`,
  `export const MINEUQR_CONNECTOR_SUPPORT_URL = ${JSON.stringify(manifest.supportUrl)} as const;`,
  `export const MINEUQR_CONNECTOR_APP_ID = ${JSON.stringify(manifest.appId)} as const;`,
  `export const MINEUQR_CONNECTOR_MIN_DASHBOARD_VERSION = ${JSON.stringify(manifest.minDashboardVersion)} as const;`,
  "",
];

writeFileSync(outputPath, lines.join("\n"), "utf8");

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

const innoOutputDirs = [
  join(root, "connector-product", "windows", "generated"),
];

for (const dir of innoOutputDirs) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "connector-installer-metadata.iss.inc"), innoDefines, "utf8");
}

console.log(`Synced connector release constants → ${outputPath}`);
