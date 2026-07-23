/**
 * PRODUCTION OPERATIONAL DATA RESET — config-preserving.
 *
 * Clears operational / projection / queue / analytics history.
 * Preserves restaurants, users, menus, devices, printers, migrations, etc.
 *
 * NOT a schema migration. Does NOT drop tables.
 *
 * Dry-run (default):
 *   node scripts/production-operational-data-reset.mjs --dry-run
 *
 * Execute (requires confirm):
 *   PRODUCTION_OPERATIONAL_RESET_CONFIRM=YES \
 *     node scripts/production-operational-data-reset.mjs --execute
 */
import "dotenv/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Children → parents. DELETE only — never DROP.
 * FINANCIAL-EPOCH-RESET-1: includes settlement_records, split payments, MCA.
 * Prefer `scripts/financial-epoch-reset.mjs` for epoch resets (backup + probes).
 */
const CLEAR_TABLES = [
  "settlement_records",
  "multi_check_allocation_history",
  "multi_check_allocation_reversals",
  "multi_check_allocation_adjustments",
  "multi_check_allocation_portions",
  "multi_check_allocation_sources",
  "multi_check_allocations",
  "check_split_payment_tender_allocations",
  "check_split_payment_allocations",
  "check_split_payment_tenders",
  "check_split_payment_attempts",
  "check_split_payments",
  "check_settlement_transactions",
  "check_order_settlements",
  "check_order_membership",
  "customer_push_subscriptions",
  "order_items",
  "print_job_attempts",
  "print_job_history",
  "print_jobs",
  "table_events",
  "order_read_order_line_items",
  "order_read_order_timeline",
  "order_read_public_order_status",
  "order_read_operational_kpi_daily",
  "order_read_analytics_daily",
  "order_read_orders",
  "order_read_backfill_runs",
  "order_domain_consumer_processed",
  "order_domain_outbox",
  "orders",
  "operational_checks",
  "dining_sessions",
  "order_business_day_sequences",
  // Ephemeral / operational noise (users & enrollments preserved)
  "auth_tokens",
  "connector_pairing_tokens",
  "renewal_notifications",
];

const PRESERVE_TABLES = [
  "users",
  "restaurants",
  "categories",
  "menu_items",
  "offers",
  "restaurant_tables",
  "restaurant_holidays",
  "subscription_plans",
  "user_subscriptions",
  "invoices",
  // SaaS commercial billing (not restaurant Order/Check operational history)
  "payments",
  "transactions",
  "email_logs",
  "subscription_history",
  "countries_currencies",
  "print_connector_selections",
  "restaurant_printers",
  "connector_enrollments",
  "connector_published_releases",
  "operational_devices",
  "operational_device_tokens",
  "audit_events",
  "__drizzle_migrations",
];

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function countTable(conn, table) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run") || !argv.includes("--execute");
  const execute = argv.includes("--execute");

  if (execute && process.env.PRODUCTION_OPERATIONAL_RESET_CONFIRM !== "YES") {
    console.error(
      "[ops-reset] Refusing execute without PRODUCTION_OPERATIONAL_RESET_CONFIRM=YES"
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[ops-reset] DATABASE_URL is required");
    process.exit(1);
  }

  const { createAuditReadonlyConnection } = await import(
    "./lib/tidb-audit-connection.mjs"
  );

  // Writable connection for execute (same TLS helper as audit, but we need DELETE).
  // Reuse drizzle mysql2 pool pattern from server via dynamic import of mysql2.
  const mysql = require("mysql2/promise");
  const parsed = new URL(url);
  const isTidb = /\.tidbcloud\.com$/i.test(parsed.hostname);
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    multipleStatements: false,
    ssl: isTidb
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
  });

  const before = {};
  const missing = [];
  const presentClear = [];

  try {
    console.log(
      JSON.stringify(
        {
          mode: execute ? "EXECUTE" : "DRY_RUN",
          host: parsed.hostname,
          database: parsed.pathname.replace(/^\//, ""),
        },
        null,
        2
      )
    );

    for (const table of CLEAR_TABLES) {
      if (!(await tableExists(conn, table))) {
        missing.push(table);
        continue;
      }
      presentClear.push(table);
      before[table] = await countTable(conn, table);
    }

    const preserveBefore = {};
    for (const table of PRESERVE_TABLES) {
      if (!(await tableExists(conn, table))) continue;
      preserveBefore[table] = await countTable(conn, table);
    }

    console.log(
      JSON.stringify(
        { clearCountsBefore: before, preserveCountsBefore: preserveBefore, missingClearTables: missing },
        null,
        2
      )
    );

    if (!execute) {
      console.log("[ops-reset] dry-run complete — no deletes performed");
      return;
    }

    // Disable FK checks if any exist on this DB (MineuQR typically has none).
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    try {
      for (const table of presentClear) {
        const [result] = await conn.query(`DELETE FROM \`${table}\``);
        console.log(
          `[ops-reset] DELETE ${table} affected=${result.affectedRows ?? "?"}`
        );
      }
    } finally {
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    const after = {};
    for (const table of presentClear) {
      after[table] = await countTable(conn, table);
    }

    const preserveAfter = {};
    for (const table of PRESERVE_TABLES) {
      if (!(await tableExists(conn, table))) continue;
      preserveAfter[table] = await countTable(conn, table);
    }

    const preserveDrift = {};
    for (const table of Object.keys(preserveBefore)) {
      if (preserveBefore[table] !== preserveAfter[table]) {
        preserveDrift[table] = {
          before: preserveBefore[table],
          after: preserveAfter[table],
        };
      }
    }

    const nonZeroClear = Object.entries(after).filter(([, c]) => c !== 0);

    console.log(
      JSON.stringify(
        {
          clearCountsAfter: after,
          preserveCountsAfter: preserveAfter,
          preserveDrift,
          nonZeroClearRemaining: nonZeroClear,
          verdict:
            nonZeroClear.length === 0 && Object.keys(preserveDrift).length === 0
              ? "PASS"
              : "FAIL",
        },
        null,
        2
      )
    );

    if (nonZeroClear.length > 0 || Object.keys(preserveDrift).length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[ops-reset] failed", e);
  process.exit(1);
});
