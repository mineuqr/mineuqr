/**
 * THERMAL-PRINTING-13I.2C-2 — verify MineuQR-Print-Agent.zip extraction and startup.
 */
import { execSync, spawn } from "node:child_process";
import { access, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const zipPath = join(rootDir, "dist", "packages", "MineuQR-Print-Agent.zip");
const smokeConfigPath = join(
  rootDir,
  "agent",
  "config",
  "production.print-host.example.json"
);

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function extractZip(targetDir) {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "inherit" }
    );
    return join(targetDir, "MineuQR-Print-Agent");
  }

  execSync(`unzip -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(targetDir)}`, {
    stdio: "inherit",
  });
  return join(targetDir, "MineuQR-Print-Agent");
}

async function assertPackageLayout(packageRoot) {
  const required = [
    "README.md",
    "package-manifest.json",
    "agent/agent.mjs",
    "agent/print-agent.cmd",
    "agent/scripts/windowsSpoolerRawPrint.ps1",
    "agent/node_modules/ws/package.json",
    "config/mineuqr-agent-config.json.example",
    "config/CONFIG-PLACEMENT.txt",
    "scripts/install-agent.ps1",
    "scripts/uninstall-agent.ps1",
    "scripts/print-agent-service.cmd",
    "scripts/tools/README.txt",
  ];

  for (const relativePath of required) {
    const absolutePath = join(packageRoot, relativePath);
    if (!(await pathExists(absolutePath))) {
      throw new Error(`Missing packaged file: ${relativePath}`);
    }
    console.log(`[verify:agent-package] ok ${relativePath}`);
  }
}

async function smokeStartAgent(packageRoot) {
  if (!(await pathExists(smokeConfigPath))) {
    throw new Error(`Smoke config missing: ${smokeConfigPath}`);
  }

  const configDir = join(packageRoot, "config");
  const activeConfigPath = join(configDir, "mineuqr-agent-config.json");
  await cp(smokeConfigPath, activeConfigPath);

  const agentEntry = join(packageRoot, "agent", "agent.mjs");
  const child = spawn(
    process.execPath,
    [agentEntry, "--config", activeConfigPath],
    {
      cwd: join(packageRoot, "agent"),
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const ready = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Agent startup timed out"));
    }, 20_000);

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (output.includes("[PrintAgent] Ready")) {
        clearTimeout(timeout);
        child.kill("SIGTERM");
        resolve(output);
      }
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (output.includes("[PrintAgent] Ready")) {
        return;
      }
      clearTimeout(timeout);
      reject(new Error(`Agent exited before ready (code ${code}): ${output}`));
    });
  });

  if (!String(ready).includes("profiles=")) {
    throw new Error("Agent ready line missing profile count");
  }

  console.log("[verify:agent-package] startup smoke test passed");
}

async function main() {
  if (!(await pathExists(zipPath))) {
    throw new Error("ZIP missing. Run: pnpm package:agent");
  }

  const extractRoot = await mkdtemp(join(tmpdir(), "mineuqr-agent-package-"));
  try {
    const packageRoot = await extractZip(extractRoot);
    await assertPackageLayout(packageRoot);

    const manifest = JSON.parse(
      await readFile(join(packageRoot, "package-manifest.json"), "utf8")
    );
    if (!manifest.version || manifest.layout !== "THERMAL-PRINTING-13I.2C-2") {
      throw new Error("package-manifest.json invalid");
    }

    await smokeStartAgent(packageRoot);
    console.log("[verify:agent-package] complete");
  } finally {
    await rm(extractRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[verify:agent-package] Failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
