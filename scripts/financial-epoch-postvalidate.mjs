/**
 * FINANCIAL-EPOCH-RESET-1 — post-reset financial / config probes.
 *
 *   node scripts/financial-epoch-postvalidate.mjs
 *
 * For write-path smoke use:
 *   FINANCIAL_EPOCH_SMOKE_CONFIRM=YES pnpm exec tsx scripts/financial-epoch-smoke.mts
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
    const [[financial]] = await conn.query(`
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

    const [[config]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM restaurants) AS restaurants,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM menu_items) AS menu_items,
        (SELECT COUNT(*) FROM restaurant_tables) AS restaurant_tables,
        (SELECT COUNT(*) FROM categories) AS categories,
        (SELECT COUNT(*) FROM operational_devices) AS operational_devices,
        (SELECT COUNT(*) FROM __drizzle_migrations) AS migrations
    `);

    console.log(
      JSON.stringify(
        {
          program: "FINANCIAL-EPOCH-RESET-1",
          financial,
          config,
          note:
            "After certified smoke, settlement_records/revenue may be > 0 (Epoch Start).",
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
  console.error("[epoch-postvalidate] failed", e);
  process.exit(1);
});
