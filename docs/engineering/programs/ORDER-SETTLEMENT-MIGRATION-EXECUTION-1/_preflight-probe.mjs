/**
 * Read-only pre/post probe for 0073_check_order_settlements.
 * Usage: node docs/engineering/programs/ORDER-SETTLEMENT-MIGRATION-EXECUTION-1/_preflight-probe.mjs
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../..");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const { createAuditReadonlyConnection } = await import(
    pathToFileURL(join(repoRoot, "scripts/lib/tidb-audit-connection.mjs")).href
  );
  const sqlPath = join(repoRoot, "drizzle/0073_check_order_settlements.sql");
  const hash = createHash("sha256").update(readFileSync(sqlPath)).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [[ver]] = await conn.query("SELECT VERSION() AS v");
    const [[db]] = await conn.query("SELECT DATABASE() AS d");
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'check_order_settlements'`
    );
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'check_order_settlements'
       ORDER BY ORDINAL_POSITION`
    );
    const [idxs] = await conn.query(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'check_order_settlements'
       GROUP BY INDEX_NAME, NON_UNIQUE
       ORDER BY INDEX_NAME`
    );
    const [fks] = await conn.query(
      `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'check_order_settlements'
         AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    const hashApplied = mig.some((r) => r.hash === hash);

    console.log(JSON.stringify({
      version: ver.v,
      database: db.d,
      sqlHash: hash,
      hashApplied,
      latestMigrations: mig,
      tableExists: tables.length > 0,
      columns: cols,
      indexes: idxs,
      foreignKeys: fks,
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
