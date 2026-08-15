/**
 * COMMERCIAL-CHARGED-TERMS-SNAPSHOT-VERSIONING-1
 * SELECT only. Mutation NONE. No PII.
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
    const tableExists = await q(
      `SELECT COUNT(*) AS n
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'commercial_subscription_charged_terms'`
    );
    const counts = await q(
      `SELECT
         (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
         (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings`
    );
    const snapshotCount =
      Number(tableExists[0]?.n ?? 0) > 0
        ? await q(`SELECT COUNT(*) AS n FROM commercial_subscription_charged_terms`)
        : [{ n: 0 }];
    const completeBindings = await q(
      `SELECT subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleCode
       FROM commercial_subscription_bindings
       WHERE chargedAmount IS NOT NULL
         AND chargedCurrency IS NOT NULL
         AND chargedCurrency <> ''
         AND billingCycleCode IS NOT NULL
         AND billingCycleCode <> ''
         AND planId IS NOT NULL
         AND planId <> ''
       ORDER BY subscriptionId`
    );
    const unbound = await q(
      `SELECT us.id, us.status, us.billingCycle, us.planId
       FROM user_subscriptions us
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE b.id IS NULL
       ORDER BY us.id`
    );
    const duplicateBindings = await q(
      `SELECT subscriptionId, COUNT(*) AS n
       FROM commercial_subscription_bindings
       GROUP BY subscriptionId
       HAVING n > 1`
    );
    const evidence = {
      queriedAt,
      access: classify.matchesKnownProductionShape
        ? "PRODUCTION"
        : "NON_PRODUCTION_OR_UNVERIFIED",
      mutation: "NONE",
      target: classify,
      session: session[0] ?? null,
      snapshot_table_exists: Number(tableExists[0]?.n ?? 0) > 0,
      counts: {
        subscriptions: counts[0]?.subscriptions ?? null,
        bindings: counts[0]?.bindings ?? null,
        snapshots: snapshotCount[0]?.n ?? 0,
      },
      complete_bindings_would_copy_under_0089: completeBindings,
      unbound_subscriptions: unbound,
      duplicate_bindings: duplicateBindings,
      note: "0089 not applied in this program. Unbound rows are not inferred.",
    };
    const json = JSON.stringify(evidence, null, 2);
    writeFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "_QUERY-EVIDENCE.json"),
      `${json}\n`
    );
    console.log(json);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({ access: "UNAVAILABLE", reason: String(err), mutation: "NONE" })
  );
  process.exit(1);
});
