/**
 * COMMERCIAL-OD-5-PRODUCTION-PLAN-IDENTITY-PROOF-1
 * READ-ONLY production identity proof. SELECT + INFORMATION_SCHEMA only.
 * Does not print DATABASE_URL, credentials, PII, or connection strings.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const BRIDGE = [
  { legacyPlanId: 30001, catalogPlanCode: "basic", catalogPlanKey: "BASIC" },
  { legacyPlanId: 30002, catalogPlanCode: "professional", catalogPlanKey: "PROFESSIONAL" },
  { legacyPlanId: 30003, catalogPlanCode: "enterprise", catalogPlanKey: "ENTERPRISE" },
];

const PLAN_ID_TO_CATALOG_PLAN = {
  30001: "BASIC",
  30002: "PROFESSIONAL",
  30003: "ENTERPRISE",
};

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
  const url = process.env.DATABASE_URL;
  if (!url) {
    const blocked = {
      queriedAt: new Date().toISOString(),
      access: "BLOCKED",
      reason: "DATABASE_URL_MISSING",
      statements: "NONE",
    };
    writeFileSync(join(HERE, "_QUERY-EVIDENCE.json"), JSON.stringify(blocked, null, 2));
    console.log("PRODUCTION ACCESS BLOCKED: DATABASE_URL missing");
    process.exit(2);
  }

  const target = auditConnectionTarget(url);
  const access = classifyHost(target);
  if (access.hostKind !== "tidb_cloud" || access.database !== "mineuqr") {
    const blocked = {
      queriedAt: new Date().toISOString(),
      access: "BLOCKED",
      reason: "NOT_VERIFIED_PRODUCTION",
      hostKind: access.hostKind,
      hostPattern: access.hostPattern,
      database: access.database,
      statements: "NONE",
    };
    writeFileSync(join(HERE, "_QUERY-EVIDENCE.json"), JSON.stringify(blocked, null, 2));
    console.log("PRODUCTION ACCESS BLOCKED: not verified production TiDB mineuqr");
    process.exit(2);
  }

  const conn = await createAuditReadonlyConnection(url);
  try {
    const nowRow = await q(conn, `SELECT UTC_TIMESTAMP() AS utcNow, DATABASE() AS dbName`);
    const planIdCol = await q(
      conn,
      `SELECT IS_NULLABLE, COLUMN_TYPE, COLUMN_KEY
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_subscriptions'
         AND COLUMN_NAME = 'planId'`
    );
    const planCodeIndex = await q(
      conn,
      `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'commercial_plans'
         AND COLUMN_NAME = 'code'`
    );
    const planIdIndex = await q(
      conn,
      `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'commercial_plans'
         AND COLUMN_NAME = 'id'`
    );

    const planIdPopulation = await q(
      conn,
      `SELECT
         planId,
         COUNT(*) AS rowCount,
         SUM(status = 'active') AS activeCount,
         SUM(status = 'trial') AS trialCount,
         SUM(status = 'canceled') AS canceledCount,
         SUM(status = 'expired') AS expiredCount,
         SUM(currentPeriodEnd IS NOT NULL AND currentPeriodEnd < UTC_TIMESTAMP()) AS periodEndedCount,
         SUM(stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId <> '') AS stripeSubCount
       FROM user_subscriptions
       GROUP BY planId
       ORDER BY planId`
    );

    const statusTotals = await q(
      conn,
      `SELECT status, COUNT(*) AS rowCount FROM user_subscriptions GROUP BY status`
    );

    const invalidPlanIds = await q(
      conn,
      `SELECT
         SUM(planId IS NULL) AS nullCount,
         SUM(planId = 0) AS zeroCount,
         SUM(planId < 0) AS negativeCount
       FROM user_subscriptions`
    );

    const unexpectedPlanIds = planIdPopulation.filter(
      (r) => !BRIDGE.some((b) => b.legacyPlanId === Number(r.planId))
    );

    const classification = await q(
      conn,
      `SELECT
         us.planId,
         us.status,
         u.accountClassification,
         u.role,
         CASE
           WHEN u.openId LIKE 'local\\_%' THEN 'local_openid_prefix'
           ELSE 'non_local_openid_prefix'
         END AS identityKind,
         COUNT(*) AS rowCount
       FROM user_subscriptions us
       INNER JOIN users u ON u.id = us.userId
       GROUP BY us.planId, us.status, u.accountClassification, u.role, identityKind`
    );

    const livePlans = await q(
      conn,
      `SELECT id, code, name, isHidden
       FROM commercial_plans
       ORDER BY code, id`
    );

    const duplicateCodes = await q(
      conn,
      `SELECT code, COUNT(*) AS rowCount
       FROM commercial_plans
       GROUP BY code
       HAVING COUNT(*) > 1`
    );

    const nullCodes = await q(
      conn,
      `SELECT COUNT(*) AS rowCount FROM commercial_plans WHERE code IS NULL OR code = ''`
    );

    const bindingsByPair = await q(
      conn,
      `SELECT
         legacyPlanId,
         planId AS bindingPlanId,
         COUNT(*) AS rowCount,
         SUM(chargedAmount IS NOT NULL) AS chargedAmountPresent,
         SUM(chargedCurrency IS NOT NULL AND chargedCurrency <> '') AS chargedCurrencyPresent,
         SUM(billingCycleCode IS NOT NULL AND billingCycleCode <> '') AS billingCyclePresent
       FROM commercial_subscription_bindings
       GROUP BY legacyPlanId, planId`
    );

    const bindingTotals = await q(
      conn,
      `SELECT COUNT(*) AS bindingCount FROM commercial_subscription_bindings`
    );

    const unbound = await q(
      conn,
      `SELECT
         us.planId,
         us.status,
         COUNT(*) AS rowCount
       FROM user_subscriptions us
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE b.id IS NULL
       GROUP BY us.planId, us.status`
    );

    const bound = await q(
      conn,
      `SELECT COUNT(*) AS rowCount
       FROM user_subscriptions us
       INNER JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id`
    );

    const invoiceStatus = await q(
      conn,
      `SELECT status, COUNT(*) AS rowCount FROM invoices GROUP BY status`
    );

    const paidInvoices = await q(
      conn,
      `SELECT COUNT(*) AS rowCount FROM invoices WHERE status = 'paid'`
    );

    const mapping = [];
    const anomalies = [];

    for (const row of planIdPopulation) {
      const integerId = Number(row.planId);
      const bridge = BRIDGE.find((b) => b.legacyPlanId === integerId) ?? null;
      const mapKey = PLAN_ID_TO_CATALOG_PLAN[integerId] ?? null;
      const catalogMatches = bridge
        ? livePlans.filter((p) => String(p.code).toLowerCase() === bridge.catalogPlanCode)
        : [];
      const result = {
        productionInteger: integerId,
        rowCount: Number(row.rowCount),
        statuses: {
          active: Number(row.activeCount),
          trial: Number(row.trialCount),
          canceled: Number(row.canceledCount),
          expired: Number(row.expiredCount),
        },
        bridgeCode: bridge?.catalogPlanCode ?? null,
        mappingKey: mapKey,
        mappingAgreesWithBridge:
          bridge != null && mapKey != null && mapKey === bridge.catalogPlanKey,
        catalogRowCount: catalogMatches.length,
        catalogUuid: catalogMatches.length === 1 ? catalogMatches[0].id : null,
        catalogHidden:
          catalogMatches.length === 1 ? Boolean(catalogMatches[0].isHidden) : null,
        result: "UNKNOWN",
      };
      if (!bridge) {
        result.result = "UNMAPPED";
        anomalies.push({ kind: "unmapped_integer", planId: integerId });
      } else if (!result.mappingAgreesWithBridge) {
        result.result = "BRIDGE_MAP_CONFLICT";
        anomalies.push({ kind: "bridge_map_conflict", planId: integerId });
      } else if (catalogMatches.length === 0) {
        result.result = "MISSING_LIVE_PLAN";
        anomalies.push({ kind: "missing_live_plan", code: bridge.catalogPlanCode });
      } else if (catalogMatches.length > 1) {
        result.result = "DUPLICATE_LIVE_PLAN_CODE";
        anomalies.push({ kind: "duplicate_code", code: bridge.catalogPlanCode });
      } else {
        result.result = "DETERMINISTIC";
      }
      mapping.push(result);
    }

    const bindingAgreement = [];
    for (const b of bindingsByPair) {
      const integerId = b.legacyPlanId == null ? null : Number(b.legacyPlanId);
      const bridge = integerId == null ? null : BRIDGE.find((x) => x.legacyPlanId === integerId);
      const expected = bridge
        ? livePlans.filter((p) => String(p.code).toLowerCase() === bridge.catalogPlanCode)
        : [];
      const expectedUuid = expected.length === 1 ? expected[0].id : null;
      const agrees = expectedUuid != null && expectedUuid === b.bindingPlanId;
      const item = {
        legacyPlanId: integerId,
        bindingUuid: b.bindingPlanId,
        expectedUuid,
        rowCount: Number(b.rowCount),
        chargedAmountPresent: Number(b.chargedAmountPresent),
        agrees,
      };
      if (!agrees) {
        anomalies.push({ kind: "binding_mismatch", legacyPlanId: integerId });
      }
      bindingAgreement.push(item);
    }

    const evidence = {
      queriedAt: new Date().toISOString(),
      utcNow: nowRow[0]?.utcNow ?? null,
      databaseConfirmed: nowRow[0]?.dbName ?? null,
      access,
      statements: "SELECT_AND_INFORMATION_SCHEMA_ONLY",
      mutation: "NONE",
      schema: {
        userSubscriptionsPlanId: planIdCol[0] ?? null,
        commercialPlansCodeIndex: planCodeIndex,
        commercialPlansIdIndex: planIdIndex,
      },
      population: {
        planIdPopulation,
        statusTotals,
        invalidPlanIds: invalidPlanIds[0] ?? null,
        unexpectedPlanIds,
        classification,
      },
      livePlans: livePlans.map((p) => ({
        id: p.id,
        code: p.code,
        isHidden: Boolean(p.isHidden),
      })),
      duplicateCodes,
      nullCodes: nullCodes[0] ?? null,
      bindings: {
        total: Number(bindingTotals[0]?.bindingCount ?? 0),
        boundSubscriptions: Number(bound[0]?.rowCount ?? 0),
        byPair: bindingsByPair,
        agreement: bindingAgreement,
      },
      unbound,
      invoices: {
        byStatus: invoiceStatus,
        paidCount: Number(paidInvoices[0]?.rowCount ?? 0),
      },
      mapping,
      anomalies,
    };

    writeFileSync(join(HERE, "_QUERY-EVIDENCE.json"), JSON.stringify(evidence, null, 2));
    console.log(
      JSON.stringify(
        {
          access: "OK",
          hostPattern: access.hostPattern,
          database: access.database,
          queriedAt: evidence.queriedAt,
          distinctPlanIds: planIdPopulation.map((r) => r.planId),
          subscriptionRows: planIdPopulation.reduce((n, r) => n + Number(r.rowCount), 0),
          livePlanCount: livePlans.length,
          bindingCount: evidence.bindings.total,
          paidInvoices: evidence.invoices.paidCount,
          anomalyCount: anomalies.length,
          mappingResults: mapping.map((m) => ({
            integer: m.productionInteger,
            result: m.result,
          })),
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
  console.error("QUERY FAILED:", err?.code ?? "ERROR");
  process.exit(1);
});
