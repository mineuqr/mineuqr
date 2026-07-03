#!/usr/bin/env node
/**
 * Stage production runtime npm dependencies for packaged Connector entries.
 * Application TypeScript is esbuild-bundled into dist/connector/*.mjs.
 * npm packages that must remain external are copied into dist/connector/node_modules.
 */
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const connectorDist = join(root, "dist", "connector");
const require = createRequire(join(root, "package.json"));

/** Runtime npm dependencies referenced from bundled connector entrypoints. */
const RUNTIME_PACKAGES = ["ws"];

function stagePackage(packageName) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const packageDir = dirname(packageJsonPath);
  const destination = join(connectorDist, "node_modules", packageName);
  mkdirSync(dirname(destination), { recursive: true });
  rmSync(destination, { recursive: true, force: true });
  cpSync(packageDir, destination, { recursive: true });
}

function assertBundledImportsResolvable() {
  const serviceBundle = readFileSync(join(connectorDist, "rlc-service.mjs"), "utf8");
  const externalImports = [...serviceBundle.matchAll(/^import\s+.+?\s+from\s+["']([^"']+)["'];?$/gm)]
    .map((match) => match[1])
    .filter((specifier) => !specifier.startsWith("node:"));

  const missing = externalImports.filter((specifier) => {
    const topLevel = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];
    return !RUNTIME_PACKAGES.includes(topLevel);
  });

  if (missing.length > 0) {
    throw new Error(
      `Bundled connector references unpacked runtime dependencies: ${missing.join(", ")}. Update RUNTIME_PACKAGES in scripts/stage-connector-runtime-deps.mjs.`,
    );
  }
}

for (const packageName of RUNTIME_PACKAGES) {
  stagePackage(packageName);
}

assertBundledImportsResolvable();

console.log(
  `Connector runtime dependencies staged at dist/connector/node_modules (${RUNTIME_PACKAGES.join(", ")})`,
);
