/**
 * MIGRATION-EXECUTION-ALIGNMENT-1 — recovery execute entry (delegates to phased orchestrator).
 *
 * Bulk `drizzle-kit migrate` is intentionally blocked. Use phased execution only.
 *
 * Usage:
 *   node scripts/recovery/migration-0054-0057-execute.mjs
 *   node scripts/recovery/migration-0054-0057-execute.mjs --execute --confirm-gateway01 --confirm-backup
 */
import { spawnSync } from "node:child_process";

function main() {
  const forwarded = process.argv.slice(2);
  const hasExecute = forwarded.includes("--execute");

  console.log("=== Migration 0054–0057 recovery execute (phased) ===\n");

  if (hasExecute && forwarded.some((a) => a.includes("drizzle-kit"))) {
    console.error("[recovery-execute] BLOCKED — bulk drizzle-kit migrate is not permitted.");
    process.exit(1);
  }

  const result = spawnSync(
    process.execPath,
    ["scripts/recovery/migration-0054-0057-phased-execute.mjs", ...forwarded],
    { stdio: "inherit", cwd: process.cwd(), env: process.env }
  );
  process.exit(result.status ?? 1);
}

main();
