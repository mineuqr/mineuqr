/**
 * THERMAL-PRINTING-13I.2C-1 — production print agent artifact build.
 */
import { execSync } from "node:child_process";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(rootDir, "dist", "agent");
const scriptsDir = join(outDir, "scripts");
const assetsDir = join(outDir, "assets");

const RUNTIME_DEPENDENCIES = [
  "dotenv",
  "ws",
  "@napi-rs/canvas",
  "bidi-js",
  "arabic-persian-reshaper",
];

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(source, destination) {
  if (!(await pathExists(source))) {
    return false;
  }
  await copyFile(source, destination);
  return true;
}

async function buildBundle() {
  await mkdir(outDir, { recursive: true });
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(rootDir, "scripts", "print-agent.ts")],
    outfile: join(outDir, "agent.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    logLevel: "info",
    banner: {
      js: "#!/usr/bin/env node",
    },
  });

  await esbuild.build({
    entryPoints: [join(rootDir, "scripts", "bind-printers.ts")],
    outfile: join(outDir, "bind-printers.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    logLevel: "info",
    banner: {
      js: "#!/usr/bin/env node",
    },
  });
}

async function writeAgentPackageJson(version) {
  const rootPackage = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
  const dependencies = Object.fromEntries(
    RUNTIME_DEPENDENCIES.map((name) => [name, rootPackage.dependencies[name]])
  );

  const agentPackage = {
    name: "mineuqr-print-agent",
    version,
    private: true,
    type: "module",
    description: "MineuQR thermal print agent runtime artifact",
    engines: {
      node: ">=20",
    },
    dependencies,
  };

  await writeFile(join(outDir, "package.json"), `${JSON.stringify(agentPackage, null, 2)}\n`);
}

async function writeVersionManifest(version) {
  const manifest = {
    name: "mineuqr-print-agent",
    version,
    builtAt: new Date().toISOString(),
    entrypoint: "agent.mjs",
    node: ">=20",
    platform: "windows",
    runtimeDependencies: RUNTIME_DEPENDENCIES,
  };

  await writeFile(join(outDir, "version.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function copyRuntimeAssets() {
  await copyFile(
    join(rootDir, "agent", "transports", "windowsSpoolerRawPrint.ps1"),
    join(scriptsDir, "windowsSpoolerRawPrint.ps1")
  );

  const fontCopied = await copyIfExists(
    join(rootDir, "server", "assets", "Cairo-Variable.ttf"),
    join(assetsDir, "Cairo-Variable.ttf")
  );

  return { fontCopied };
}

async function installRuntimeDependencies() {
  execSync("npm install --omit=dev --no-package-lock", {
    cwd: outDir,
    stdio: "inherit",
  });
}

async function writeLaunchers() {
  const windowsLauncher = `@echo off\r\nsetlocal\r\nnode "%~dp0agent.mjs" %*\r\n`;
  await writeFile(join(outDir, "print-agent.cmd"), windowsLauncher);

  const bindLauncher = `@echo off\r\nsetlocal\r\nnode "%~dp0bind-printers.mjs" %*\r\n`;
  await writeFile(join(outDir, "bind-printers.cmd"), bindLauncher);

  const readme = [
    "MineuQR Print Agent artifact",
    "",
    "Run:",
    "  node agent.mjs --config <path-to-config.json>",
    "  print-agent.cmd --config <path-to-config.json>",
    "  node bind-printers.mjs --config <path-to-config.json>",
    "  bind-printers.cmd --config <path-to-config.json>",
    "",
    "Environment:",
    "  PRINT_AGENT_CONFIG_PATH",
    "  PRINT_AGENT_SERVER_URL",
    "  PRINT_AGENT_ID",
    "  PRINT_AGENT_AGENT_NAME",
    "  PRINT_AGENT_SPOOLER_SCRIPT_PATH",
    "",
  ].join("\n");
  await writeFile(join(outDir, "README.txt"), readme);
}

async function verifyArtifact({ fontCopied }) {
  const requiredPaths = [
    join(outDir, "agent.mjs"),
    join(outDir, "bind-printers.mjs"),
    join(outDir, "package.json"),
    join(outDir, "version.json"),
    join(outDir, "scripts", "windowsSpoolerRawPrint.ps1"),
    join(outDir, "node_modules", "ws", "package.json"),
    join(outDir, "node_modules", "dotenv", "package.json"),
  ];

  for (const path of requiredPaths) {
    if (!(await pathExists(path))) {
      throw new Error(`Missing required artifact file: ${path}`);
    }
  }

  if (!fontCopied) {
    console.warn(
      "[build:agent] Cairo-Variable.ttf not found in server/assets — Arabic raster receipts require dist/agent/assets/Cairo-Variable.ttf"
    );
  }

  console.log("[build:agent] Artifact verification passed");
}

async function main() {
  const rootPackage = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
  const version = rootPackage.version ?? "0.0.0";

  console.log("[build:agent] Building bundle...");
  await buildBundle();

  console.log("[build:agent] Copying runtime assets...");
  const assetResult = await copyRuntimeAssets();

  console.log("[build:agent] Writing package manifest...");
  await writeAgentPackageJson(version);
  await writeVersionManifest(version);
  await writeLaunchers();

  console.log("[build:agent] Installing runtime dependencies...");
  await installRuntimeDependencies();

  await verifyArtifact(assetResult);
  console.log(`[build:agent] Complete → ${outDir}`);
}

main().catch((error) => {
  console.error("[build:agent] Failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
