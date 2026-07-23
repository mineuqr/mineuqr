/**
 * ZERO-EPOCH-SMOKE-CLEANUP-1
 *
 * Removes ONLY the FINANCIAL-EPOCH-RESET-1 smoke artifacts and restores
 * production to Financial Epoch Zero. Does not touch config / migrations.
 *
 * Dry-run:
 *   node scripts/zero-epoch-smoke-cleanup.mjs --dry-run
 *
 * Execute:
 *   ZERO_EPOCH_SMOKE_CLEANUP_CONFIRM=YES \
 *     node scripts/zero-epoch-smoke-cleanup.mjs --execute
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

/** Known smoke anchors from FINANCIAL-EPOCH-RESET-1 smoke evidence. */
const SMOKE = {
  restaurantId: 720007,
  sessionId: 2280001,
  checkId: 330001,
  settlementRecordId: "sr:720007:330001:settlement:1",
  orderIds: [5670001, 5670002, 5670003],
};

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

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function countAll(conn, table) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  return Number(rows[0].c);
}

async function investigate(conn) {
  const [sr] = await conn.query(
    `SELECT * FROM settlement_records WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [checks] = await conn.query(
    `SELECT * FROM operational_checks WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [st] = await conn.query(
    `SELECT * FROM check_settlement_transactions WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [os] = await conn.query(
    `SELECT * FROM check_order_settlements WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [mem] = await conn.query(
    `SELECT * FROM check_order_membership WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [sessions] = await conn.query(
    `SELECT * FROM dining_sessions WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [orders] = await conn.query(
    `SELECT * FROM orders WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [events] = await conn.query(
    `SELECT * FROM table_events WHERE restaurantId = ?`,
    [SMOKE.restaurantId]
  );
  const [seq] = await conn.query(
    `SELECT * FROM order_business_day_sequences WHERE restaurant_id = ?`,
    [SMOKE.restaurantId]
  );

  const orderIds = orders.map((o) => o.id);
  const orderIdList = orderIds.length ? orderIds : SMOKE.orderIds;

  let items = [];
  if (orderIdList.length) {
    const [itemRows] = await conn.query(
      `SELECT * FROM order_items WHERE orderId IN (?)`,
      [orderIdList]
    );
    items = itemRows;
  }

  let readOrders = [];
  let readLines = [];
  let readTimeline = [];
  let readStatus = [];
  let analytics = [];
  let kpi = [];
  let backfill = [];
  let outbox = [];
  let consumer = [];
  let printJobs = [];
  let printAttempts = [];
  let printHistory = [];

  if (await tableExists(conn, "order_read_orders")) {
    [readOrders] = await conn.query(
      `SELECT * FROM order_read_orders WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_read_order_line_items")) {
    [readLines] = await conn.query(
      `SELECT * FROM order_read_order_line_items WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_read_order_timeline")) {
    [readTimeline] = await conn.query(
      `SELECT * FROM order_read_order_timeline WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_read_public_order_status")) {
    [readStatus] = await conn.query(
      `SELECT * FROM order_read_public_order_status WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_read_analytics_daily")) {
    [analytics] = await conn.query(
      `SELECT * FROM order_read_analytics_daily WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_read_operational_kpi_daily")) {
    [kpi] = await conn.query(
      `SELECT * FROM order_read_operational_kpi_daily WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_read_backfill_runs")) {
    [backfill] = await conn.query(
      `SELECT * FROM order_read_backfill_runs WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_domain_outbox")) {
    [outbox] = await conn.query(
      `SELECT * FROM order_domain_outbox WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (await tableExists(conn, "order_domain_consumer_processed")) {
    // No restaurantId — count only; delete via outbox eventIds when executing
    const [[c]] = await conn.query(
      `SELECT COUNT(*) AS c FROM order_domain_consumer_processed`
    );
    consumer = [{ _countOnly: Number(c.c) }];
  }
  if (await tableExists(conn, "print_jobs")) {
    [printJobs] = await conn.query(
      `SELECT * FROM print_jobs WHERE restaurantId = ?`,
      [SMOKE.restaurantId]
    );
  }
  if (printJobs.length && (await tableExists(conn, "print_job_attempts"))) {
    const jobIds = printJobs.map((j) => j.id);
    [printAttempts] = await conn.query(
      `SELECT * FROM print_job_attempts WHERE printJobId IN (?)`,
      [jobIds]
    );
  }
  if (printJobs.length && (await tableExists(conn, "print_job_history"))) {
    const jobIds = printJobs.map((j) => j.id);
    [printHistory] = await conn.query(
      `SELECT * FROM print_job_history WHERE printJobId IN (?)`,
      [jobIds]
    );
  }

  // Global financial probes (all restaurants — epoch must be zero globally)
  const [[global]] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
      (SELECT COUNT(*) FROM check_settlement_transactions) AS settlement_transactions,
      (SELECT COUNT(*) FROM operational_checks WHERE outcome='paid') AS paid_checks,
      (SELECT COUNT(*) FROM operational_checks) AS all_checks,
      (SELECT COALESCE(SUM(grandTotal),0) FROM settlement_records
         WHERE outcome='paid' AND recordGeneration=1) AS revenue,
      (SELECT COALESCE(SUM(taxAmount),0) FROM settlement_records
         WHERE outcome='paid' AND recordGeneration=1) AS tax_collected,
      (SELECT COUNT(*) FROM dining_sessions) AS dining_sessions,
      (SELECT COUNT(*) FROM orders) AS orders_global,
      (SELECT COUNT(*) FROM order_read_analytics_daily) AS analytics_global
  `);

  const [[config]] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM restaurants) AS restaurants,
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM menu_items) AS menu_items,
      (SELECT COUNT(*) FROM restaurant_tables) AS restaurant_tables,
      (SELECT COUNT(*) FROM __drizzle_migrations) AS migrations
  `);

  return {
    smokeAnchors: SMOKE,
    restaurantScoped: {
      settlement_records: sr,
      operational_checks: checks,
      check_settlement_transactions: st,
      check_order_settlements: os,
      check_order_membership: mem,
      dining_sessions: sessions,
      orders,
      order_items: items,
      table_events: events,
      order_business_day_sequences: seq,
      order_read_orders: readOrders,
      order_read_order_line_items: readLines,
      order_read_order_timeline: readTimeline,
      order_read_public_order_status: readStatus,
      order_read_analytics_daily: analytics,
      order_read_operational_kpi_daily: kpi,
      order_read_backfill_runs: backfill,
      order_domain_outbox: outbox,
      order_domain_consumer_processed_sample: consumer.slice(0, 50),
      order_domain_consumer_processed_count: consumer.length,
      print_jobs: printJobs,
      print_job_attempts: printAttempts,
      print_job_history: printHistory,
    },
    counts: {
      settlement_records: sr.length,
      operational_checks: checks.length,
      check_settlement_transactions: st.length,
      check_order_settlements: os.length,
      check_order_membership: mem.length,
      dining_sessions: sessions.length,
      orders: orders.length,
      order_items: items.length,
      table_events: events.length,
      order_business_day_sequences: seq.length,
      order_read_orders: readOrders.length,
      order_read_order_line_items: readLines.length,
      order_read_order_timeline: readTimeline.length,
      order_read_public_order_status: readStatus.length,
      order_read_analytics_daily: analytics.length,
      order_read_operational_kpi_daily: kpi.length,
      order_read_backfill_runs: backfill.length,
      order_domain_outbox: outbox.length,
      print_jobs: printJobs.length,
      print_job_attempts: printAttempts.length,
      print_job_history: printHistory.length,
    },
    global,
    config,
    orderIdList,
  };
}

function assertSmokeOnly(inv) {
  const errors = [];
  for (const sr of inv.restaurantScoped.settlement_records) {
    if (
      sr.settlementRecordId !== SMOKE.settlementRecordId &&
      sr.checkId !== SMOKE.checkId
    ) {
      errors.push(`Unexpected SR: ${sr.settlementRecordId}`);
    }
  }
  for (const c of inv.restaurantScoped.operational_checks) {
    if (c.id !== SMOKE.checkId) errors.push(`Unexpected check: ${c.id}`);
  }
  for (const s of inv.restaurantScoped.dining_sessions) {
    if (s.id !== SMOKE.sessionId) errors.push(`Unexpected session: ${s.id}`);
  }
  for (const o of inv.restaurantScoped.orders) {
    if (!SMOKE.orderIds.includes(o.id)) {
      // allow only smoke orders; if new unexpected order appears, abort
      errors.push(`Unexpected order: ${o.id}`);
    }
  }
  // Global: only this restaurant should have financial data
  if (Number(inv.global.settlement_records) > 1) {
    errors.push("More than one settlement_record globally — abort");
  }
  if (Number(inv.global.all_checks) > 1) {
    errors.push("More than one operational_check globally — abort");
  }
  if (errors.length) {
    throw new Error(`Smoke isolation failed:\n${errors.join("\n")}`);
  }
}

async function backup(inv, stamp) {
  const dir = join(
    process.cwd(),
    "artifacts",
    "zero-epoch-smoke-cleanup-1",
    stamp
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "INVESTIGATION.json"), JSON.stringify(inv, null, 2));
  return dir;
}

async function deleteSmoke(conn, inv) {
  const restaurantId = SMOKE.restaurantId;
  const checkId = SMOKE.checkId;
  const sessionId = SMOKE.sessionId;
  const orderIds = inv.orderIdList;
  const printJobIds = inv.restaurantScoped.print_jobs.map((j) => j.id);
  const log = [];

  async function del(sql, params, label) {
    const [result] = await conn.query(sql, params);
    log.push({ label, affected: result.affectedRows ?? 0 });
  }

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    await del(
      `DELETE FROM settlement_records WHERE restaurantId = ?`,
      [restaurantId],
      "settlement_records"
    );
    // MCA / split — none expected; clear restaurant-scoped if any
    for (const t of [
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
    ]) {
      if (await tableExists(conn, t)) {
        // only if table has restaurantId
        try {
          await del(
            `DELETE FROM \`${t}\` WHERE restaurantId = ?`,
            [restaurantId],
            t
          );
        } catch {
          /* skip tables without restaurantId and no smoke rows */
        }
      }
    }

    await del(
      `DELETE FROM check_settlement_transactions WHERE restaurantId = ?`,
      [restaurantId],
      "check_settlement_transactions"
    );
    await del(
      `DELETE FROM check_order_settlements WHERE restaurantId = ?`,
      [restaurantId],
      "check_order_settlements"
    );
    await del(
      `DELETE FROM check_order_membership WHERE restaurantId = ?`,
      [restaurantId],
      "check_order_membership"
    );
    await del(
      `DELETE FROM operational_checks WHERE restaurantId = ?`,
      [restaurantId],
      "operational_checks"
    );

    if (printJobIds.length) {
      await del(
        `DELETE FROM print_job_attempts WHERE printJobId IN (?)`,
        [printJobIds],
        "print_job_attempts"
      );
      await del(
        `DELETE FROM print_job_history WHERE printJobId IN (?)`,
        [printJobIds],
        "print_job_history"
      );
      await del(
        `DELETE FROM print_jobs WHERE restaurantId = ?`,
        [restaurantId],
        "print_jobs"
      );
    }

    await del(
      `DELETE FROM table_events WHERE restaurantId = ?`,
      [restaurantId],
      "table_events"
    );

    if (orderIds.length) {
      await del(
        `DELETE FROM order_items WHERE orderId IN (?)`,
        [orderIds],
        "order_items"
      );
    }

    // Order Read projections
    for (const t of [
      "order_read_order_line_items",
      "order_read_order_timeline",
      "order_read_public_order_status",
      "order_read_orders",
      "order_read_analytics_daily",
      "order_read_operational_kpi_daily",
      "order_read_backfill_runs",
    ]) {
      if (await tableExists(conn, t)) {
        await del(
          `DELETE FROM \`${t}\` WHERE restaurantId = ?`,
          [restaurantId],
          t
        );
      }
    }

    if (await tableExists(conn, "order_domain_outbox")) {
      await del(
        `DELETE FROM order_domain_outbox WHERE restaurantId = ?`,
        [restaurantId],
        "order_domain_outbox"
      );
    }
    // Consumer dedupe has no restaurantId — clear rows for outbox eventIds of this restaurant
    if (await tableExists(conn, "order_domain_outbox")) {
      const [outboxRows] = await conn.query(
        `SELECT eventId FROM order_domain_outbox WHERE restaurantId = ?`,
        [restaurantId]
      );
      const eventIds = outboxRows.map((r) => r.eventId).filter(Boolean);
      if (
        eventIds.length &&
        (await tableExists(conn, "order_domain_consumer_processed"))
      ) {
        await del(
          `DELETE FROM order_domain_consumer_processed WHERE eventId IN (?)`,
          [eventIds],
          "order_domain_consumer_processed"
        );
      }
    }

    await del(
      `DELETE FROM orders WHERE restaurantId = ?`,
      [restaurantId],
      "orders"
    );
    await del(
      `DELETE FROM dining_sessions WHERE restaurantId = ?`,
      [restaurantId],
      "dining_sessions"
    );
    await del(
      `DELETE FROM order_business_day_sequences WHERE restaurant_id = ?`,
      [restaurantId],
      "order_business_day_sequences"
    );
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }

  return log;
}

async function validateZero(conn) {
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
      (SELECT COUNT(*) FROM order_read_analytics_daily) AS order_sales_rollups,
      (SELECT COUNT(*) FROM order_read_orders) AS order_read_orders,
      (SELECT COUNT(*) FROM check_order_membership) AS membership,
      (SELECT COUNT(*) FROM check_order_settlements) AS order_settlements
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

  const zerosOk =
    Number(financial.settlement_records) === 0 &&
    Number(financial.settlement_transactions) === 0 &&
    Number(financial.paid_checks) === 0 &&
    Number(financial.all_checks) === 0 &&
    Number(financial.revenue) === 0 &&
    Number(financial.tax_collected) === 0 &&
    Number(financial.payment_totals) === 0 &&
    Number(financial.dining_sessions) === 0 &&
    Number(financial.orders) === 0 &&
    Number(financial.order_sales_rollups) === 0 &&
    Number(financial.order_read_orders) === 0 &&
    Number(financial.membership) === 0 &&
    Number(financial.order_settlements) === 0;

  return { financial, config, zerosOk };
}

async function main() {
  const argv = process.argv.slice(2);
  const execute = argv.includes("--execute");
  const dryRun = !execute;

  if (execute && process.env.ZERO_EPOCH_SMOKE_CLEANUP_CONFIRM !== "YES") {
    console.error(
      "[smoke-cleanup] Refusing execute without ZERO_EPOCH_SMOKE_CLEANUP_CONFIRM=YES"
    );
    process.exit(1);
  }

  const conn = await connect();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    const inv = await investigate(conn);
    assertSmokeOnly(inv);
    const backupDir = await backup(inv, stamp);

    console.log(
      JSON.stringify(
        {
          program: "ZERO-EPOCH-SMOKE-CLEANUP-1",
          mode: execute ? "EXECUTE" : "DRY_RUN",
          smokeAnchors: SMOKE,
          countsBefore: inv.counts,
          globalBefore: inv.global,
          configBefore: inv.config,
          backupDir,
        },
        null,
        2
      )
    );

    if (dryRun) {
      console.log("[smoke-cleanup] dry-run complete — no deletes");
      return;
    }

    const deleteLog = await deleteSmoke(conn, inv);
    const after = await validateZero(conn);

    // config drift vs investigation
    const configDrift = {};
    for (const k of Object.keys(inv.config)) {
      if (Number(inv.config[k]) !== Number(after.config[k])) {
        configDrift[k] = { before: inv.config[k], after: after.config[k] };
      }
    }

    const verdict =
      after.zerosOk && Object.keys(configDrift).length === 0
        ? "PASS"
        : "FAIL";

    console.log(
      JSON.stringify(
        {
          deleteLog,
          financialAfter: after.financial,
          configAfter: after.config,
          configDrift,
          zerosOk: after.zerosOk,
          verdict,
        },
        null,
        2
      )
    );

    writeFileSync(
      join(backupDir, "RESULT.json"),
      JSON.stringify(
        { deleteLog, after, configDrift, verdict },
        null,
        2
      )
    );

    if (verdict !== "PASS") process.exitCode = 2;
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[smoke-cleanup] failed", e);
  process.exit(1);
});
