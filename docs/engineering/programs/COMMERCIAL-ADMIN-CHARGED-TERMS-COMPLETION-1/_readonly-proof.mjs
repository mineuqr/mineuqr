/**
 * COMMERCIAL-ADMIN-CHARGED-TERMS-COMPLETION-1
 * SELECT only. Confirm 780001 absent. No PII.
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
    const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
    const gone780001 = await q("SELECT id FROM user_subscriptions WHERE id = 780001");
    const allSubs = await q(
      `SELECT us.id, us.userId, us.restaurantId, us.planId, us.status, us.billingCycle,
              us.currentPeriodStart, us.currentPeriodEnd, us.createdAt,
              cp.code AS planCode, u.accountClassification,
              b.id AS bindingId, b.chargedAmount, b.chargedCurrency, b.billingCycleCode
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId
       LEFT JOIN users u ON u.id = us.userId
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       ORDER BY us.id`
    );
    const bindings = await q(
      `SELECT subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleCode, legacyPlanId
       FROM commercial_subscription_bindings ORDER BY subscriptionId`
    );
    const evidence = {
      queriedAt,
      access: classify.matchesKnownProductionShape ? "PRODUCTION" : "NON_PRODUCTION_OR_UNVERIFIED",
      mutation: "NONE",
      target: classify,
      session: session[0] ?? null,
      subscription_780001_present: gone780001.length > 0,
      all_subscriptions: allSubs,
      bindings,
    };
    const json = JSON.stringify(evidence, null, 2);
    writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "_QUERY-EVIDENCE.json"), `${json}\n`);
    console.log(json);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ access: "UNAVAILABLE", reason: String(err), mutation: "NONE" }));
  process.exit(1);
});
