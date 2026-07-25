/**
 * REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1
 *
 * One-time administrative cleanup of historical experimental unpaid
 * sessionless Checks (open + sessionId IS NULL) left from Counter Pickup /
 * Self Ordering test activity.
 *
 * Pattern matches ZERO-EPOCH-SMOKE-CLEANUP-1 (dry-run + confirm env).
 *
 * Does NOT:
 *   - Delete Settlement Records
 *   - Touch Session-owned Checks (sessionId NOT NULL)
 *   - Auto-run (no cron)
 *   - Invent recurring deletion logic
 *
 * Dry-run (default):
 *   node scripts/register-ops-unpaid-test-cleanup.mjs --dry-run [--restaurantId=N]
 *
 * Execute:
 *   REGISTER_OPS_UNPAID_TEST_CLEANUP_CONFIRM=YES \
 *     node scripts/register-ops-unpaid-test-cleanup.mjs --execute --restaurantId=N
 *
 * Optional explicit allow-list:
 *   --orderIds=12,34,56
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

function parseArgs(argv) {
  const out = {
    dryRun: true,
    execute: false,
    restaurantId: null,
    orderIds: null,
  };
  for (const a of argv) {
    if (a === "--dry-run") {
      out.dryRun = true;
      out.execute = false;
    }
    if (a === "--execute") {
      out.execute = true;
      out.dryRun = false;
    }
    if (a.startsWith("--restaurantId=")) {
      out.restaurantId = Number(a.slice("--restaurantId=".length));
    }
    if (a.startsWith("--orderIds=")) {
      out.orderIds = a
        .slice("--orderIds=".length)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
  }
  return out;
}

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

async function listCandidates(conn, { restaurantId, orderIds }) {
  const params = [];
  let sql = `
    SELECT
      c.id AS checkId,
      c.restaurantId,
      c.outcome,
      c.sessionId,
      c.grandTotal,
      c.createdAt AS checkCreatedAt,
      o.id AS orderId,
      o.status AS orderStatus,
      o.serviceMode,
      o.orderNumber,
      o.daily_display_number AS dailyDisplayNumber
    FROM operational_checks c
    INNER JOIN check_order_membership m
      ON m.checkId = c.id AND m.restaurantId = c.restaurantId AND m.active = 1
    INNER JOIN orders o
      ON o.id = m.orderId AND o.restaurantId = c.restaurantId
    WHERE c.outcome = 'open'
      AND c.sessionId IS NULL
  `;
  if (restaurantId != null) {
    sql += ` AND c.restaurantId = ?`;
    params.push(restaurantId);
  }
  if (orderIds?.length) {
    sql += ` AND o.id IN (${orderIds.map(() => "?").join(",")})`;
    params.push(...orderIds);
  }
  sql += ` ORDER BY c.createdAt DESC LIMIT 500`;
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function executeCleanup(conn, candidates) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const results = [];
  for (const row of candidates) {
    await conn.beginTransaction();
    try {
      await conn.query(
        `UPDATE operational_checks
         SET outcome = 'voided', voidedAt = ?, updatedAt = ?
         WHERE id = ? AND restaurantId = ? AND outcome = 'open' AND sessionId IS NULL`,
        [now, now, row.checkId, row.restaurantId]
      );
      await conn.query(
        `UPDATE check_order_membership
         SET active = 0, updatedAt = ?
         WHERE checkId = ? AND restaurantId = ? AND active = 1`,
        [now, row.checkId, row.restaurantId]
      );
      // Experimental unpaid only — leave served kitchen history but close money.
      if (["pending", "preparing", "ready", "cancelled"].includes(row.orderStatus)) {
        await conn.query(
          `UPDATE orders SET status = 'cancelled', updatedAt = ?
           WHERE id = ? AND restaurantId = ? AND status IN ('pending','preparing','ready','cancelled')`,
          [now, row.orderId, row.restaurantId]
        );
      }
      await conn.commit();
      results.push({
        checkId: row.checkId,
        orderId: row.orderId,
        restaurantId: row.restaurantId,
        ok: true,
      });
    } catch (e) {
      await conn.rollback();
      results.push({
        checkId: row.checkId,
        orderId: row.orderId,
        restaurantId: row.restaurantId,
        ok: false,
        error: String(e?.message ?? e),
      });
    }
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.execute) {
    if (process.env.REGISTER_OPS_UNPAID_TEST_CLEANUP_CONFIRM !== "YES") {
      throw new Error(
        "Refusing execute without REGISTER_OPS_UNPAID_TEST_CLEANUP_CONFIRM=YES"
      );
    }
    if (!args.restaurantId || !Number.isInteger(args.restaurantId)) {
      throw new Error("--restaurantId=N is required for --execute (safety)");
    }
  }

  const conn = await connect();
  try {
    const candidates = await listCandidates(conn, args);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = join(
      process.cwd(),
      "artifacts",
      "register-ops-responsibility-cleanup-1"
    );
    mkdirSync(dir, { recursive: true });
    const reportPath = join(
      dir,
      args.execute ? `execute-${stamp}.json` : `dry-run-${stamp}.json`
    );

    const report = {
      program: "REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1",
      mode: args.execute ? "execute" : "dry-run",
      restaurantId: args.restaurantId,
      orderIdsFilter: args.orderIds,
      candidateCount: candidates.length,
      candidates,
      executed: null,
    };

    if (args.dryRun || !args.execute) {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(
        `[unpaid-test-cleanup] dry-run: ${candidates.length} open sessionless unpaid Check(s)`
      );
      console.log(`[unpaid-test-cleanup] report: ${reportPath}`);
      return;
    }

    const executed = await executeCleanup(conn, candidates);
    report.executed = executed;
    report.successCount = executed.filter((r) => r.ok).length;
    report.failCount = executed.filter((r) => !r.ok).length;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(
      `[unpaid-test-cleanup] execute: ok=${report.successCount} fail=${report.failCount}`
    );
    console.log(`[unpaid-test-cleanup] report: ${reportPath}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[unpaid-test-cleanup] failed", e);
  process.exit(1);
});
