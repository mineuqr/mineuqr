/**
 * PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1
 * Read-only production pre/post probes. Does not apply DDL.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const MODE = process.argv[2] || "pre";

const EXPECTED_TABLES = [
  "commercial_plans",
  "commercial_plan_versions",
  "commercial_prices",
  "commercial_billing_cycles",
  "commercial_feature_bundles",
  "commercial_bundle_features",
  "commercial_limit_profiles",
  "commercial_limit_values",
  "commercial_trial_policies",
  "commercial_promotions",
  "commercial_regions",
  "commercial_publication_rules",
  "commercial_migration_policies",
  "commercial_retirement_policies",
  "commercial_snapshot_definitions",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const sqlFile = readFileSync(
    new URL(
      "../../../../drizzle/0084_commercial_catalog_foundation.sql",
      import.meta.url
    )
  );
  const hash0084 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [dbName] = await conn.query("SELECT DATABASE() AS db");
    const [ping] = await conn.query("SELECT 1 AS ok");
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0084]
    );
    const [tables] = await conn.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (${EXPECTED_TABLES.map(() => "?").join(",")})
       ORDER BY TABLE_NAME`,
      EXPECTED_TABLES
    );
    const [indexes] = await conn.query(
      `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (${EXPECTED_TABLES.map(() => "?").join(",")})
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      EXPECTED_TABLES
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
         (SELECT COUNT(*) FROM users) AS users`
    );

    const present = tables.map((t) => t.TABLE_NAME);
    const missing = EXPECTED_TABLES.filter((t) => !present.includes(t));

    const payload = {
      mode: MODE,
      database: dbName[0]?.db ?? null,
      connectionHealthy: ping[0]?.ok === 1,
      hash0084,
      lastMigrations: mig,
      hash0084Applied: hashHit,
      expectedTables: EXPECTED_TABLES,
      presentTables: present,
      missingTables: missing,
      allCommercialTablesPresent: missing.length === 0,
      indexCount: indexes.length,
      indexes: indexes.slice(0, 80),
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
