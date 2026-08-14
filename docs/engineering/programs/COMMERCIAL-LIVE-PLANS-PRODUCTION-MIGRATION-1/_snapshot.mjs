/**
 * COMMERCIAL-LIVE-PLANS-PRODUCTION-MIGRATION-1 — SELECT-only snapshot/preflight.
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] || "snapshot";

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
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [table]
  ).then((rows) => rows.map((r) => r.COLUMN_NAME));
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
    const terminus = await q(
      conn,
      `SELECT id, LEFT(hash,16) AS hashPrefix, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 5`
    );
    const catalogTables = [
      "commercial_plans",
      "commercial_plan_versions",
      "commercial_snapshot_definitions",
      "commercial_publication_rules",
      "commercial_retirement_policies",
      "commercial_prices",
      "commercial_subscription_bindings",
      "commercial_feature_bundles",
      "commercial_bundle_features",
      "commercial_limit_profiles",
      "commercial_limit_values",
      "commercial_billing_cycles",
      "commercial_trial_policies",
      "commercial_migration_policies",
      "commercial_regions",
      "commercial_promotions",
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
    const exists = {};
    for (const t of catalogTables) exists[t] = await tableExists(conn, t);

    const counts = {};
    for (const t of [...catalogTables, ...platformTables]) {
      counts[t] = exists[t] === false ? "ABSENT" : await count(conn, t);
    }

    const report = {
      label,
      queriedAt: new Date().toISOString(),
      terminus,
      exists,
      counts,
      commercialPlanColumns: exists.commercial_plans ? await columns(conn, "commercial_plans") : [],
      priceColumns: exists.commercial_prices ? await columns(conn, "commercial_prices") : [],
      bindingColumns: exists.commercial_subscription_bindings
        ? await columns(conn, "commercial_subscription_bindings")
        : [],
      plans: exists.commercial_plans
        ? await q(conn, `SELECT id, code, name, isHidden FROM commercial_plans ORDER BY code`)
        : [],
      prices: exists.commercial_prices
        ? await q(
            conn,
            `SELECT pr.currency, pr.amount, c.code AS cycle, p.code AS planCode, pr.regionId
             FROM commercial_prices pr
             LEFT JOIN commercial_plans p ON p.id = pr.planId
             LEFT JOIN commercial_billing_cycles c ON c.id = pr.billingCycleId
             ORDER BY p.code, pr.currency, c.code`
          ).catch(() => [{ note: "planId join failed (pre-0086)" }])
        : [],
      subscriptionPlans: await q(
        conn,
        `SELECT id, nameEn, priceMonthly, priceYearly, isActive FROM subscription_plans ORDER BY id`
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
      subPlanIds: await q(conn, `SELECT DISTINCT planId FROM user_subscriptions ORDER BY planId`),
      bindings: exists.commercial_subscription_bindings
        ? await q(conn, `SELECT COUNT(*) AS n FROM commercial_subscription_bindings`)
        : [{ n: "ABSENT" }],
      invoiceCatalogCols: (await columns(conn, "invoices")).filter((c) =>
        /planVersion|snapshot|commercial/i.test(c)
      ),
      paymentCatalogCols: (await columns(conn, "payments")).filter((c) =>
        /planVersion|snapshot|commercial/i.test(c)
      ),
      restaurantCatalogCols: (await columns(conn, "restaurants")).filter((c) =>
        /planVersion|snapshot|commercial/i.test(c)
      ),
      subCatalogCols: (await columns(conn, "user_subscriptions")).filter((c) =>
        /planVersion|snapshot|commercial|featureBundle/i.test(c)
      ),
    };

    const stop = [];
    if (label === "pre") {
      if (Number(report.bindings[0]?.n) !== 0) stop.push(`bindings=${report.bindings[0]?.n}`);
      if (exists.commercial_snapshot_definitions && counts.commercial_snapshot_definitions !== 0) {
        stop.push(`snapshots=${counts.commercial_snapshot_definitions}`);
      }
      if (report.subPlanIds.some((r) => typeof r.planId === "string" && String(r.planId).includes("-"))) {
        stop.push("subscription planId looks like catalog UUID");
      }
      if (report.invoiceCatalogCols.length) stop.push("invoice catalog cols");
      if (report.paymentCatalogCols.length) stop.push("payment catalog cols");
      if (report.restaurantCatalogCols.length) stop.push("restaurant catalog cols");
      if (report.subCatalogCols.length) stop.push("subscription catalog cols");
      const last = terminus[0];
      if (!String(last?.hashPrefix || "").startsWith("c104e894606f")) {
        stop.push(`terminus hash unexpected ${last?.hashPrefix}`);
      }
      if (!report.owner600001[0]) stop.push("owner 600001 missing");
      if (!report.tap60001[0] || report.tap60001[0].status !== "captured") {
        stop.push("tap 60001 missing/changed");
      }
    }
    report.stop = stop;
    report.gate = stop.length === 0 ? "PASS" : "STOP";

    const out = join(HERE, `_${label}.json`);
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          label,
          gate: report.gate,
          stop,
          terminus: report.terminus,
          counts: report.counts,
          plans: report.plans,
          owner: report.owner600001,
          tap: report.tap60001,
          subscriptionPlans: report.subscriptionPlans,
          subPlanIds: report.subPlanIds,
          liveCols: report.commercialPlanColumns.filter((c) =>
            ["featureBundleId", "limitProfileId", "trialPolicyId"].includes(c)
          ),
          priceCols: report.priceColumns,
          bindingCols: report.bindingColumns,
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
  console.error("SNAPSHOT_FAILED", e?.message || e);
  process.exit(1);
});
