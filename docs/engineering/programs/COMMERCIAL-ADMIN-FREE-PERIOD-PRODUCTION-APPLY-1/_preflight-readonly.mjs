/**
 * COMMERCIAL-ADMIN-FREE-PERIOD-PRODUCTION-APPLY-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE. Does not apply 0090.
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

function classifySql(sql) {
  return {
    creates_table: sql.includes("CREATE TABLE `commercial_subscription_concessions`"),
    creates_index: sql.includes("CREATE INDEX `commercial_concessions_sub_status_ends_idx`"),
    unique_version: sql.includes("UNIQUE(`subscriptionId`,`version`)"),
    pk: sql.includes("PRIMARY KEY(`id`)"),
    has_insert: /INSERT\s+INTO/i.test(sql),
    has_update: /^\s*UPDATE\b/im.test(sql),
    has_delete: /^\s*DELETE\b/im.test(sql),
    has_drop: /DROP\s+/i.test(sql),
    has_alter: /^\s*ALTER\b/im.test(sql),
    mentions_780001: sql.includes("780001"),
    mentions_subscription_plans: sql.includes("subscription_plans"),
    mentions_commercial_prices: sql.includes("commercial_prices"),
    mentions_chargedAmount: sql.includes("chargedAmount"),
    mentions_charged_terms: sql.includes("commercial_subscription_charged_terms"),
  };
}

async function collect(conn, hashes) {
  const q = async (text, params) => {
    const [rows] = params ? await conn.execute(text, params) : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
  const latest = await q(
    "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 1"
  );
  const n0089 = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [
    hashes.hash0089,
  ]);
  const n0090 = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [
    hashes.hash0090,
  ]);
  const tables = await q(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (
         'commercial_subscription_charged_terms',
         'commercial_subscription_concessions'
       )
     ORDER BY TABLE_NAME`
  );
  const tableNames = tables.map((row) => row.TABLE_NAME);
  let snapshotCount = null;
  if (tableNames.includes("commercial_subscription_charged_terms")) {
    snapshotCount = Number(
      (await q("SELECT COUNT(*) AS n FROM commercial_subscription_charged_terms"))[0]?.n ?? 0
    );
  }
  let concessionCount = null;
  let concessionCols = [];
  let concessionIndexes = [];
  if (tableNames.includes("commercial_subscription_concessions")) {
    concessionCount = Number(
      (await q("SELECT COUNT(*) AS n FROM commercial_subscription_concessions"))[0]?.n ?? 0
    );
    concessionCols = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_concessions'
       ORDER BY ORDINAL_POSITION`
    );
    concessionIndexes = await q(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_concessions'
       GROUP BY INDEX_NAME, NON_UNIQUE`
    );
  }
  const counts = await q(
    `SELECT
       (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
       (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
       (SELECT COUNT(*) FROM commercial_subscription_charged_terms) AS snapshots,
       (SELECT COUNT(*) FROM commercial_plans) AS plans,
       (SELECT COUNT(*) FROM commercial_prices) AS prices`
  );
  const subscriptions = await q(
    `SELECT id, status, billingCycle, planId, currentPeriodEnd
     FROM user_subscriptions ORDER BY id`
  );
  const bindings = await q(
    `SELECT subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleCode
     FROM commercial_subscription_bindings ORDER BY subscriptionId`
  );
  const row780001 = await q(
    `SELECT us.id, us.status, us.billingCycle, us.planId, us.currentPeriodEnd,
            b.id AS bindingId, b.planId AS bindingPlanId
     FROM user_subscriptions us
     LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
     WHERE us.id = 780001`
  );
  return {
    session: session[0] ?? null,
    journal_latest: latest[0] ?? null,
    count_hash_0089: Number(n0089[0]?.n ?? 0),
    count_hash_0090: Number(n0090[0]?.n ?? 0),
    snapshot_table_exists: tableNames.includes("commercial_subscription_charged_terms"),
    concession_table_exists: tableNames.includes("commercial_subscription_concessions"),
    snapshot_count: snapshotCount,
    concession_count: concessionCount,
    concession_columns: concessionCols,
    concession_indexes: concessionIndexes,
    counts: counts[0] ?? null,
    subscriptions,
    bindings,
    subscription_780001: row780001,
  };
}

async function main() {
  const label = process.argv[2] || "pre";
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = readFileSync(
    join(process.cwd(), "drizzle/0090_commercial_subscription_concessions.sql"),
    "utf8"
  );
  const hashes = {
    hash0089: hashMigrationSql("0089_commercial_charged_terms_snapshots"),
    hash0090: hashMigrationSql("0090_commercial_subscription_concessions"),
  };
  const sqlIntegrity = { ...hashes, ...classifySql(sql) };
  const target = auditConnectionTarget(url);
  const classify = classifyHost(target);
  const conn = await createAuditReadonlyConnection(url);
  try {
    const data = await collect(conn, hashes);
    const evidence = {
      program: "COMMERCIAL-ADMIN-FREE-PERIOD-PRODUCTION-APPLY-1",
      label,
      queriedAt: new Date().toISOString(),
      mutation: "NONE",
      access: classify.matchesKnownProductionShape ? "PRODUCTION" : "NON_PRODUCTION_OR_UNVERIFIED",
      target: classify,
      sqlIntegrity,
      ...data,
    };
    const file =
      label === "after" ? "_POST-APPLY.json" : "_PRE-APPLY.json";
    writeFileSync(join(dirname(fileURLToPath(import.meta.url)), file), `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify(evidence, null, 2));
    if (label !== "after") {
      if (evidence.access !== "PRODUCTION") {
        console.error("STOP: Production target not verified");
        process.exit(3);
      }
      if (evidence.session?.db !== "mineuqr") {
        console.error("STOP: DATABASE() is not mineuqr");
        process.exit(3);
      }
      if (evidence.journal_latest?.hash !== hashes.hash0089) {
        console.error("STOP: journal terminus is not 0089");
        process.exit(3);
      }
      if (evidence.count_hash_0090 !== 0 || evidence.concession_table_exists) {
        console.error("STOP: 0090 already applied");
        process.exit(3);
      }
      if (
        !sqlIntegrity.creates_table ||
        !sqlIntegrity.creates_index ||
        !sqlIntegrity.unique_version ||
        sqlIntegrity.has_insert ||
        sqlIntegrity.has_update ||
        sqlIntegrity.has_delete ||
        sqlIntegrity.has_drop ||
        sqlIntegrity.has_alter
      ) {
        console.error("STOP: 0090 SQL integrity failed");
        process.exit(3);
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: "NONE", reason: String(err) }));
  process.exit(1);
});
