/**
 * COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1
 * READ-ONLY production Live Plan capability forensics. No writes.
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

async function tableExists(conn, name) {
  const rows = await q(
    conn,
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return rows.length > 0;
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
      `SELECT id, LEFT(hash,16) AS hashPrefix, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 1`
    );
    const obsolete = {};
    for (const t of [
      "commercial_plan_versions",
      "commercial_snapshot_definitions",
      "commercial_publication_rules",
      "commercial_retirement_policies",
    ]) {
      obsolete[t] = await tableExists(conn, t);
    }
    const plans = await q(
      conn,
      `SELECT id, code, name, featureBundleId, limitProfileId, trialPolicyId FROM commercial_plans ORDER BY code`
    );
    const features = await q(
      conn,
      `SELECT p.code AS planCode, bf.featureKey, bf.included
       FROM commercial_plans p
       JOIN commercial_bundle_features bf ON bf.bundleId = p.featureBundleId
       ORDER BY p.code, bf.featureKey`
    );
    const prices = await q(
      conn,
      `SELECT p.code AS planCode, pr.currency, c.code AS cycle, pr.amount, r.code AS region
       FROM commercial_prices pr
       JOIN commercial_plans p ON p.id = pr.planId
       JOIN commercial_billing_cycles c ON c.id = pr.billingCycleId
       LEFT JOIN commercial_regions r ON r.id = pr.regionId
       ORDER BY p.code, pr.currency, c.code, r.code`
    );
    const limits = await q(
      conn,
      `SELECT p.code AS planCode, lv.limitKey, lv.value
       FROM commercial_plans p
       JOIN commercial_limit_values lv ON lv.profileId = p.limitProfileId
       ORDER BY p.code, lv.limitKey`
    );
    const checkout = await q(
      conn,
      `SELECT id, nameEn, priceMonthly, priceYearly FROM subscription_plans WHERE id IN (30001,30002,30003) ORDER BY id`
    );
    const includedByPlan = {};
    for (const f of features) {
      if (!includedByPlan[f.planCode]) includedByPlan[f.planCode] = [];
      if (Number(f.included) === 1) includedByPlan[f.planCode].push(f.featureKey);
    }
    const report = {
      queriedAt: new Date().toISOString(),
      readOnly: true,
      terminus,
      obsolete,
      plans,
      includedCounts: Object.fromEntries(
        Object.entries(includedByPlan).map(([k, v]) => [k, v.length])
      ),
      includedByPlan,
      prices,
      limits,
      checkout,
    };
    writeFileSync(join(HERE, "_forensics.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("FORENSICS_FAILED", e?.message || e);
  process.exit(1);
});
