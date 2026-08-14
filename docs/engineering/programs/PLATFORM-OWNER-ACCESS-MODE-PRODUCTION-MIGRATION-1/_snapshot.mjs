/**
 * PLATFORM-OWNER-ACCESS-MODE-PRODUCTION-MIGRATION-1
 * SELECT-only production snapshot. No writes.
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const label = process.argv[2] || "snapshot";

const EXPECTED_0086_PREFIX = "cfaec30e54892eaf";
const TAG_0086 = "0086_commercial_live_plans";
const TAG_0087 = "0087_platform_owner_access_mode";

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

function hashSql(tag) {
  const sql = readFileSync(join(ROOT, "drizzle", `${tag}.sql`), "utf8");
  return createHash("sha256").update(sql).digest("hex");
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

async function count(conn, table) {
  try {
    const rows = await q(conn, `SELECT COUNT(*) AS n FROM \`${table}\``);
    return Number(rows[0]?.n ?? 0);
  } catch (e) {
    return { missing: true, error: e.message };
  }
}

async function tableExists(conn, name) {
  const rows = await q(
    conn,
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return rows.length > 0;
}

async function columns(conn, table) {
  return q(
    conn,
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [table]
  );
}

async function constraints(conn, table) {
  return q(
    conn,
    `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY CONSTRAINT_NAME`,
    [table]
  );
}

async function checkClauses(conn, table) {
  return q(
    conn,
    `SELECT CONSTRAINT_NAME, CHECK_CLAUSE
     FROM information_schema.CHECK_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME IN (
       SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     )`,
    [table]
  ).catch(() => []);
}

async function main() {
  const hash0086 = hashSql(TAG_0086);
  const hash0087 = hashSql(TAG_0087);
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
    const terminus = await q(
      conn,
      `SELECT id, hash, LEFT(hash,16) AS hashPrefix, created_at
       FROM __drizzle_migrations ORDER BY id DESC LIMIT 8`
    );
    const applied0086 = terminus.some((r) => r.hash === hash0086);
    const applied0087 = terminus.some((r) => r.hash === hash0087);
    const ownerTableExists = await tableExists(conn, "platform_owner_access_mode");

    const catalogTables = [
      "commercial_plans",
      "commercial_prices",
      "commercial_subscription_bindings",
      "commercial_feature_bundles",
      "commercial_bundle_features",
      "commercial_limit_profiles",
      "commercial_limit_values",
      "commercial_billing_cycles",
    ];
    const platformTables = [
      "users",
      "restaurants",
      "user_subscriptions",
      "subscription_plans",
      "invoices",
      "payments",
      "subscription_history",
      "orders",
      "settlement_records",
    ];

    const counts = {};
    for (const t of [...catalogTables, ...platformTables]) {
      counts[t] = (await tableExists(conn, t)) ? await count(conn, t) : "ABSENT";
    }

    const report = {
      label,
      queriedAt: new Date().toISOString(),
      database: cfg.database,
      hostKind: /\.tidbcloud\.com$/i.test(cfg.host) ? "tidb-cloud" : "other",
      hashes: {
        "0086": hash0086,
        "0087": hash0087,
      },
      terminus,
      applied0086,
      applied0087,
      ownerTableExists,
      ownerAccessColumns: ownerTableExists
        ? await columns(conn, "platform_owner_access_mode")
        : [],
      ownerAccessConstraints: ownerTableExists
        ? await constraints(conn, "platform_owner_access_mode")
        : [],
      ownerAccessChecks: ownerTableExists
        ? await checkClauses(conn, "platform_owner_access_mode")
        : [],
      ownerAccessRows: ownerTableExists
        ? await q(
            conn,
            `SELECT ownerOpenId, mode, simulatedPlanCode, createdAt, updatedAt
             FROM platform_owner_access_mode`
          )
        : [],
      counts,
      livePlans: await q(
        conn,
        `SELECT id, code, name, isHidden FROM commercial_plans ORDER BY code`
      ).catch(() => []),
      livePrices: await q(
        conn,
        `SELECT p.code AS planCode, pr.amount, pr.currency, c.code AS cycle
         FROM commercial_prices pr
         JOIN commercial_plans p ON p.id = pr.planId
         LEFT JOIN commercial_billing_cycles c ON c.id = pr.billingCycleId
         ORDER BY p.code, pr.currency, c.code`
      ).catch(() => []),
      ownerUser: await q(
        conn,
        `SELECT id, role, accountClassification, LEFT(openId,8) AS openIdPrefix
         FROM users WHERE id = 1`
      ),
      owner600001: await q(
        conn,
        `SELECT id, userId, restaurantId, planId, status, billingCycle,
                currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt, createdAt, updatedAt
         FROM user_subscriptions WHERE id = 600001`
      ),
      tap60001: await q(
        conn,
        `SELECT id, userId, subscriptionId, invoiceId, amount, currency, status, paidAt, createdAt, updatedAt
         FROM payments WHERE id = 60001`
      ),
      bindings: await q(
        conn,
        `SELECT subscriptionId, planId FROM commercial_subscription_bindings`
      ).catch(() => []),
    };

    const stop = [];
    if (label === "pre") {
      if (!applied0086) stop.push("production not at 0086");
      if (!String(terminus[0]?.hashPrefix || "").startsWith(EXPECTED_0086_PREFIX)) {
        stop.push(`latest hash unexpected ${terminus[0]?.hashPrefix}`);
      }
      if (applied0087) stop.push("0087 already applied");
      if (ownerTableExists) stop.push("platform_owner_access_mode already exists");
      if (!report.owner600001[0]) stop.push("owner 600001 missing");
      if (!report.tap60001[0] || report.tap60001[0].status !== "captured") {
        stop.push("tap 60001 missing/changed");
      }
    }
    report.stop = stop;
    report.gate = stop.length === 0 ? "PASS" : "STOP";

    writeFileSync(join(HERE, `_${label}.json`), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          label,
          gate: report.gate,
          stop,
          applied0086,
          applied0087,
          ownerTableExists,
          latest: terminus[0],
          hash0087Prefix: hash0087.slice(0, 16),
          counts,
          owner600001: report.owner600001,
          tap60001: report.tap60001,
          bindings: report.bindings.length,
          livePlans: report.livePlans.map((p) => p.code),
          ownerAccessRows: report.ownerAccessRows.length,
        },
        null,
        2
      )
    );
    if (label === "pre" && stop.length) process.exit(2);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("SNAPSHOT_FAILED", e?.message || e);
  process.exit(1);
});
