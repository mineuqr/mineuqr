/**
 * PRODUCTION-MIGRATION-0058-EXECUTION-1 — scoped single-migration executor.
 *
 * Executes ONLY 0058_offer_image_metadata. No bulk migrate. No future migrations.
 * Mirrors the certified phased-recovery engine (single-statement DDL + hash record).
 *
 * DEFAULT: dry-run. Execution requires explicit operator gates.
 *
 * Usage:
 *   node scripts/recovery/migration-0058-execute.mjs
 *   node scripts/recovery/migration-0058-execute.mjs --execute --confirm-gateway01 --confirm-backup
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { createAuditConnection, auditConnectionTarget } from "../lib/tidb-audit-connection.mjs";

const require = createRequire(import.meta.url);
const {
  hashMigrationSql,
  loadJournal,
  DRIZZLE_DIR,
} = require("../lib/migration-governance-lib.cjs");

const MIGRATION_TAG = "0058_offer_image_metadata";
const PRODUCTION_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";
const PRODUCTION_DB = "mineuqr";
const VERIFY_COLUMN = { table: "offers", column: "image" };

function loadStatements() {
  const filePath = path.join(DRIZZLE_DIR, `${MIGRATION_TAG}.sql`);
  const sql = fs.readFileSync(filePath, "utf8");
  return sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
}

function journalWhen(tag) {
  const entry = loadJournal().entries.find((e) => e.tag === tag);
  if (!entry) throw new Error(`Migration ${tag} not in journal`);
  return entry.when;
}

async function hashRecorded(conn) {
  const hash = hashMigrationSql(MIGRATION_TAG);
  const [rows] = await conn.query(
    "SELECT 1 AS ok FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
    [hash]
  );
  return rows.length > 0;
}

async function columnExists(conn) {
  const [rows] = await conn.query(
    `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [VERIFY_COLUMN.table, VERIFY_COLUMN.column]
  );
  return rows[0]?.DATA_TYPE ?? null;
}

function assertGates(execute) {
  if (!execute) return { execute: false };
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[0058-execute] DATABASE_URL is required");
    process.exit(1);
  }
  const target = auditConnectionTarget(url);
  if (!process.argv.includes("--confirm-gateway01")) {
    console.error("[0058-execute] BLOCKED — pass --confirm-gateway01 after verifying target.");
    console.error("Target:", JSON.stringify(target));
    process.exit(1);
  }
  if (target.host !== PRODUCTION_HOST || target.database !== PRODUCTION_DB) {
    console.error("[0058-execute] BLOCKED — target is not gateway01/mineuqr");
    console.error("Target:", JSON.stringify(target));
    process.exit(1);
  }
  const backupOk =
    process.argv.includes("--confirm-backup") || process.env.TIDB_BACKUP_CONFIRMED === "YES";
  if (!backupOk) {
    console.error("[0058-execute] BLOCKED — backup not confirmed. Set TIDB_BACKUP_CONFIRMED=YES or --confirm-backup.");
    process.exit(1);
  }
  return { execute: true, url, target };
}

async function main() {
  const execute = process.argv.includes("--execute");
  const gates = assertGates(execute);
  const dryRun = !gates.execute;

  console.log("=== Migration 0058_offer_image_metadata execute ===\n");
  console.log("Mode:", dryRun ? "DRY-RUN" : "EXECUTE");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[0058-execute] DATABASE_URL is required");
    process.exit(1);
  }
  const target = auditConnectionTarget(url);
  console.log("Target:", JSON.stringify(target));
  console.log("Migration hash:", hashMigrationSql(MIGRATION_TAG));

  const statements = loadStatements();
  console.log(`Statements (${statements.length}):`);
  for (const s of statements) console.log(`  ${s}`);

  const conn = await createAuditConnection(url);
  try {
    const alreadyHashed = await hashRecorded(conn);
    const columnType = await columnExists(conn);
    console.log("\nCurrent state:");
    console.log("  offers.image column:", columnType ?? "missing");
    console.log("  hash recorded:", alreadyHashed ? "yes" : "no");

    if (columnType && alreadyHashed) {
      console.log("\n[0058-execute] SKIP — already complete (idempotent).");
      return;
    }

    if (dryRun) {
      console.log("\n[0058-execute] DRY-RUN — no DDL applied.");
      console.log("To execute: node scripts/recovery/migration-0058-execute.mjs --execute --confirm-gateway01 --confirm-backup");
      return;
    }

    if (columnType && !alreadyHashed) {
      console.log("\n[0058-execute] Column present; registering hash only (no DDL).");
      await conn.query(
        "INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)",
        [hashMigrationSql(MIGRATION_TAG), journalWhen(MIGRATION_TAG)]
      );
      console.log("[0058-execute] Hash recorded.");
      return;
    }

    await conn.beginTransaction();
    try {
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query(
        "INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)",
        [hashMigrationSql(MIGRATION_TAG), journalWhen(MIGRATION_TAG)]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const verifyType = await columnExists(conn);
    const verifyHash = await hashRecorded(conn);
    if (!verifyType || !verifyHash) {
      console.error("[0058-execute] STOP — post-execution verification failed.");
      console.error(`  column: ${verifyType ?? "missing"} | hash: ${verifyHash}`);
      process.exit(1);
    }
    console.log(`\n[0058-execute] Applied ${MIGRATION_TAG} — offers.image (${verifyType}) + hash recorded.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[0058-execute] Failed:", err.message);
  process.exit(1);
});
