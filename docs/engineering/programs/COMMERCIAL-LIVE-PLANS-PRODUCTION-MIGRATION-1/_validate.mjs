/**
 * COMMERCIAL-LIVE-PLANS-PRODUCTION-MIGRATION-1 — post-bootstrap SELECT validation.
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
      `SELECT id, LEFT(hash,16) AS hashPrefix, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 3`
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
      `SELECT id, code, name, isHidden, featureBundleId, limitProfileId, trialPolicyId FROM commercial_plans ORDER BY code`
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
    const features = await q(
      conn,
      `SELECT p.code AS planCode, bf.featureKey, bf.included
       FROM commercial_plans p
       JOIN commercial_bundle_features bf ON bf.bundleId = p.featureBundleId
       ORDER BY p.code, bf.featureKey`
    );
    const limits = await q(
      conn,
      `SELECT p.code AS planCode, lv.limitKey, lv.value
       FROM commercial_plans p
       JOIN commercial_limit_values lv ON lv.profileId = p.limitProfileId
       ORDER BY p.code, lv.limitKey`
    );
    const dupPlans = await q(
      conn,
      `SELECT code, COUNT(*) AS n FROM commercial_plans GROUP BY code HAVING n > 1`
    );
    const dupFeatures = await q(
      conn,
      `SELECT bundleId, featureKey, COUNT(*) AS n FROM commercial_bundle_features GROUP BY bundleId, featureKey HAVING n > 1`
    );
    const dupPrices = await q(
      conn,
      `SELECT planId, billingCycleId, currency, regionId, COUNT(*) AS n
       FROM commercial_prices GROUP BY planId, billingCycleId, currency, regionId HAVING n > 1`
    );
    const orphanMappings = await q(
      conn,
      `SELECT bf.id, bf.featureKey FROM commercial_bundle_features bf
       LEFT JOIN commercial_plans p ON p.featureBundleId = bf.bundleId
       WHERE p.id IS NULL`
    );
    const bindings = await q(conn, `SELECT COUNT(*) AS n FROM commercial_subscription_bindings`);
    const counts = {
      commercial_plans: (await q(conn, `SELECT COUNT(*) AS n FROM commercial_plans`))[0].n,
      commercial_prices: (await q(conn, `SELECT COUNT(*) AS n FROM commercial_prices`))[0].n,
      commercial_feature_bundles: (await q(conn, `SELECT COUNT(*) AS n FROM commercial_feature_bundles`))[0].n,
      commercial_bundle_features: (await q(conn, `SELECT COUNT(*) AS n FROM commercial_bundle_features`))[0].n,
      users: (await q(conn, `SELECT COUNT(*) AS n FROM users`))[0].n,
      restaurants: (await q(conn, `SELECT COUNT(*) AS n FROM restaurants`))[0].n,
      user_subscriptions: (await q(conn, `SELECT COUNT(*) AS n FROM user_subscriptions`))[0].n,
      subscription_plans: (await q(conn, `SELECT COUNT(*) AS n FROM subscription_plans`))[0].n,
      invoices: (await q(conn, `SELECT COUNT(*) AS n FROM invoices`))[0].n,
      payments: (await q(conn, `SELECT COUNT(*) AS n FROM payments`))[0].n,
      subscription_history: (await q(conn, `SELECT COUNT(*) AS n FROM subscription_history`))[0].n,
      orders: (await q(conn, `SELECT COUNT(*) AS n FROM orders`))[0].n,
      settlement_records: (await q(conn, `SELECT COUNT(*) AS n FROM settlement_records`))[0].n,
    };
    const owner = await q(
      conn,
      `SELECT id, userId, restaurantId, planId, status, billingCycle,
              currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt, createdAt, updatedAt
       FROM user_subscriptions WHERE id = 600001`
    );
    const ownerUser = await q(
      conn,
      `SELECT id, name, email, role, openId FROM users WHERE id = 1`
    );
    const ownerRestaurants = await q(
      conn,
      `SELECT id, userId, slug, nameEn FROM restaurants WHERE userId = 1 ORDER BY id`
    );
    const tap = await q(
      conn,
      `SELECT id, userId, subscriptionId, invoiceId, amount, currency, status, paidAt, createdAt, updatedAt
       FROM payments WHERE id = 60001`
    );
    const subscriptionPlans = await q(
      conn,
      `SELECT id, nameEn, priceMonthly, priceYearly, isActive FROM subscription_plans ORDER BY id`
    );

    const expectedPrices = {
      "basic|USD|monthly|": "0.00",
      "basic|USD|yearly|": "0.00",
      "professional|USD|monthly|": "26.40",
      "professional|USD|yearly|": "264.00",
      "professional|SAR|monthly|sa": "99.00",
      "professional|SAR|yearly|sa": "990.00",
      "enterprise|USD|monthly|": "79.73",
      "enterprise|USD|yearly|": "797.33",
      "enterprise|SAR|monthly|sa": "299.00",
      "enterprise|SAR|yearly|sa": "2990.00",
    };
    const priceKeys = prices.map((p) => {
      const region = p.region || "";
      const key = `${p.planCode}|${p.currency}|${p.cycle}|${region}`;
      return { key, amount: String(p.amount), expected: expectedPrices[key] ?? null };
    });
    const priceMismatches = priceKeys.filter((p) => p.expected !== p.amount);
    const missingPrices = Object.keys(expectedPrices).filter(
      (k) => !priceKeys.some((p) => p.key === k)
    );

    const includedByPlan = {};
    for (const f of features) {
      if (!includedByPlan[f.planCode]) includedByPlan[f.planCode] = [];
      if (Number(f.included) === 1) includedByPlan[f.planCode].push(f.featureKey);
    }

    const stop = [];
    if (plans.length !== 3) stop.push(`planCount=${plans.length}`);
    if (plans.map((p) => p.code).sort().join(",") !== "basic,enterprise,professional") {
      stop.push(`codes=${plans.map((p) => p.code).join(",")}`);
    }
    if (dupPlans.length) stop.push("duplicate plans");
    if (dupFeatures.length) stop.push("duplicate features");
    if (dupPrices.length) stop.push("duplicate prices");
    if (orphanMappings.length) stop.push("orphaned mappings");
    if (Number(bindings[0].n) !== 0) stop.push(`bindings=${bindings[0].n}`);
    if (Object.values(obsolete).some(Boolean)) stop.push("obsolete tables still present");
    if (priceMismatches.length) stop.push(`price mismatches ${JSON.stringify(priceMismatches)}`);
    if (missingPrices.length) stop.push(`missing prices ${missingPrices.join(",")}`);
    if (String(terminus[0]?.hashPrefix || "").startsWith("c104e894606f")) stop.push("terminus still 0085");
    if (!String(terminus[0]?.hashPrefix || "").startsWith("cfaec30e54892eaf")) {
      stop.push(`terminus hash ${terminus[0]?.hashPrefix}`);
    }

    const report = {
      queriedAt: new Date().toISOString(),
      gate: stop.length === 0 ? "PASS" : "STOP",
      stop,
      terminus,
      obsolete,
      counts,
      plans,
      prices,
      priceKeys,
      includedByPlan,
      includedCounts: Object.fromEntries(
        Object.entries(includedByPlan).map(([k, v]) => [k, v.length])
      ),
      limits,
      dupPlans,
      dupFeatures,
      dupPrices,
      orphanMappings,
      bindings: bindings[0],
      owner,
      ownerUser,
      ownerRestaurants,
      tap,
      subscriptionPlans,
    };
    writeFileSync(join(HERE, "_post-bootstrap.json"), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          gate: report.gate,
          stop,
          terminus,
          counts,
          plans: plans.map((p) => ({ code: p.code, name: p.name, id: p.id })),
          includedCounts: report.includedCounts,
          includedByPlan,
          prices,
          limits,
          owner: owner[0],
          tap: tap[0],
          subscriptionPlans,
          obsolete,
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
  console.error("VALIDATE_FAILED", e?.message || e);
  process.exit(1);
});
