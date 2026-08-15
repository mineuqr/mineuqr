/**
 * COMMERCIAL-CHARGED-TERMS-SNAPSHOT-PRODUCTION-APPLY-1
 * Read-only preflight for EMPTY 0089. Mutation NONE. No credentials/PII.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";
import { hashMigrationSql } from "../../../../scripts/lib/migration-governance-lib.cjs";

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
  const sqlPath = join(process.cwd(), "drizzle/0089_commercial_charged_terms_snapshots.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const sqlIntegrity = {
    hash0089: hashMigrationSql("0089_commercial_charged_terms_snapshots"),
    hash0088: hashMigrationSql("0088_user_subscriptions_live_plan_identity"),
    creates_table: /CREATE TABLE `commercial_subscription_charged_terms`/.test(sql),
    creates_index: /CREATE INDEX `commercial_charged_terms_sub_effective_idx`/.test(sql),
    unique_version: /UNIQUE\(`subscriptionId`,`version`\)/.test(sql),
    has_insert: /INSERT\s+INTO/i.test(sql),
    has_update: /^\s*UPDATE\b/im.test(sql),
    has_delete: /^\s*DELETE\b/im.test(sql),
    has_drop: /DROP\s+(TABLE|COLUMN)/i.test(sql),
    has_alter: /^\s*ALTER\b/im.test(sql),
    copies_bindings: /FROM\s+`commercial_subscription_bindings`/i.test(sql),
    mentions_780001: sql.includes("780001"),
  };

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(JSON.stringify({ queriedAt, access: "UNAVAILABLE", mutation: "NONE" }));
    process.exit(2);
  }
  const classify = classifyHost(auditConnectionTarget(url));
  const conn = await createAuditReadonlyConnection(url);
  const q = async (text, params) => {
    const [rows] = params ? await conn.execute(text, params) : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  try {
    const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
    const latest = await q(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 1"
    );
    const count0088 = await q(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?",
      [sqlIntegrity.hash0088]
    );
    const count0089 = await q(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?",
      [sqlIntegrity.hash0089]
    );
    const snapshotTable = await q(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_charged_terms'`
    );
    const planIdCol = await q(
      `SELECT DATA_TYPE, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions' AND COLUMN_NAME = 'planId'`
    );
    const counts = await q(
      `SELECT
         (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
         (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
         (SELECT COUNT(*) FROM commercial_plans) AS plans,
         (SELECT COUNT(*) FROM commercial_prices) AS prices`
    );
    const uuidIntegrity = await q(
      `SELECT
         SUM(us.planId REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') AS uuid_ok,
         SUM(cp.id IS NULL) AS unknown_live_plan,
         COUNT(*) AS n
       FROM user_subscriptions us
       LEFT JOIN commercial_plans cp ON cp.id = us.planId`
    );
    const row780001 = await q(
      `SELECT us.id, us.status, us.billingCycle, us.planId, b.id AS bindingId
       FROM user_subscriptions us
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE us.id = 780001`
    );
    const evidence = {
      queriedAt,
      access: classify.matchesKnownProductionShape ? "PRODUCTION" : "NON_PRODUCTION_OR_UNVERIFIED",
      mutation: "NONE",
      target: classify,
      session: session[0] ?? null,
      sqlIntegrity,
      journal_latest: latest[0] ?? null,
      count_hash_0088: Number(count0088[0]?.n ?? 0),
      count_hash_0089: Number(count0089[0]?.n ?? 0),
      snapshot_table_exists: snapshotTable.length > 0,
      planId_column: planIdCol[0] ?? null,
      counts: counts[0] ?? null,
      uuid_integrity: uuidIntegrity[0] ?? null,
      subscription_780001: row780001,
    };
    writeFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "_EMPTY-0089-PREFLIGHT.json"),
      `${JSON.stringify(evidence, null, 2)}\n`
    );
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ access: "UNAVAILABLE", reason: String(err), mutation: "NONE" }));
  process.exit(1);
});
