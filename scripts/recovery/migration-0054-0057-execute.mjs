/**
 * MIGRATION-GOVERNANCE-RESTORATION-1 — controlled production recovery executor.
 * Applies pending journal migrations 0054–0057 via drizzle-kit migrate.
 *
 * DEFAULT: dry-run (preflight only). Execution requires explicit operator flags.
 *
 * Usage:
 *   node scripts/recovery/migration-0054-0057-execute.mjs
 *   node scripts/recovery/migration-0054-0057-execute.mjs --execute --confirm-gateway01
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { auditConnectionTarget } from "../lib/tidb-audit-connection.mjs";

const PRODUCTION_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";
const PRODUCTION_DB = "mineuqr";

async function main() {
  const execute = process.argv.includes("--execute");
  const confirmGateway = process.argv.includes("--confirm-gateway01");

  console.log("=== Migration 0054–0057 recovery execute ===\n");

  const preflight = spawnSync(
    process.execPath,
    ["scripts/recovery/migration-0054-0057-preflight.mjs"],
    { stdio: "inherit", cwd: process.cwd(), env: process.env }
  );
  if (preflight.status !== 0) {
    process.exit(preflight.status ?? 1);
  }

  if (!execute) {
    console.log("\n[recovery-execute] DRY-RUN — no migrations applied.");
    console.log("To execute: node scripts/recovery/migration-0054-0057-execute.mjs --execute --confirm-gateway01");
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[recovery-execute] DATABASE_URL is required");
    process.exit(1);
  }

  const target = auditConnectionTarget(url);
  if (!confirmGateway) {
    console.error("[recovery-execute] BLOCKED — pass --confirm-gateway01 after verifying target.");
    console.error("Target:", JSON.stringify(target));
    process.exit(1);
  }

  if (target.host !== PRODUCTION_HOST || target.database !== PRODUCTION_DB) {
    console.error("[recovery-execute] BLOCKED — target is not gateway01/mineuqr");
    console.error("Target:", JSON.stringify(target));
    process.exit(1);
  }

  console.log("\n[recovery-execute] Applying pending migrations via drizzle-kit migrate...");
  const migrate = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
    shell: true,
  });
  if (migrate.status !== 0) {
    console.error("[recovery-execute] migrate failed — stop and investigate.");
    process.exit(migrate.status ?? 1);
  }

  const verify = spawnSync(process.execPath, ["scripts/verify-schema-deployment.cjs"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  if (verify.status !== 0) {
    console.error("[recovery-execute] schema verify failed after migrate.");
    process.exit(verify.status ?? 1);
  }

  console.log("\n[recovery-execute] COMPLETE — verify application smoke before traffic.");
}

main().catch((err) => {
  console.error("[recovery-execute] Failed:", err.message);
  process.exit(1);
});
