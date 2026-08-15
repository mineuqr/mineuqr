/**
 * COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1
 * SELECT-only Production preview. No DDL. No DML. Does not apply 0090.
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
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for read-only preview");
  }
  const hash0089 = hashMigrationSql("0089_commercial_charged_terms_snapshots");
  const hash0090 = hashMigrationSql("0090_commercial_subscription_concessions");
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
    const n0089 = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [
      hash0089,
    ]);
    const n0090 = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [
      hash0090,
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
      const rows = await q("SELECT COUNT(*) AS n FROM commercial_subscription_charged_terms");
      snapshotCount = Number(rows[0]?.n ?? 0);
    }
    let concessionCount = null;
    if (tableNames.includes("commercial_subscription_concessions")) {
      const rows = await q("SELECT COUNT(*) AS n FROM commercial_subscription_concessions");
      concessionCount = Number(rows[0]?.n ?? 0);
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
    const row780001 = subscriptions.filter((row) => row.id === 780001);
    const evidence = {
      program: "COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1",
      queriedAt: new Date().toISOString(),
      mutation: "NONE",
      applied_0090: false,
      target: { database: target.database, port: target.port, tls: target.tls },
      session: session[0] ?? null,
      hash0089,
      hash0090,
      latest_hash: latest[0]?.hash ?? null,
      count_hash_0089: Number(n0089[0]?.n ?? 0),
      count_hash_0090: Number(n0090[0]?.n ?? 0),
      snapshot_table_exists: tableNames.includes("commercial_subscription_charged_terms"),
      concession_table_exists: tableNames.includes("commercial_subscription_concessions"),
      snapshot_count: snapshotCount,
      concession_count: concessionCount,
      counts: counts[0] ?? null,
      subscriptions,
      bindings,
      subscription_780001: row780001,
    };
    const file = join(dirname(fileURLToPath(import.meta.url)), "_PREVIEW-READONLY.json");
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
