/**
 * SETTLEMENT-RECORD-PRODUCTION-CERTIFICATION-1 — production evidence probes.
 * Read-only. No deletes.
 */
import "dotenv/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const p = new URL(url);
  return mysql.createConnection({
    host: p.hostname,
    port: p.port ? Number(p.port) : 3306,
    user: decodeURIComponent(p.username),
    password: decodeURIComponent(p.password),
    database: p.pathname.replace(/^\//, ""),
    ssl: /\.tidbcloud\.com$/i.test(p.hostname)
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
  });
}

async function main() {
  const conn = await connect();
  try {
    const [[zero]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
        (SELECT COUNT(*) FROM check_settlement_transactions) AS settlement_transactions,
        (SELECT COUNT(*) FROM operational_checks WHERE outcome='paid') AS paid_checks,
        (SELECT COUNT(*) FROM operational_checks) AS all_checks,
        (SELECT COALESCE(SUM(grandTotal),0) FROM settlement_records
           WHERE outcome='paid' AND recordGeneration=1) AS revenue,
        (SELECT COALESCE(SUM(taxAmount),0) FROM settlement_records
           WHERE outcome='paid' AND recordGeneration=1) AS tax_collected,
        (SELECT COALESCE(SUM(amount),0) FROM check_settlement_transactions
           WHERE status='captured') AS payment_totals,
        (SELECT COUNT(*) FROM dining_sessions) AS dining_sessions,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM order_read_analytics_daily) AS order_sales_rollups
    `);

    const [[dupes]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM (
           SELECT restaurantId, checkId, recordKind, recordGeneration, COUNT(*) c
           FROM settlement_records
           GROUP BY restaurantId, checkId, recordKind, recordGeneration
           HAVING c > 1
         ) d) AS duplicate_sr_business_keys,
        (SELECT COUNT(*) FROM (
           SELECT settlementRecordId, COUNT(*) c
           FROM settlement_records
           GROUP BY settlementRecordId
           HAVING c > 1
         ) d) AS duplicate_sr_ids,
        (SELECT COUNT(*) FROM (
           SELECT checkId, COUNT(*) c
           FROM check_settlement_transactions
           WHERE status='captured'
           GROUP BY checkId, paymentMethod, amount, businessTimestamp
           HAVING c > 1
         ) d) AS suspicious_st_dupes
    `);

    const [indexes] = await conn.query(`
      SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settlement_records'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    const [migrations] = await conn.query(`
      SELECT id, hash, created_at
      FROM __drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [[schema]] = await conn.query(`
      SELECT COUNT(*) AS settlement_records_table
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settlement_records'
    `);

    const [[config]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM restaurants) AS restaurants,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM menu_items) AS menu_items,
        (SELECT COUNT(*) FROM restaurant_tables) AS restaurant_tables,
        (SELECT COUNT(*) FROM __drizzle_migrations) AS migrations
    `);

    const [[orphans]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM check_settlement_transactions st
           LEFT JOIN operational_checks c ON c.id = st.checkId
           WHERE c.id IS NULL) AS st_orphan_checks,
        (SELECT COUNT(*) FROM settlement_records sr
           LEFT JOIN operational_checks c ON c.id = sr.checkId
           WHERE c.id IS NULL) AS sr_orphan_checks,
        (SELECT COUNT(*) FROM check_order_settlements os
           LEFT JOIN operational_checks c ON c.id = os.checkId
           WHERE c.id IS NULL) AS os_orphan_checks
    `);

    const commercialZero =
      Number(zero.settlement_records) === 0 &&
      Number(zero.settlement_transactions) === 0 &&
      Number(zero.paid_checks) === 0 &&
      Number(zero.all_checks) === 0 &&
      Number(zero.revenue) === 0 &&
      Number(zero.tax_collected) === 0 &&
      Number(zero.payment_totals) === 0;

    console.log(
      JSON.stringify(
        {
          program: "SETTLEMENT-RECORD-PRODUCTION-CERTIFICATION-1",
          host: new URL(process.env.DATABASE_URL).hostname,
          commercialZero,
          zero,
          dupes,
          orphans,
          schemaPresent: Number(schema.settlement_records_table) === 1,
          indexes,
          recentMigrations: migrations,
          config,
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
