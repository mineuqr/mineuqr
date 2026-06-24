/**
 * THERMAL-PRINTING-13I.2C-2 — stage and zip MineuQR Print Agent distribution package.
 */
import { execSync } from "node:child_process";
import { cp, access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = join(rootDir, "dist", "agent");
const distributionTemplateDir = join(rootDir, "distribution", "print-agent");
const packagesDir = join(rootDir, "dist", "packages");
const packageFolderName = "MineuQR-Print-Agent";
const stagingDir = join(packagesDir, "staging", packageFolderName);
const zipPath = join(packagesDir, "MineuQR-Print-Agent.zip");

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureAgentArtifact() {
  if (!(await pathExists(join(artifactDir, "agent.mjs")))) {
    throw new Error("dist/agent is missing. Run: pnpm build:agent");
  }
}

async function copyDirectory(source, destination) {
  await cp(source, destination, { recursive: true, force: true });
}

async function stagePackage(version) {
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  await copyDirectory(artifactDir, join(stagingDir, "agent"));
  await copyDirectory(join(distributionTemplateDir, "config"), join(stagingDir, "config"));
  await copyDirectory(join(distributionTemplateDir, "scripts"), join(stagingDir, "scripts"));
  await cp(join(distributionTemplateDir, "README.md"), join(stagingDir, "README.md"));

  let agentVersion = version;
  if (await pathExists(join(stagingDir, "agent", "version.json"))) {
    const agentManifest = JSON.parse(
      await readFile(join(stagingDir, "agent", "version.json"), "utf8")
    );
    agentVersion = agentManifest.version ?? version;
  }

  const manifest = {
    name: packageFolderName,
    version: agentVersion,
    packagedAt: new Date().toISOString(),
    layout: "THERMAL-PRINTING-13I.2C-2",
    configPath: "config/mineuqr-agent-config.json",
    agentEntrypoint: "agent/agent.mjs",
    serviceInstallScript: "scripts/install-agent.ps1",
  };

  await writeFile(
    join(stagingDir, "package-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

async function createZipArchive() {
  await mkdir(packagesDir, { recursive: true });
  await rm(zipPath, { force: true });

  const parentDir = join(stagingDir, "..");
  const folderBaseName = packageFolderName;

  if (process.platform === "win32") {
    const command = [
      "powershell",
      "-NoProfile",
      "-Command",
      `Compress-Archive -LiteralPath '${stagingDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
    ].join(" ");
    execSync(command, { stdio: "inherit" });
    return;
  }

  execSync(`zip -r ${JSON.stringify(zipPath)} ${JSON.stringify(folderBaseName)}`, {
    cwd: parentDir,
    stdio: "inherit",
  });
}

async function verifyZip() {
  if (!(await pathExists(zipPath))) {
    throw new Error(`ZIP not created: ${zipPath}`);
  }

  const stats = await readFile(zipPath);
  if (stats.byteLength < 1024) {
    throw new Error("ZIP file is unexpectedly small");
  }

  console.log(`[package:agent] ZIP size: ${(stats.byteLength / 1024 / 1024).toFixed(2)} MB`);
}

async function main() {
  const rootPackage = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
  const version = rootPackage.version ?? "0.0.0";

  console.log("[package:agent] Ensuring build artifact...");
  await ensureAgentArtifact();

  console.log("[package:agent] Staging distribution package...");
  await stagePackage(version);

  console.log("[package:agent] Creating ZIP archive...");
  await createZipArchive();

  await verifyZip();
  console.log(`[package:agent] Complete → ${zipPath}`);
}

main().catch((error) => {
  console.error("[package:agent] Failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
