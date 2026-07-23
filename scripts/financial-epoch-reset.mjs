/**
 * FINANCIAL-EPOCH-RESET-1 — Production Financial Epoch Zero.
 *
 * Controlled deletion of experimental restaurant financial / operational history.
 * Preserves restaurants, users, menus, tables, devices, business settings, SaaS billing.
 *
 * NOT a schema migration. Does NOT drop tables. Does NOT modify __drizzle_migrations.
 *
 * Dry-run (default):
 *   node scripts/financial-epoch-reset.mjs --dry-run
 *
 * Backup only (writes JSON dumps, no deletes):
 *   node scripts/financial-epoch-reset.mjs --backup
 *
 * Execute (requires confirm + prior backup unless --skip-backup):
 *   FINANCIAL_EPOCH_RESET_CONFIRM=YES \
 *     node scripts/financial-epoch-reset.mjs --execute
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

/**
 * Children → parents. DELETE only — never DROP.
 * Includes Settlement Record (0076), split payments, MCA (post prior ops reset).
 */
const CLEAR_TABLES = [
  // A — Settlement Record Platform publication
  "settlement_records",
  // A — Multi-Check Allocation graph
  "multi_check_allocation_history",
  "multi_check_allocation_reversals",
  "multi_check_allocation_adjustments",
  "multi_check_allocation_portions",
  "multi_check_allocation_sources",
  "multi_check_allocations",
  // A — Split payment graph
  "check_split_payment_tender_allocations",
  "check_split_payment_allocations",
  "check_split_payment_tenders",
  "check_split_payment_attempts",
  "check_split_payments",
  // A — Check tenders / order settlement / membership
  "check_settlement_transactions",
  "check_order_settlements",
  "check_order_membership",
  // B — Monetary Aggregate Root rows
  "operational_checks",
  // C — Operational continuity (sessions/orders tied to cleared finance)
  "customer_push_subscriptions",
  "print_job_attempts",
  "print_job_history",
  "print_jobs",
  "table_events",
  "order_items",
  "order_domain_consumer_processed",
  "order_domain_outbox",
  "orders",
  "dining_sessions",
  "order_business_day_sequences",
  // D — Reporting projections / financial KPI caches
  "order_read_order_line_items",
  "order_read_order_timeline",
  "order_read_public_order_status",
  "order_read_operational_kpi_daily",
  "order_read_analytics_daily",
  "order_read_orders",
  "order_read_backfill_runs",
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

/** Financial zero probes after reset. */
const FINANCIAL_ZERO_PROBES = [
  "settlement_records",
  "check_settlement_transactions",
  "check_order_settlements",
  "operational_checks",
  "check_order_membership",
  "multi_check_allocations",
  "check_split_payments",
  "order_read_analytics_daily",
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

async function dumpTable(conn, table, outDir) {
  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  const path = join(outDir, `${table}.json`);
  writeFileSync(path, JSON.stringify(rows, null, 2), "utf8");
  return { table, rows: rows.length, path };
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run") || (!argv.includes("--execute") && !argv.includes("--backup")),
    execute: argv.includes("--execute"),
    backup: argv.includes("--backup") || argv.includes("--execute"),
    skipBackup: argv.includes("--skip-backup"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.execute && process.env.FINANCIAL_EPOCH_RESET_CONFIRM !== "YES") {
    console.error(
      "[epoch-reset] Refusing execute without FINANCIAL_EPOCH_RESET_CONFIRM=YES"
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[epoch-reset] DATABASE_URL is required");
    process.exit(1);
  }

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

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = join(
    process.cwd(),
    "artifacts",
    "financial-epoch-reset-1",
    stamp
  );

  try {
    console.log(
      JSON.stringify(
        {
          program: "FINANCIAL-EPOCH-RESET-1",
          mode: args.execute
            ? "EXECUTE"
            : args.backup && !args.dryRun
              ? "BACKUP"
              : "DRY_RUN",
          host: parsed.hostname,
          database: parsed.pathname.replace(/^\//, ""),
          clearTableCount: CLEAR_TABLES.length,
        },
        null,
        2
      )
    );

    const before = {};
    const missing = [];
    const presentClear = [];

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
        {
          clearCountsBefore: before,
          preserveCountsBefore: preserveBefore,
          missingClearTables: missing,
          totalClearRows: Object.values(before).reduce((a, b) => a + b, 0),
        },
        null,
        2
      )
    );

    const wantBackup =
      (args.backup || args.execute) && !args.skipBackup && presentClear.length > 0;

    if (wantBackup) {
      mkdirSync(backupRoot, { recursive: true });
      const manifest = {
        program: "FINANCIAL-EPOCH-RESET-1",
        createdAt: new Date().toISOString(),
        host: parsed.hostname,
        database: parsed.pathname.replace(/^\//, ""),
        tables: [],
        clearCountsBefore: before,
        preserveCountsBefore: preserveBefore,
      };
      for (const table of presentClear) {
        if (before[table] === 0) {
          manifest.tables.push({ table, rows: 0, path: null });
          continue;
        }
        const dumped = await dumpTable(conn, table, backupRoot);
        manifest.tables.push(dumped);
        console.log(
          `[epoch-reset] backup ${table} rows=${dumped.rows} → ${dumped.path}`
        );
      }
      const manifestPath = join(backupRoot, "MANIFEST.json");
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
      console.log(`[epoch-reset] backup manifest → ${manifestPath}`);
    }

    if (!args.execute) {
      console.log(
        args.backup
          ? "[epoch-reset] backup complete — no deletes performed"
          : "[epoch-reset] dry-run complete — no deletes performed"
      );
      return;
    }

    if (!args.skipBackup && !existsSync(backupRoot)) {
      console.error(
        "[epoch-reset] Refusing execute: backup directory missing"
      );
      process.exit(1);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    try {
      for (const table of presentClear) {
        const [result] = await conn.query(`DELETE FROM \`${table}\``);
        console.log(
          `[epoch-reset] DELETE ${table} affected=${result.affectedRows ?? "?"}`
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

    const financialZeros = {};
    for (const table of FINANCIAL_ZERO_PROBES) {
      if (!(await tableExists(conn, table))) {
        financialZeros[table] = "MISSING";
        continue;
      }
      financialZeros[table] = await countTable(conn, table);
    }

    const financialOk = Object.values(financialZeros).every((c) => c === 0);

    const verdict =
      nonZeroClear.length === 0 &&
      Object.keys(preserveDrift).length === 0 &&
      financialOk
        ? "PASS"
        : "FAIL";

    console.log(
      JSON.stringify(
        {
          clearCountsAfter: after,
          preserveCountsAfter: preserveAfter,
          preserveDrift,
          nonZeroClearRemaining: nonZeroClear,
          financialZeroProbes: financialZeros,
          backupDir: wantBackup ? backupRoot : null,
          verdict,
        },
        null,
        2
      )
    );

    if (verdict !== "PASS") {
      process.exitCode = 2;
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[epoch-reset] failed", e);
  process.exit(1);
});
