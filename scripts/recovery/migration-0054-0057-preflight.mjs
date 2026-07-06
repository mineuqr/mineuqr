/**
 * MIGRATION-GOVERNANCE-RESTORATION-1 — production recovery preflight (read-only).
 * Validates dependency order and idempotent readiness for migrations 0054–0057.
 *
 * Usage: node scripts/recovery/migration-0054-0057-preflight.mjs
 */
import "dotenv/config";
import crypto from "crypto";
import { createAuditReadonlyConnection, auditConnectionTarget } from "../lib/tidb-audit-connection.mjs";
import {
  CANONICAL_TAIL_TAGS,
  hashMigrationSql,
  loadJournal,
} from "../lib/migration-governance-lib.cjs";

const MIGRATION_CHECKS = [
  {
    tag: "0054_operational_devices",
    table: "operational_devices",
    dependsOn: [],
  },
  {
    tag: "0055_operational_device_screen_config",
    column: { table: "operational_devices", name: "screenConfig" },
    dependsOn: ["0054_operational_devices"],
  },
  {
    tag: "0056_order_read_category_projection",
    column: { table: "order_read_order_line_items", name: "categoryProjection" },
    dependsOn: ["0046_order_read_projections"],
  },
  {
    tag: "0057_operational_device_screen_config_revision",
    column: { table: "operational_devices", name: "screenConfigRevision" },
    dependsOn: ["0054_operational_devices"],
  },
];

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function hashInDb(conn, tag) {
  const hash = hashMigrationSql(tag);
  const [rows] = await conn.query(
    "SELECT 1 AS ok FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
    [hash]
  );
  return rows.length > 0;
}

function packageChecksum() {
  const manifest = CANONICAL_TAIL_TAGS.map(
    (tag) => `${tag}|${hashMigrationSql(tag)}`
  ).join("\n");
  return crypto.createHash("sha256").update(manifest).digest("hex");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[recovery-preflight] DATABASE_URL is required");
    process.exit(1);
  }

  const target = auditConnectionTarget(url);
  console.log("=== Migration 0054–0057 recovery preflight ===\n");
  console.log("Target:", JSON.stringify(target));
  console.log("Package checksum:", packageChecksum());

  const journal = loadJournal();
  const journalTags = new Set(journal.entries.map((e) => e.tag));
  for (const tag of CANONICAL_TAIL_TAGS) {
    if (!journalTags.has(tag)) {
      console.error(`✗ FAIL — ${tag} not in journal (run governance restoration first)`);
      process.exit(1);
    }
  }
  console.log("\n✓ Canonical tail present in journal.");

  const conn = await createAuditReadonlyConnection(url);
  const pending = [];
  const alreadyApplied = [];

  try {
    for (const check of MIGRATION_CHECKS) {
      const hashRecorded = await hashInDb(conn, check.tag);
      let schemaPresent = false;

      if (check.table) {
        schemaPresent = await tableExists(conn, check.table);
      } else if (check.column) {
        schemaPresent = await columnExists(conn, check.column.table, check.column.name);
      }

      const status = {
        tag: check.tag,
        hashRecorded,
        schemaPresent,
        action: schemaPresent ? "skip_ddl" : hashRecorded ? "investigate_drift" : "pending_execute",
      };

      if (schemaPresent && !hashRecorded) {
        pending.push({ ...status, note: "schema present but hash missing — register hash after verify" });
      } else if (!schemaPresent && !hashRecorded) {
        pending.push({ ...status, note: "execute via drizzle-kit migrate or recovery execute script" });
      } else if (schemaPresent && hashRecorded) {
        alreadyApplied.push(status);
      } else {
        pending.push({ ...status, note: "hash recorded but schema missing — critical drift" });
      }

      console.log(`\n${check.tag}:`);
      console.log(`  schema: ${schemaPresent ? "present" : "missing"}`);
      console.log(`  hash:   ${hashRecorded ? "recorded" : "not recorded"}`);
      console.log(`  action: ${status.action}`);
    }

    if (pending.some((p) => p.tag === "0056_order_read_category_projection" && p.action === "pending_execute")) {
      const [countRows] = await conn.query(
        "SELECT COUNT(*) AS n FROM order_read_order_line_items"
      );
      const n = countRows[0]?.n ?? 0;
      if (n > 0) {
        console.log(
          `\n⚠ WARNING: order_read_order_line_items has ${n} rows — 0056 adds NOT NULL categoryProjection.`
        );
        console.log("  Run ORDER-READ-BACKFILL-1 after 0056 or plan column default strategy before migrate.");
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Already complete: ${alreadyApplied.length}`);
    console.log(`Needs attention: ${pending.length}`);

    if (pending.some((p) => p.action === "investigate_drift")) {
      console.error("\n[recovery-preflight] BLOCKED — hash/schema drift detected.");
      process.exit(1);
    }

    console.log("\n[recovery-preflight] GO — review pending migrations before execution.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[recovery-preflight] Failed:", err.message);
  process.exit(1);
});
