/**
 * Read-only pre/post probe for 0075_multi_check_allocation.
 * Usage: node docs/engineering/programs/MULTI-CHECK-ALLOCATION-MIGRATION-EXECUTION-1/_preflight-probe.mjs
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../..");

const TABLES = [
  "multi_check_allocations",
  "multi_check_allocation_sources",
  "multi_check_allocation_portions",
  "multi_check_allocation_adjustments",
  "multi_check_allocation_reversals",
  "multi_check_allocation_history",
];

const REQUIRED_INDEXES = [
  ["multi_check_allocations", "mca_allocation_id_unique"],
  ["multi_check_allocations", "mca_restaurant_alloc_ref_unique"],
  ["multi_check_allocation_portions", "mca_portions_portion_id_unique"],
  ["multi_check_allocation_adjustments", "mca_adjustments_adjustment_id_unique"],
  ["multi_check_allocation_reversals", "mca_reversals_reversal_id_unique"],
];

const REQUIRED_COLUMNS = [
  ["multi_check_allocations", "allocationId"],
  ["multi_check_allocations", "allocationReference"],
  ["multi_check_allocations", "financialReference"],
  ["multi_check_allocations", "sourceCheckId"],
  ["multi_check_allocations", "sourcePaymentId"],
  ["multi_check_allocations", "version"],
  ["multi_check_allocations", "schemaVersion"],
  ["multi_check_allocation_portions", "portionId"],
  ["multi_check_allocation_portions", "allocationSequence"],
  ["multi_check_allocation_portions", "targetCheckId"],
  ["multi_check_allocation_history", "previousRevision"],
  ["multi_check_allocation_history", "newRevision"],
  ["multi_check_allocation_history", "mutationType"],
];

const BASELINE_TABLES = [
  "check_order_settlements",
  "operational_checks",
  "check_order_membership",
  "check_settlement_transactions",
  "check_split_payments",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const { createAuditReadonlyConnection } = await import(
    pathToFileURL(join(repoRoot, "scripts/lib/tidb-audit-connection.mjs")).href
  );
  const sqlPath = join(repoRoot, "drizzle/0075_multi_check_allocation.sql");
  const hash = createHash("sha256").update(readFileSync(sqlPath)).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [[ver]] = await conn.query("SELECT VERSION() AS v");
    const [[db]] = await conn.query("SELECT DATABASE() AS d");
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 8"
    );

    const tables = {};
    for (const name of TABLES) {
      const [exists] = await conn.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [name]
      );
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [name]
      );
      const [idxs] = await conn.query(
        `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         GROUP BY INDEX_NAME, NON_UNIQUE
         ORDER BY INDEX_NAME`,
        [name]
      );
      const [fks] = await conn.query(
        `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [name]
      );
      const [[cnt]] = exists.length
        ? await conn.query(`SELECT COUNT(*) AS c FROM \`${name}\``)
        : [[{ c: null }]];
      tables[name] = {
        exists: exists.length > 0,
        rowCount: cnt?.c ?? null,
        columns: cols,
        indexes: idxs,
        foreignKeys: fks,
      };
    }

    const baseline = {};
    for (const name of BASELINE_TABLES) {
      const [exists] = await conn.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [name]
      );
      const [[cnt]] = exists.length
        ? await conn.query(`SELECT COUNT(*) AS c FROM \`${name}\``)
        : [[{ c: null }]];
      baseline[name] = { exists: exists.length > 0, rowCount: cnt?.c ?? null };
    }

    const columnChecks = [];
    for (const [table, column] of REQUIRED_COLUMNS) {
      const [rows] = await conn.query(
        `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [table, column]
      );
      columnChecks.push({ table, column, present: rows.length > 0 });
    }

    const indexChecks = [];
    for (const [table, indexName] of REQUIRED_INDEXES) {
      const [rows] = await conn.query(
        `SELECT 1 AS ok FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [table, indexName]
      );
      indexChecks.push({ table, indexName, present: rows.length > 0 });
    }

    const hashApplied = mig.some((r) => r.hash === hash);
    const splitPaymentPresent = baseline.check_split_payments?.exists === true;

    console.log(
      JSON.stringify(
        {
          version: ver.v,
          database: db.d,
          sqlHash: hash,
          hashApplied,
          previousMigrationPrerequisite: {
            check_split_payments_exists: splitPaymentPresent,
          },
          latestMigrations: mig,
          multiCheckAllocationTables: tables,
          requiredColumns: columnChecks,
          requiredIndexes: indexChecks,
          baselinePlatformTables: baseline,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
