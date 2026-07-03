#!/usr/bin/env node
/**
 * Stage WinSW service host executable for the MineuQR Connector Windows installer.
 * WinSW implements the Windows Service Control Manager protocol for the Node runtime.
 */
import { createWriteStream, readFileSync, rmSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const WINSW_VERSION = "v2.12.0";
const WINSW_SHA256 = "05b82d46ad331cc16bdc00de5c6332c1ef818df8ceefcd49c726553209b3a0da";
const WINSW_URL = `https://github.com/winsw/winsw/releases/download/${WINSW_VERSION}/WinSW-x64.exe`;
const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const serviceHostDir = join(root, "connector-product", "windows", "service-host");
const serviceHostExe = join(serviceHostDir, "MineuQRConnectorService.exe");

async function downloadWinSw(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download WinSW from ${url}: HTTP ${response.status}`);
  }

  await pipeline(response.body, createWriteStream(destination));
}

function assertWinSwSha256(filePath) {
  const actual = createHash("sha256").update(readFileSync(filePath)).digest("hex");
  if (actual !== WINSW_SHA256) {
    rmSync(filePath, { force: true });
    throw new Error(
      `WinSW SHA256 mismatch for ${filePath}: expected ${WINSW_SHA256}, got ${actual}`,
    );
  }
}

mkdirSync(serviceHostDir, { recursive: true });
await downloadWinSw(WINSW_URL, serviceHostExe);
assertWinSwSha256(serviceHostExe);
chmodSync(serviceHostExe, 0o755);

writeFileSync(
  join(serviceHostDir, "WINSW-NOTICE.txt"),
  [
    "MineuQR Connector uses WinSW (Windows Service Wrapper).",
    `Source release: ${WINSW_VERSION}`,
    "License: MIT (https://github.com/winsw/winsw/blob/v2/LICENSE.txt)",
    "Executable staged at build time by scripts/stage-connector-service-host.mjs",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Connector service host staged at ${serviceHostExe}`);
