#!/usr/bin/env node
/**
 * Sync TypeScript release constants from connector-product/release/connector-release.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildInnoSetupDefines, readCanonicalManifest } from "./connector-release-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(
  root,
  "server",
  "connector-product",
  "release",
  "connectorReleaseConstants.generated.ts"
);

const manifest = readCanonicalManifest(root);

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

const innoDefines = buildInnoSetupDefines(manifest);
const innoOutputDir = join(root, "connector-product", "windows", "generated");
mkdirSync(innoOutputDir, { recursive: true });
writeFileSync(join(innoOutputDir, "connector-installer-metadata.iss.inc"), innoDefines, "utf8");

console.log(`Synced connector release constants → ${outputPath}`);
