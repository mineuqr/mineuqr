/**
 * PRODUCTION-MIGRATION-EXECUTION-0085-COMMERCIAL-SUBSCRIPTION-BINDINGS-1
 * Read-only production pre/post probes. Does not apply DDL.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const MODE = process.argv[2] || "pre";

const EXPECTED_TABLE = "commercial_subscription_bindings";
const EXPECTED_INDEXES = [
  "PRIMARY",
  "commercial_subscription_bindings_sub_uq",
  "commercial_subscription_bindings_version_idx",
  "commercial_subscription_bindings_snapshot_idx",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const sqlFile = readFileSync(
    new URL(
      "../../../../drizzle/0085_commercial_catalog_adoption_bindings.sql",
      import.meta.url
    )
  );
  const hash0085 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [dbName] = await conn.query("SELECT DATABASE() AS db");
    const [ping] = await conn.query("SELECT 1 AS ok");
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0085]
    );
    const [tables] = await conn.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [EXPECTED_TABLE]
    );
    const [indexes] = await conn.query(
      `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [EXPECTED_TABLE]
    );
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [EXPECTED_TABLE]
    );
    const [platformCounts] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM orders) AS orders,
         (SELECT COUNT(*) FROM order_read_orders) AS order_read_orders,
         (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
         (SELECT COUNT(*) FROM operational_checks) AS checks,
         (SELECT COUNT(*) FROM user_subscriptions) AS user_subscriptions,
         (SELECT COUNT(*) FROM subscription_plans) AS subscription_plans,
         (SELECT COUNT(*) FROM restaurants) AS restaurants,
         (SELECT COUNT(*) FROM users) AS users,
         (SELECT COUNT(*) FROM commercial_plans) AS commercial_plans,
         (SELECT COUNT(*) FROM commercial_snapshot_definitions) AS commercial_snapshot_definitions`
    );

    const present = tables.map((t) => t.TABLE_NAME);
    const indexNames = [...new Set(indexes.map((i) => i.INDEX_NAME))];
    const missingIndexes = EXPECTED_INDEXES.filter((n) => !indexNames.includes(n));

    const payload = {
      mode: MODE,
      database: dbName[0]?.db ?? null,
      connectionHealthy: ping[0]?.ok === 1,
      hash0085,
      lastMigrations: mig,
      hash0085Applied: hashHit,
      expectedTable: EXPECTED_TABLE,
      tableExists: present.includes(EXPECTED_TABLE),
      columns,
      indexNames,
      missingIndexes,
      indexes,
      expectedIndexesPresent: missingIndexes.length === 0 && present.includes(EXPECTED_TABLE),
      platformCounts: platformCounts[0],
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("PROBE_FAIL", e.message);
  process.exit(1);
});
