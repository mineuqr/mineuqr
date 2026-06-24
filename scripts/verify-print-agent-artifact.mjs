/**
 * THERMAL-PRINTING-13I.2C-1 — verify dist/agent artifact layout.
 */
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = join(rootDir, "dist", "agent");

async function assertExists(path) {
  await access(path);
}

async function main() {
  const required = [
    "agent.mjs",
    "package.json",
    "version.json",
    "print-agent.cmd",
    "README.txt",
    "scripts/windowsSpoolerRawPrint.ps1",
    "node_modules/ws/package.json",
    "node_modules/dotenv/package.json",
    "node_modules/@napi-rs/canvas/package.json",
    "node_modules/bidi-js/package.json",
    "node_modules/arabic-persian-reshaper/package.json",
  ];

  for (const relativePath of required) {
    await assertExists(join(artifactDir, relativePath));
    console.log(`[verify:agent-artifact] ok ${relativePath}`);
  }

  const version = JSON.parse(await readFile(join(artifactDir, "version.json"), "utf8"));
  if (!version.version || version.entrypoint !== "agent.mjs") {
    throw new Error("version.json is missing required fields");
  }

  const bundle = await readFile(join(artifactDir, "agent.mjs"), "utf8");
  if (!bundle.includes("bootAgentFromDeploymentConfig")) {
    throw new Error("agent.mjs bundle does not include agent bootstrap");
  }

  console.log("[verify:agent-artifact] complete");
}

main().catch((error) => {
  console.error("[verify:agent-artifact] Failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
