/**
 * COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1
 * SELECT + INFORMATION_SCHEMA only. No DDL/DML. No migrations.
 * Does not print credentials, connection strings, customer PII,
 * or provider payload bodies.
 *
 * Purpose: determine whether Production retains webhook/event payloads
 * that could contain integer planId, and whether any in-app retry queue
 * could replay such payloads.
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

    const webhookishTables = await q(
      `SELECT TABLE_NAME, TABLE_ROWS, TABLE_TYPE
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND (
           TABLE_NAME LIKE '%webhook%'
           OR TABLE_NAME LIKE '%paypal%'
           OR TABLE_NAME LIKE '%tap%'
           OR TABLE_NAME LIKE '%payload%'
           OR TABLE_NAME LIKE '%inbox%'
           OR TABLE_NAME LIKE '%ops_log%'
           OR TABLE_NAME LIKE '%ops_event%'
           OR TABLE_NAME LIKE '%provider_event%'
           OR TABLE_NAME LIKE '%payment_event%'
           OR TABLE_NAME LIKE '%checkout%'
         )
       ORDER BY TABLE_NAME`
    );

    const webhookishColumns = await q(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND (
           COLUMN_NAME LIKE '%webhook%'
           OR COLUMN_NAME LIKE '%custom_id%'
           OR COLUMN_NAME LIKE '%customId%'
           OR COLUMN_NAME LIKE '%plan_id%'
           OR COLUMN_NAME LIKE '%payload%'
           OR COLUMN_NAME LIKE '%providerEvent%'
         )
       ORDER BY TABLE_NAME, COLUMN_NAME`
    );

    const knownTables = await q(
      `SELECT TABLE_NAME, TABLE_ROWS
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'audit_events',
           'user_subscriptions',
           'commercial_subscription_bindings',
           'invoices',
           'order_domain_outbox',
           'renewal_notifications'
         )
       ORDER BY TABLE_NAME`
    );

    const tableNames = new Set(knownTables.map((t) => t.TABLE_NAME));

    const usProviderIdPresence = tableNames.has("user_subscriptions")
      ? (
          await q(
            `SELECT
               COUNT(*) AS n,
               SUM(stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '') AS with_provider_txn_id,
               SUM(stripeSubscriptionId IS NULL OR stripeSubscriptionId = '') AS without_provider_txn_id
             FROM user_subscriptions`
          )
        )[0]
      : null;

    const usPlanShape = tableNames.has("user_subscriptions")
      ? await q(
          `SELECT
             CASE
               WHEN planId REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 'uuid'
               WHEN planId REGEXP '^[0-9]+$' THEN 'digit_string'
               ELSE 'other'
             END AS kind,
             COUNT(*) AS n
           FROM user_subscriptions
           GROUP BY kind`
        )
      : [];

    const usStatus = tableNames.has("user_subscriptions")
      ? await q(
          "SELECT status, COUNT(*) AS n FROM user_subscriptions GROUP BY status"
        )
      : [];

    const invoiceStatus = tableNames.has("invoices")
      ? await q("SELECT status, COUNT(*) AS n FROM invoices GROUP BY status")
      : [];

    const bindLegacy = tableNames.has("commercial_subscription_bindings")
      ? await q(
          `SELECT
             CASE WHEN legacyPlanId IS NULL THEN 'null' ELSE 'non_null' END AS legacy,
             COUNT(*) AS n
           FROM commercial_subscription_bindings
           GROUP BY legacy`
        )
      : [];

    const auditCategory = tableNames.has("audit_events")
      ? await q(
          "SELECT category, COUNT(*) AS n FROM audit_events GROUP BY category"
        )
      : [];

    const auditWebhookish = tableNames.has("audit_events")
      ? (
          await q(
            `SELECT
               COUNT(*) AS n,
               SUM(eventType LIKE '%webhook%' OR eventType LIKE '%paypal%' OR eventType LIKE '%tap%') AS webhookish_event_type,
               SUM(JSON_EXTRACT(metadata, '$.planId') IS NOT NULL) AS metadata_planId,
               SUM(JSON_EXTRACT(metadata, '$.plan_id') IS NOT NULL) AS metadata_plan_id,
               SUM(JSON_EXTRACT(metadata, '$.custom_id') IS NOT NULL) AS metadata_custom_id,
               SUM(JSON_EXTRACT(metadata, '$.provider') IS NOT NULL) AS metadata_provider
             FROM audit_events`
          )
        )[0]
      : null;

    const outboxStatus = tableNames.has("order_domain_outbox")
      ? await q(
          `SELECT status, COUNT(*) AS n
           FROM order_domain_outbox
           GROUP BY status`
        )
      : [];

    const outboxEventTypes = tableNames.has("order_domain_outbox")
      ? await q(
          `SELECT eventType, COUNT(*) AS n
           FROM order_domain_outbox
           GROUP BY eventType
           ORDER BY n DESC`
        )
      : [];

    const renewalStatus = tableNames.has("renewal_notifications")
      ? (
          await q("SELECT COUNT(*) AS n FROM renewal_notifications")
        )[0]
      : null;

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
          webhook_payload_tables: webhookishTables,
          webhook_payload_columns: webhookishColumns,
          known_related_tables: knownTables,
          user_subscriptions_provider_txn_id_presence: usProviderIdPresence,
          user_subscriptions_planId_shape: usPlanShape,
          user_subscriptions_status: usStatus,
          invoices_status: invoiceStatus,
          bindings_legacyPlanId_nullness: bindLegacy,
          audit_events_by_category: auditCategory,
          audit_events_webhook_payload_signals: auditWebhookish,
          order_domain_outbox_status: outboxStatus,
          order_domain_outbox_event_types: outboxEventTypes,
          renewal_notifications_count: renewalStatus,
          classification_notes: {
            stored_provider_webhook_bodies: webhookishTables.length === 0 ? "NONE_FOUND" : "TABLES_NAMED_WEBHOOKISH",
            in_app_webhook_retry_queue: "NOT_FOUND_IN_SCHEMA",
            integer_webhook_traffic: "UNKNOWN_NO_PAYLOAD_STORE",
          },
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
