/**
 * COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1 — preflight SELECT only.
 * STOP if any commercial catalog consumer exists.
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const host = url.hostname;
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: isTidbCloud
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
  };
}

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "bigint" ? Number(v) : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

async function q(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return Array.isArray(rows) ? rows.map(asPlain) : rows;
}

async function main() {
  const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
  const conn = await createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(cfg.ssl ? { ssl: cfg.ssl } : {}),
  });
  try {
    const bindings = await q(conn, `SELECT COUNT(*) AS n FROM commercial_subscription_bindings`);
    const snapshots = await q(conn, `SELECT COUNT(*) AS n FROM commercial_snapshot_definitions`);
    const versions = await q(conn, `SELECT COUNT(*) AS n FROM commercial_plan_versions`);
    const plans = await q(conn, `SELECT code, name FROM commercial_plans ORDER BY code`);
    const subPlanIds = await q(
      conn,
      `SELECT DISTINCT planId FROM user_subscriptions ORDER BY planId`
    );
    const invoiceCols = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices'`
    );
    const paymentCols = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'`
    );
    const restaurantCols = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurants'`
    );
    const subCols = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions'`
    );
    const ownerSub = await q(
      conn,
      `SELECT id, userId, restaurantId, planId, status, currentPeriodStart, currentPeriodEnd, updatedAt
       FROM user_subscriptions WHERE id = 600001`
    );
    const tap = await q(
      conn,
      `SELECT id, userId, amount, currency, status, paidAt FROM payments WHERE id = 60001`
    );
    const forbiddenHits = await q(
      conn,
      `SELECT TABLE_NAME, COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'users','restaurants','user_subscriptions','subscription_plans','invoices','payments',
           'subscription_history','orders','settlement_records'
         )
         AND (
           COLUMN_NAME LIKE '%planVersion%'
           OR COLUMN_NAME LIKE '%snapshotId%'
           OR COLUMN_NAME LIKE '%commercial_plan%'
           OR COLUMN_NAME = 'featureBundleId'
         )`
    );
    const terminus = await q(
      conn,
      `SELECT id, LEFT(hash,12) AS hashPrefix, created_at
       FROM __drizzle_migrations ORDER BY id DESC LIMIT 3`
    );
    const liveCols = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_plans'
         AND COLUMN_NAME IN ('featureBundleId','limitProfileId','trialPolicyId')`
    );

    const report = {
      queriedAt: new Date().toISOString(),
      bindings: Number(bindings[0]?.n ?? -1),
      snapshots: Number(snapshots[0]?.n ?? -1),
      versions: Number(versions[0]?.n ?? -1),
      plans,
      subscriptionPlanIds: subPlanIds.map((r) => r.planId),
      invoiceColumns: invoiceCols.map((c) => c.COLUMN_NAME),
      paymentColumns: paymentCols.map((c) => c.COLUMN_NAME),
      restaurantColumns: restaurantCols.map((c) => c.COLUMN_NAME),
      subscriptionColumns: subCols.map((c) => c.COLUMN_NAME),
      forbiddenColumnHits: forbiddenHits,
      owner600001: ownerSub,
      tapPayment60001: tap,
      terminus,
      livePlanColumns: liveCols.map((c) => c.COLUMN_NAME),
    };

    const stop = [];
    if (report.bindings !== 0) stop.push(`bindings=${report.bindings}`);
    if (report.snapshots !== 0) stop.push(`snapshots=${report.snapshots}`);
    if (report.forbiddenColumnHits.length > 0) stop.push("non-commercial catalog columns");
    if (report.subscriptionPlanIds.some((id) => typeof id === "string" && String(id).includes("-"))) {
      stop.push("user_subscriptions.planId looks like catalog UUID");
    }
    report.stop = stop;
    report.preflight = stop.length === 0 ? "PASS" : "STOP";

    writeFileSync(join(HERE, "_PREFLIGHT.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ preflight: report.preflight, stop, bindings: report.bindings, snapshots: report.snapshots, terminus: report.terminus, owner: report.owner600001, tap: report.tapPayment60001, livePlanColumns: report.livePlanColumns, subscriptionPlanIds: report.subscriptionPlanIds, forbiddenColumnHits: report.forbiddenColumnHits }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("PREFLIGHT_FAILED", e?.message || e);
  process.exit(1);
});
