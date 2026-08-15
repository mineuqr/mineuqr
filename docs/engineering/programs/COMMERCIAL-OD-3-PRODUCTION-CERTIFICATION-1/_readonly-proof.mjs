/**
 * COMMERCIAL-OD-3-PRODUCTION-CERTIFICATION-1
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
    const tables = await q(
      `SELECT TABLE_NAME, TABLE_ROWS, TABLE_TYPE
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'subscription_plans',
           'user_subscriptions',
           'commercial_plans',
           'commercial_subscription_bindings'
         )
       ORDER BY TABLE_NAME`
    );
    const planIdCol = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_subscriptions'
         AND COLUMN_NAME = 'planId'`
    );
    const bindingCols = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'commercial_subscription_bindings'
         AND COLUMN_NAME IN ('planId', 'legacyPlanId', 'chargedAmount', 'chargedCurrency', 'billingCycleCode')
       ORDER BY COLUMN_NAME`
    );
    const fks = await q(
      `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND (
           REFERENCED_TABLE_NAME = 'subscription_plans'
           OR (TABLE_NAME = 'subscription_plans' AND REFERENCED_TABLE_NAME IS NOT NULL)
         )`
    );
    const spExists = tables.some((t) => t.TABLE_NAME === "subscription_plans");
    const spCount = spExists
      ? (await q("SELECT COUNT(*) AS n FROM subscription_plans"))[0]
      : { n: null };
    const spIds = spExists
      ? await q("SELECT id, isActive FROM subscription_plans ORDER BY id")
      : [];
    const usCount = (await q("SELECT COUNT(*) AS n FROM user_subscriptions"))[0];
    const usNull = (
      await q("SELECT SUM(planId IS NULL) AS n FROM user_subscriptions")
    )[0];
    const usPlanShape = await q(
      `SELECT
         CASE
           WHEN planId REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 'uuid'
           WHEN planId REGEXP '^[0-9]+$' THEN 'digit_string'
           ELSE 'other'
         END AS kind,
         COUNT(*) AS n
       FROM user_subscriptions
       GROUP BY kind`
    );
    const usStrictUuid = await q(
      `SELECT
         SUM(planId REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') AS valid_live_uuid,
         SUM(planId IS NOT NULL AND planId NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') AS invalid_uuid,
         COUNT(DISTINCT planId) AS distinct_plan_id
       FROM user_subscriptions`
    );
    const usOrphan = await q(
      `SELECT us.planId, COUNT(*) AS n
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId
       WHERE cp.id IS NULL
       GROUP BY us.planId`
    );
    const usJoin = await q(
      `SELECT cp.id AS live_plan_uuid, cp.code, COUNT(*) AS n
       FROM user_subscriptions us
       INNER JOIN commercial_plans cp ON cp.id = us.planId
       GROUP BY cp.id, cp.code
       ORDER BY n DESC`
    );
    const usAmbiguous = await q(
      `SELECT us.planId, COUNT(DISTINCT cp.id) AS live_plan_count
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId
       GROUP BY us.planId
       HAVING live_plan_count > 1`
    );
    const usStatus = await q(
      "SELECT status, COUNT(*) AS n FROM user_subscriptions GROUP BY status"
    );
    const bindCount = (
      await q("SELECT COUNT(*) AS n FROM commercial_subscription_bindings")
    )[0];
    const bindLegacy = await q(
      `SELECT
         CASE WHEN legacyPlanId IS NULL THEN 'null' ELSE CAST(legacyPlanId AS CHAR) END AS legacy,
         COUNT(*) AS n
       FROM commercial_subscription_bindings
       GROUP BY legacy`
    );
    const bindPlanShape = await q(
      `SELECT
         CASE
           WHEN planId REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 'uuid'
           ELSE 'other'
         END AS kind,
         COUNT(*) AS n
       FROM commercial_subscription_bindings
       GROUP BY kind`
    );
    const bindDisagree = (
      await q(
        `SELECT COUNT(*) AS n
         FROM commercial_subscription_bindings b
         JOIN user_subscriptions us ON us.id = b.subscriptionId
         WHERE b.planId <> us.planId`
      )
    )[0];
    const bindOrphan = (
      await q(
        `SELECT COUNT(*) AS n
         FROM commercial_subscription_bindings b
         LEFT JOIN commercial_plans cp ON cp.id = b.planId
         WHERE cp.id IS NULL`
      )
    )[0];
    const chargedTerms = await q(
      `SELECT
         SUM(chargedAmount IS NOT NULL AND chargedCurrency IS NOT NULL AND billingCycleCode IS NOT NULL) AS complete,
         SUM(chargedAmount IS NULL OR chargedCurrency IS NULL OR billingCycleCode IS NULL) AS incomplete,
         COUNT(*) AS n
       FROM commercial_subscription_bindings`
    );
    const chargedTermsShape = await q(
      `SELECT chargedCurrency, billingCycleCode, COUNT(*) AS n
       FROM commercial_subscription_bindings
       GROUP BY chargedCurrency, billingCycleCode`
    );
    const journal = await q(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 3"
    );
    const cpCount = (await q("SELECT COUNT(*) AS n FROM commercial_plans"))[0];
    const cpCodes = await q(
      "SELECT id, code FROM commercial_plans ORDER BY code"
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
          target: classify,
          session: session[0] ?? null,
          tables,
          user_subscriptions_planId_column: planIdCol,
          binding_columns: bindingCols,
          foreign_keys_involving_subscription_plans: fks,
          subscription_plans_row_count: spCount.n,
          subscription_plans_ids: spIds,
          user_subscriptions_row_count: usCount.n,
          user_subscriptions_planId_null: usNull.n,
          user_subscriptions_planId_shape: usPlanShape,
          user_subscriptions_uuid_proof: usStrictUuid[0] ?? null,
          user_subscriptions_orphan_uuids: usOrphan,
          user_subscriptions_uuid_to_live_plan: usJoin,
          user_subscriptions_ambiguous_identity: usAmbiguous,
          user_subscriptions_status: usStatus,
          bindings_row_count: bindCount.n,
          bindings_legacyPlanId: bindLegacy,
          bindings_planId_shape: bindPlanShape,
          bindings_planId_disagreement_with_subscription: bindDisagree.n,
          bindings_orphan_planId: bindOrphan.n,
          charged_terms_completeness: chargedTerms[0] ?? null,
          charged_terms_shape: chargedTermsShape,
          commercial_plans_row_count: cpCount.n,
          commercial_plans_id_code: cpCodes,
          journal_latest: journal,
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
