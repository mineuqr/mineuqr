/**
 * Follow-up SELECT only: payments, subscription_history, Tap statuses.
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslRaw = url.searchParams.get("ssl");
  let ssl;
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw);
    } catch {
      ssl = undefined;
    }
  }
  const host = url.hostname;
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl:
      ssl ??
      (isTidbCloud
        ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
        : undefined),
  };
}

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "bigint") out[k] = Number(v);
    else if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
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
    const paymentCols = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'
       ORDER BY ORDINAL_POSITION`
    );
    const payments = await q(
      conn,
      `SELECT id, userId, subscriptionId, invoiceId, amount, currency, status,
              paymentMethod, cardBrand, LEFT(IFNULL(cardLastFour,''), 1) AS cardLastFourPresent,
              LEFT(IFNULL(tapChargeId,''), 8) AS tapChargePrefix,
              LEFT(IFNULL(tapCustomerId,''), 8) AS tapCustomerPrefix,
              paidAt, refundedAt, failureReason, failureCode, createdAt
       FROM payments ORDER BY id`
    );
    const paymentStatus = await q(
      conn,
      `SELECT status, currency, COUNT(*) AS n, SUM(amount) AS sumAmount FROM payments GROUP BY status, currency`
    );
    const history = await q(
      conn,
      `SELECT id, subscriptionId, userId, paymentId, action, planId, billingCycle, status,
              amount, currency, periodStart, periodEnd, notes, createdAt
       FROM subscription_history ORDER BY id`
    );
    const subPeriodVsNow = await q(
      conn,
      `SELECT id, userId, restaurantId, planId, status, currentPeriodEnd,
              (currentPeriodEnd < UTC_TIMESTAMP()) AS periodEnded
       FROM user_subscriptions ORDER BY id`
    );
    const invoicePaid = await q(
      conn,
      `SELECT COUNT(*) AS n FROM invoices WHERE status = 'paid' OR paidAt IS NOT NULL`
    );
    const auditSub = await q(
      conn,
      `SELECT COUNT(*) AS n FROM audit_events WHERE category = 'SUBSCRIPTION' OR category = 'COMMERCIAL'`
    ).catch(() => [{ n: "audit_events_unavailable" }]);

    const out = {
      queriedAt: new Date().toISOString(),
      paymentCols: paymentCols.map((c) => c.COLUMN_NAME),
      payments,
      paymentStatus,
      history,
      subPeriodVsNow,
      paidInvoiceCount: invoicePaid[0]?.n,
      auditCommercialOrSubscription: auditSub[0]?.n,
    };
    writeFileSync(join(HERE, "_QUERY-EVIDENCE-PAYMENTS.json"), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("FORENSICS_FAILED", e?.message || e);
  process.exit(1);
});
