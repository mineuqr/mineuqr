/**
 * COMMERCIAL-ADMIN-SUBSCRIPTION-CHARGED-TERMS-INTEGRITY-1
 * SELECT + INFORMATION_SCHEMA only. No PII (no email/name).
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
    console.log(JSON.stringify({ queriedAt, access: "UNAVAILABLE", mutation: "NONE" }));
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
      "SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts"
    );

    const sub780001 = await q(
      `SELECT us.id, us.userId, us.restaurantId, us.planId, us.status, us.billingCycle,
              us.currentPeriodStart, us.currentPeriodEnd, us.trialEndsAt, us.canceledAt,
              us.stripeSubscriptionId, us.stripeCustomerId, us.createdAt, us.updatedAt,
              cp.code AS planCode, cp.name AS planName,
              u.role, u.accountClassification
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId
       LEFT JOIN users u ON u.id = us.userId
       WHERE us.id = 780001`
    );

    const bind780001 = await q(
      `SELECT id, subscriptionId, planId, legacyPlanId, chargedAmount, chargedCurrency,
              billingCycleId, billingCycleCode, createdAt, updatedAt
       FROM commercial_subscription_bindings WHERE subscriptionId = 780001`
    );

    const audit780001 = await q(
      `SELECT id, eventType, category, occurredAt, actorId, actorRole, targetType, targetId, \`procedure\`,
              \`after\`, metadata
       FROM audit_events
       WHERE targetId = 780001
          OR CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.subscriptionId')) AS UNSIGNED) = 780001
          OR CAST(JSON_UNQUOTE(JSON_EXTRACT(\`after\`, '$.subscriptionId')) AS UNSIGNED) = 780001
       ORDER BY id`
    );

    const auditForUser = await q(
      `SELECT id, eventType, category, occurredAt, actorId, targetType, targetId, \`procedure\`
       FROM audit_events
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.targetUserId')) AS UNSIGNED) = 21630002
          OR (targetType = 'subscription' AND targetId IN (
            SELECT id FROM user_subscriptions WHERE userId = 21630002
          ))
       ORDER BY id`
    );

    const subscriptionColumns = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions'
       ORDER BY ORDINAL_POSITION`
    );

    const bindingColumns = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_bindings'
       ORDER BY ORDINAL_POSITION`
    );

    const enterprisePrices = await q(
      `SELECT p.amount, p.currency, bc.code AS cycle, p.regionId IS NOT NULL AS regional
       FROM commercial_prices p
       JOIN commercial_plans cp ON cp.id = p.planId
       JOIN commercial_billing_cycles bc ON bc.id = p.billingCycleId
       WHERE cp.code = 'enterprise'
       ORDER BY cycle, regional`
    );

    const allSubs = await q(
      `SELECT us.id, us.userId, us.restaurantId, us.planId, us.status, us.billingCycle,
              us.currentPeriodStart, us.currentPeriodEnd, us.createdAt, us.updatedAt,
              cp.code AS planCode,
              u.role, u.accountClassification,
              b.id AS bindingId, b.chargedAmount, b.chargedCurrency, b.billingCycleCode,
              (SELECT COUNT(*) FROM restaurants r WHERE r.userId = us.userId) AS restaurant_n
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId
       LEFT JOIN users u ON u.id = us.userId
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       ORDER BY us.userId, us.id`
    );

    const subCreatedAudits = await q(
      `SELECT id, eventType, occurredAt, actorId, targetId, \`procedure\`,
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.targetUserId')) AS targetUserId,
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.plan')) AS plan,
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.status')) AS status,
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.startDate')) AS startDate,
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.endDate')) AS endDate,
              \`before\`, \`after\`, metadata
       FROM audit_events
       WHERE eventType IN ('subscription_created_by_admin', 'subscription_updated_by_admin')
       ORDER BY id`
    );

    const evidence = {
      queriedAt,
      access: classify.matchesKnownProductionShape ? "PRODUCTION" : "NON_PRODUCTION_OR_UNVERIFIED",
      mutation: "NONE",
      target: classify,
      session: session[0] ?? null,
      user_subscriptions_columns: subscriptionColumns,
      commercial_subscription_bindings_columns: bindingColumns,
      subscription_780001: sub780001[0] ?? null,
      bindings_780001: bind780001,
      audit_events_780001: audit780001,
      audit_events_user_21630002: auditForUser,
      enterprise_catalog_prices: enterprisePrices,
      all_subscriptions: allSubs,
      admin_subscription_audit_events: subCreatedAudits,
    };
    const json = JSON.stringify(evidence, null, 2);
    const outPath = join(dirname(fileURLToPath(import.meta.url)), "_QUERY-EVIDENCE.json");
    writeFileSync(outPath, `${json}\n`);
    console.log(json);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ access: "UNAVAILABLE", reason: String(err), mutation: "NONE" }));
  process.exit(1);
});
