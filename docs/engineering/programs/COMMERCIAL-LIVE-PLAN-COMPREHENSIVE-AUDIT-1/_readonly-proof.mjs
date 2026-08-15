/**
 * COMMERCIAL-LIVE-PLAN-COMPREHENSIVE-AUDIT-1
 * SELECT + INFORMATION_SCHEMA only. No DDL/DML. No migrations.
 * Does not print credentials, connection strings, or customer PII.
 */
import "dotenv/config";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] =
      typeof v === "bigint"
        ? Number(v)
        : v instanceof Date
          ? v.toISOString()
          : v;
  }
  return out;
}

function classifyHost(target) {
  const host = target.host ?? "";
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  const looksProd = /\.prod\./i.test(host);
  const looksGateway01 = /^gateway01\./i.test(host);
  return {
    hostKind: isTidbCloud ? "tidb_cloud" : "other",
    database: target.database,
    tls: target.tls,
    port: target.port,
    hostPattern: isTidbCloud
      ? looksProd
        ? "tidbcloud_prod"
        : "tidbcloud_non_prod_pattern"
      : "not_tidbcloud",
    matchesKnownProductionShape:
      isTidbCloud && looksProd && looksGateway01 && target.database === "mineuqr",
  };
}

async function main() {
  const queriedAt = new Date().toISOString();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(
      JSON.stringify({
        queriedAt,
        access: "UNAVAILABLE",
        reason: "DATABASE_URL_MISSING",
        mutation: "NONE",
      })
    );
    process.exit(0);
  }

  const classify = classifyHost(auditConnectionTarget(url));
  const conn = await createAuditReadonlyConnection(url);
  const q = async (sql) => {
    const [rows] = await conn.execute(sql);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };

  try {
    const session = await q(
      "SELECT DATABASE() AS db, @@hostname AS hostname, CURRENT_TIMESTAMP() AS server_ts"
    );

    const planCols = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_plans'
       ORDER BY ORDINAL_POSITION`
    );

    const plans = await q(
      `SELECT id, code, name, sortOrder, isHidden,
              featureBundleId IS NOT NULL AS has_bundle,
              limitProfileId IS NOT NULL AS has_limits,
              trialPolicyId IS NOT NULL AS has_trial,
              createdAt, updatedAt
       FROM commercial_plans
       ORDER BY sortOrder, code`
    );

    const planDupCodes = await q(
      `SELECT code, COUNT(*) AS n FROM commercial_plans GROUP BY code HAVING n > 1`
    );
    const planDupIds = await q(
      `SELECT id, COUNT(*) AS n FROM commercial_plans GROUP BY id HAVING n > 1`
    );

    const prices = await q(
      `SELECT p.planId, cp.code, p.currency, p.amount, p.regionId IS NOT NULL AS regional,
              bc.code AS cycle
       FROM commercial_prices p
       JOIN commercial_plans cp ON cp.id = p.planId
       JOIN commercial_billing_cycles bc ON bc.id = p.billingCycleId
       ORDER BY cp.code, cycle, regional`
    );

    const priceOrphans = await q(
      `SELECT COUNT(*) AS n FROM commercial_prices p
       LEFT JOIN commercial_plans cp ON cp.id = p.planId
       WHERE cp.id IS NULL`
    );

    const regions = await q(
      `SELECT code, countryCode, currency, taxPolicyRef IS NOT NULL AS has_tax_policy_ref
       FROM commercial_regions ORDER BY code`
    );

    const usShape = await q(
      `SELECT
         CASE
           WHEN planId REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 'uuid'
           WHEN planId REGEXP '^[0-9]+$' THEN 'digit_string'
           ELSE 'other'
         END AS kind,
         COUNT(*) AS n
       FROM user_subscriptions GROUP BY kind`
    );

    const usJoin = await q(
      `SELECT cp.code, COUNT(*) AS n
       FROM user_subscriptions us
       INNER JOIN commercial_plans cp ON cp.id = us.planId
       GROUP BY cp.code ORDER BY n DESC`
    );

    const usOrphan = await q(
      `SELECT COUNT(*) AS n
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId
       WHERE cp.id IS NULL`
    );

    const usStatus = await q(
      "SELECT status, COUNT(*) AS n FROM user_subscriptions GROUP BY status"
    );

    const bindJoin = await q(
      `SELECT cp.code, COUNT(*) AS n
       FROM commercial_subscription_bindings b
       INNER JOIN commercial_plans cp ON cp.id = b.planId
       GROUP BY cp.code`
    );

    const bindDisagree = await q(
      `SELECT COUNT(*) AS n
       FROM commercial_subscription_bindings b
       JOIN user_subscriptions us ON us.id = b.subscriptionId
       WHERE b.planId <> us.planId`
    );

    const bindTerms = await q(
      `SELECT
         SUM(chargedAmount IS NOT NULL AND chargedCurrency IS NOT NULL AND billingCycleCode IS NOT NULL) AS complete,
         SUM(chargedAmount IS NULL OR chargedCurrency IS NULL OR billingCycleCode IS NULL) AS incomplete,
         COUNT(*) AS n
       FROM commercial_subscription_bindings`
    );

    const bindLegacy = await q(
      `SELECT CASE WHEN legacyPlanId IS NULL THEN 'null' ELSE 'non_null' END AS legacy, COUNT(*) AS n
       FROM commercial_subscription_bindings GROUP BY legacy`
    );

    const bindCycleCurrency = await q(
      `SELECT chargedCurrency, billingCycleCode, COUNT(*) AS n
       FROM commercial_subscription_bindings
       GROUP BY chargedCurrency, billingCycleCode`
    );

    const leftover = await q(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_plans'`
    );
    const leftoverRows =
      leftover[0]?.n > 0
        ? await q("SELECT id, isActive FROM subscription_plans ORDER BY id")
        : [];

    const leftoverFks = await q(
      `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND (
           REFERENCED_TABLE_NAME = 'subscription_plans'
           OR (TABLE_NAME = 'subscription_plans' AND REFERENCED_TABLE_NAME IS NOT NULL)
         )`
    );

    const promotions = await q("SELECT COUNT(*) AS n FROM commercial_promotions");
    const bundles = await q("SELECT COUNT(*) AS n FROM commercial_feature_bundles");
    const limits = await q("SELECT COUNT(*) AS n FROM commercial_limit_profiles");
    const trials = await q("SELECT COUNT(*) AS n FROM commercial_trial_policies");
    const cycles = await q(
      "SELECT code, intervalCount, intervalUnit FROM commercial_billing_cycles ORDER BY code"
    );

    const missingExpected = await q(
      `SELECT expected.code
       FROM (
         SELECT 'basic' AS code UNION ALL SELECT 'professional' UNION ALL SELECT 'enterprise'
       ) expected
       LEFT JOIN commercial_plans cp ON cp.code = expected.code
       WHERE cp.id IS NULL`
    );

    const hiddenCount = await q(
      "SELECT SUM(isHidden) AS hidden, SUM(NOT isHidden) AS visible FROM commercial_plans"
    );

    console.log(
      JSON.stringify(
        {
          queriedAt,
          access: classify.matchesKnownProductionShape
            ? "PRODUCTION"
            : "NON_PRODUCTION_OR_UNVERIFIED",
          mutation: "NONE",
          statements: "SELECT + INFORMATION_SCHEMA only",
          providerApisCalled: "NONE",
          target: classify,
          session: session[0] ?? null,
          commercial_plans_columns: planCols,
          commercial_plans: plans,
          duplicate_codes: planDupCodes,
          duplicate_ids: planDupIds,
          missing_expected_codes: missingExpected,
          hidden_visible: hiddenCount[0] ?? null,
          commercial_prices: prices,
          commercial_prices_orphans: priceOrphans[0]?.n ?? null,
          commercial_regions: regions,
          commercial_billing_cycles: cycles,
          commercial_promotions_count: promotions[0]?.n ?? null,
          commercial_feature_bundles_count: bundles[0]?.n ?? null,
          commercial_limit_profiles_count: limits[0]?.n ?? null,
          commercial_trial_policies_count: trials[0]?.n ?? null,
          user_subscriptions_planId_shape: usShape,
          user_subscriptions_status: usStatus,
          user_subscriptions_to_live_plan: usJoin,
          user_subscriptions_orphan_planId: usOrphan[0]?.n ?? null,
          bindings_to_live_plan: bindJoin,
          bindings_planId_disagreement: bindDisagree[0]?.n ?? null,
          bindings_charged_terms: bindTerms[0] ?? null,
          bindings_legacyPlanId: bindLegacy,
          bindings_cycle_currency: bindCycleCurrency,
          subscription_plans_exists: leftover[0]?.n > 0,
          subscription_plans_ids: leftoverRows,
          subscription_plans_fks: leftoverFks,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      access: "UNAVAILABLE",
      reason: err instanceof Error ? err.message : String(err),
      mutation: "NONE",
    })
  );
  process.exit(1);
});
