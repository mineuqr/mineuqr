/**
 * MIGRATION-EXECUTION-ALIGNMENT-1 — certified phased production recovery executor.
 *
 * Operational execution order (authoritative): 0054 → 0055 → 0057 → 0056
 * Journal idx order (governance only):         0054 → 0055 → 0056 → 0057
 *
 * DEFAULT: dry-run plan. No bulk drizzle-kit migrate.
 *
 * Usage:
 *   node scripts/recovery/migration-0054-0057-phased-execute.mjs
 *   node scripts/recovery/migration-0054-0057-phased-execute.mjs --execute --confirm-gateway01 --confirm-backup
 *   node scripts/recovery/migration-0054-0057-phased-execute.mjs --execute --confirm-gateway01 --confirm-backup --resume-from phase-3
 *   node scripts/recovery/migration-0054-0057-phased-execute.mjs --execute --confirm-gateway01 --confirm-backup --phase phase-4
 *   node scripts/recovery/migration-0054-0057-phased-execute.mjs --execute --confirm-gateway01 --confirm-backup --resume-from verify
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { createAuditConnection, auditConnectionTarget } from "../lib/tidb-audit-connection.mjs";

const require = createRequire(import.meta.url);
const {
  OPERATIONAL_MIGRATION_ORDER,
  PACKAGE_CHECKSUM,
  PRODUCTION_DB,
  PRODUCTION_HOST,
  RECOVERY_PHASES,
  getPhaseById,
  resolvePhaseRunList,
} = require("../lib/phased-recovery-contract.cjs");
const {
  SMOKE_CHECKLIST,
  countLegacyLineItems,
  countLegacyProjectionRows,
  executeApprovedMigration,
  isMigrationPhaseComplete,
  recordMigrationHash,
  verifyPhaseSchema,
} = require("../lib/phased-recovery-engine.cjs");

const RESUME_ALIASES = {
  verify: "phase-5",
  smoke: "phase-6",
};

function parseArg(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < process.argv.length && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function resolveResumeFrom() {
  const raw = parseArg("--resume-from");
  if (!raw) return undefined;
  return RESUME_ALIASES[raw] ?? raw;
}

function assertExecutionGates() {
  const execute = process.argv.includes("--execute");
  if (!execute) return { execute: false };

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[phased-recovery] DATABASE_URL is required");
    process.exit(1);
  }

  const target = auditConnectionTarget(url);
  if (!process.argv.includes("--confirm-gateway01")) {
    console.error("[phased-recovery] BLOCKED — pass --confirm-gateway01 after verifying target.");
    console.error("Target:", JSON.stringify(target));
    process.exit(1);
  }
  if (target.host !== PRODUCTION_HOST || target.database !== PRODUCTION_DB) {
    console.error("[phased-recovery] BLOCKED — target is not gateway01/mineuqr");
    console.error("Target:", JSON.stringify(target));
    process.exit(1);
  }

  const backupOk =
    process.argv.includes("--confirm-backup") ||
    process.env.TIDB_BACKUP_CONFIRMED === "YES";
  if (!backupOk) {
    console.error(
      "[phased-recovery] BLOCKED — backup not confirmed. Set TIDB_BACKUP_CONFIRMED=YES or pass --confirm-backup."
    );
    process.exit(1);
  }

  return { execute: true, url, target };
}

function runPreflight() {
  const preflight = spawnSync(
    process.execPath,
    ["scripts/recovery/migration-0054-0057-preflight.mjs"],
    { stdio: "inherit", cwd: process.cwd(), env: process.env }
  );
  if (preflight.status !== 0) {
    process.exit(preflight.status ?? 1);
  }
}

function runSchemaVerify(label) {
  console.log(`\n[phased-recovery] Running verify-schema (${label})...`);
  const verify = spawnSync(process.execPath, ["scripts/verify-schema-deployment.cjs"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  if (verify.status !== 0) {
    console.error(`[phased-recovery] STOP — verify-schema failed after ${label}`);
    process.exit(verify.status ?? 1);
  }
}

function runBackfillVerifyOnly() {
  console.log("\n[phased-recovery] Running ORDER-READ-BACKFILL-1 verify-only...");
  const verify = spawnSync(
    "pnpm",
    ["exec", "tsx", "scripts/order-read-category-backfill-execute.ts", "--scope", "full", "--verify-only"],
    {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, ORDER_READ_CATEGORY_BACKFILL_CONFIRM: "YES" },
      shell: true,
    }
  );
  if (verify.status !== 0) {
    console.error("[phased-recovery] STOP — backfill integrity verification failed.");
    process.exit(verify.status ?? 2);
  }
}

async function verifyMigrationPhase(conn, phase, { dryRun }) {
  const tag = phase.migrationTag;
  const status = await isMigrationPhaseComplete(conn, phase);

  if (status.complete) {
    console.log(`[phased-recovery] ${phase.id} already complete — skip DDL for ${tag}`);
    return { skipped: true };
  }

  if (status.status === "drift_hash_without_schema") {
    console.error(
      `[phased-recovery] STOP — hash recorded for ${tag} but schema missing:`,
      status.schemaMissing.join(", ")
    );
    process.exit(1);
  }

  if (status.status === "schema_only_needs_hash") {
    console.log(`[phased-recovery] ${tag} schema present — registering hash only`);
    if (!dryRun) {
      await recordMigrationHash(conn, tag);
    }
    return { skipped: true, hashRegistered: true };
  }

  return executeApprovedMigration(conn, tag, { dryRun });
}

async function verifyPhaseGate(conn, phase) {
  const missing = await verifyPhaseSchema(conn, phase.verify);
  if (missing.length > 0) {
    console.error(`[phased-recovery] STOP — ${phase.id} verification failed. Missing:`, missing.join(", "));
    process.exit(1);
  }

  if (phase.kind === "migration") {
    const status = await isMigrationPhaseComplete(conn, phase);
    if (!status.complete) {
      console.error(`[phased-recovery] STOP — ${phase.id} hash/schema gate failed (${status.status})`);
      process.exit(1);
    }
    console.log(`[phased-recovery] ✓ ${phase.id} schema + hash verified for ${phase.migrationTag}`);
  }
}

async function runPhase(conn, phase, { dryRun }) {
  console.log(`\n=== ${phase.id}: ${phase.label} ===`);

  for (const prereq of phase.prerequisites) {
    const prereqPhase = getPhaseById(prereq);
    if (prereqPhase.kind === "migration") {
      const prereqStatus = await isMigrationPhaseComplete(conn, prereqPhase);
      if (!prereqStatus.complete) {
        console.error(`[phased-recovery] STOP — prerequisite ${prereq} not complete`);
        process.exit(1);
      }
    }
  }

  if (phase.kind === "migration") {
    await verifyMigrationPhase(conn, phase, { dryRun });
    if (!dryRun) {
      await verifyPhaseGate(conn, phase);
      runSchemaVerify(phase.id);
    } else {
      console.log(`[phased-recovery] DRY-RUN would verify ${phase.id} schema, hash, and verify-schema`);
    }

    if (phase.backfillGate && !dryRun) {
      const lineItems = await countLegacyLineItems(conn);
      const legacyProjection = await countLegacyProjectionRows(conn);
      if (lineItems > 0 && legacyProjection > 0) {
        console.error(
          `\n[phased-recovery] STOP — ${lineItems} line item(s); ${legacyProjection} need category projection backfill.`
        );
        console.error("Execute ORDER-READ-BACKFILL-1 before phase-5:");
        console.error(
          "  ORDER_READ_CATEGORY_BACKFILL_CONFIRM=YES pnpm exec tsx scripts/order-read-category-backfill-execute.ts --scope full"
        );
        process.exit(2);
      }
      console.log(`[phased-recovery] ✓ Backfill gate — projection integrity OK (${lineItems} rows checked)`);
    } else if (phase.backfillGate && dryRun) {
      console.log("[phased-recovery] DRY-RUN would evaluate backfill gate after 0056");
    }
    return;
  }

  if (phase.kind === "backfill-verify") {
    if (dryRun) {
      console.log("[phased-recovery] DRY-RUN would run ORDER-READ-BACKFILL-1 verify-only");
      return;
    }
    runBackfillVerifyOnly();
    const legacy = await countLegacyProjectionRows(conn);
    if (legacy > 0) {
      console.error(`[phased-recovery] STOP — ${legacy} row(s) still lack valid categoryProjection`);
      process.exit(2);
    }
    console.log("[phased-recovery] ✓ 100% projection integrity verified");
    return;
  }

  if (phase.kind === "smoke") {
    console.log("\n[phased-recovery] Production smoke checklist (operator sign-off required):");
    for (const item of SMOKE_CHECKLIST) {
      console.log(`  ☐ ${item}`);
    }
    if (!dryRun) {
      console.log("\n[phased-recovery] Complete smoke tests manually, then record production acceptance.");
    }
  }
}

function printExecutionPlan(phases) {
  console.log("\nCertified operational execution plan:");
  console.log("  Execution order:", OPERATIONAL_MIGRATION_ORDER.join(" → "));
  console.log("  (Journal idx order differs: 0054 → 0055 → 0056 → 0057 — governance only)");
  console.log("  Package checksum:", PACKAGE_CHECKSUM);
  console.log("\nPhases to run:");
  for (const phase of phases) {
    const tag = phase.migrationTag ? ` [${phase.migrationTag}]` : "";
    console.log(`  ${phase.id}${tag} — ${phase.label}`);
  }
}

async function main() {
  const gates = assertExecutionGates();
  const dryRun = !gates.execute;
  const phaseArg = parseArg("--phase");
  const resumeFrom = resolveResumeFrom();

  console.log("=== Migration 0054–0057 phased recovery execute ===\n");
  console.log("Mode:", dryRun ? "DRY-RUN" : "EXECUTE");
  if (gates.target) {
    console.log("Target:", JSON.stringify(gates.target));
  }

  runPreflight();

  let phases;
  try {
    phases = resolvePhaseRunList({ phase: phaseArg, resumeFrom });
  } catch (err) {
    console.error(`[phased-recovery] ${err.message}`);
    process.exit(1);
  }

  printExecutionPlan(phases);

  if (dryRun) {
    console.log("\n[phased-recovery] DRY-RUN — no DDL applied.");
    console.log(
      "To execute: node scripts/recovery/migration-0054-0057-phased-execute.mjs --execute --confirm-gateway01 --confirm-backup"
    );
    return;
  }

  const conn = await createAuditConnection(gates.url);
  try {
    for (const phase of phases) {
      if (phase.kind === "migration") {
        const status = await isMigrationPhaseComplete(conn, phase);
        if (status.complete) {
          console.log(`\n=== ${phase.id}: ${phase.label} ===`);
          console.log(`[phased-recovery] SKIP — already complete (${phase.migrationTag})`);
          continue;
        }
      }
      await runPhase(conn, phase, { dryRun: false });
    }
    console.log("\n[phased-recovery] COMPLETE — all requested phases finished.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[phased-recovery] Failed:", err.message);
  process.exit(1);
});
