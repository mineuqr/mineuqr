/**
 * Read-only baseline fingerprint for empty 0089 apply.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
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

async function main() {
  const label = process.argv[2] || "baseline";
  const url = process.env.DATABASE_URL;
  const hash0088 = hashMigrationSql("0088_user_subscriptions_live_plan_identity");
  const hash0089 = hashMigrationSql("0089_commercial_charged_terms_snapshots");
  const conn = await createAuditReadonlyConnection(url);
  const q = async (text, params) => {
    const [rows] = params ? await conn.execute(text, params) : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  try {
    const target = auditConnectionTarget(url);
    const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
    const latest = await q(
      "SELECT hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 1"
    );
    const n0088 = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [hash0088]);
    const n0089 = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [hash0089]);
    const snapshotTable = await q(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_charged_terms'`
    );
    let snapshotCount = [{ n: null }];
    let snapshotCols = [];
    let snapshotIndexes = [];
    if (snapshotTable.length > 0) {
      snapshotCount = await q("SELECT COUNT(*) AS n FROM commercial_subscription_charged_terms");
      snapshotCols = await q(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_charged_terms'
         ORDER BY ORDINAL_POSITION`
      );
      snapshotIndexes = await q(
        `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_subscription_charged_terms'
         GROUP BY INDEX_NAME, NON_UNIQUE`
      );
    }
    const counts = await q(
      `SELECT
         (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
         (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
         (SELECT COUNT(*) FROM commercial_plans) AS plans,
         (SELECT COUNT(*) FROM commercial_prices) AS prices`
    );
    const subscriptions = await q(
      `SELECT id, status, billingCycle, planId FROM user_subscriptions ORDER BY id`
    );
    const bindings = await q(
      `SELECT subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleCode
       FROM commercial_subscription_bindings ORDER BY subscriptionId`
    );
    const row780001 = subscriptions.filter((r) => r.id === 780001);
    const evidence = {
      label,
      queriedAt: new Date().toISOString(),
      mutation: "NONE",
      target: { database: target.database, port: target.port, tls: target.tls },
      session: session[0] ?? null,
      hash0088,
      hash0089,
      latest_hash: latest[0]?.hash ?? null,
      count_hash_0088: Number(n0088[0]?.n ?? 0),
      count_hash_0089: Number(n0089[0]?.n ?? 0),
      snapshot_table_exists: snapshotTable.length > 0,
      snapshot_count: snapshotCount[0]?.n ?? null,
      snapshot_columns: snapshotCols.map((c) => c.COLUMN_NAME),
      snapshot_indexes: snapshotIndexes,
      counts: counts[0] ?? null,
      subscriptions,
      bindings,
      subscription_780001: row780001,
    };
    const file = join(
      dirname(fileURLToPath(import.meta.url)),
      label === "after" ? "_POST-APPLY.json" : "_PRE-APPLY.json"
    );
    writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: "NONE", reason: String(err) }));
  process.exit(1);
});
