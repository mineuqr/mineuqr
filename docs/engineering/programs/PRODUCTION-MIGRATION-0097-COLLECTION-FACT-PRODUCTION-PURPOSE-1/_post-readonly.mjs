/**
 * PRODUCTION-MIGRATION-0097 post-check. SELECT / INFORMATION_SCHEMA only.
 */
import "dotenv/config";
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
  if (!url) throw new Error("DATABASE_URL is required");
  const target = auditConnectionTarget(url);
  const host = target.host ?? "";
  const access =
    /\.tidbcloud\.com$/i.test(host) &&
    /\.prod\./i.test(host) &&
    /^gateway01\./i.test(host) &&
    target.database === "mineuqr"
      ? "PRODUCTION"
      : "NON_PRODUCTION_OR_UNVERIFIED";
  const hashes = {
    hash0096: hashMigrationSql("0096_payment_collection_facts"),
    hash0097: hashMigrationSql("0097_payment_collection_facts_production_purpose"),
  };
  const conn = await createAuditReadonlyConnection(url);
  try {
    const q = async (text, params) => {
      const [rows] = params
        ? await conn.execute(text, params)
        : await conn.execute(text);
      return Array.isArray(rows) ? rows.map(asPlain) : rows;
    };
    const session = await q(
      "SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts"
    );
    const purpose = await q(
      `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_collection_facts'
         AND COLUMN_NAME = 'purpose'`
    );
    const count = await q(
      "SELECT COUNT(*) AS n FROM `payment_collection_facts`"
    );
    const productionCount = await q(
      "SELECT COUNT(*) AS n FROM `payment_collection_facts` WHERE purpose = 'production'"
    );
    const indexes = await q(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_collection_facts'
       GROUP BY INDEX_NAME, NON_UNIQUE`
    );
    const latest = await q(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 3"
    );
    const hashCounts = {};
    for (const [key, hash] of Object.entries(hashes)) {
      const rows = await q(
        "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?",
        [hash]
      );
      hashCounts[key] = Number(rows[0]?.n ?? 0);
    }
    const later = await q(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE created_at > ? OR (created_at = ? AND id > ?)",
      [
        latest[0]?.created_at,
        latest[0]?.created_at,
        latest[0]?.id,
      ]
    );
    const related = {
      operational_checks: Number(
        (await q("SELECT COUNT(*) AS n FROM operational_checks"))[0]?.n ?? 0
      ),
      settlement_records: Number(
        (await q("SELECT COUNT(*) AS n FROM settlement_records"))[0]?.n ?? 0
      ),
      orders: Number((await q("SELECT COUNT(*) AS n FROM orders"))[0]?.n ?? 0),
    };
    const evidence = {
      program: "PRODUCTION-MIGRATION-0097-COLLECTION-FACT-PRODUCTION-PURPOSE-1",
      phase: "POST",
      mutation: "NONE",
      access,
      database: session[0]?.db ?? null,
      purposeEnum: purpose[0]?.COLUMN_TYPE ?? null,
      rowCount: Number(count[0]?.n ?? 0),
      productionPurposeCount: Number(productionCount[0]?.n ?? 0),
      indexes,
      journalLatest: latest[0] ?? null,
      journalRecent: latest,
      hashCounts,
      laterThanLatest: Number(later[0]?.n ?? 0),
      related,
    };
    console.log(JSON.stringify(evidence, null, 2));
    const stops = [];
    if (access !== "PRODUCTION") stops.push("not production");
    if (evidence.database !== "mineuqr") stops.push("database not mineuqr");
    if (
      evidence.purposeEnum !==
      "enum('synthetic','shadow','test','validation','production')"
    ) {
      stops.push(`purpose enum: ${evidence.purposeEnum}`);
    }
    if (evidence.rowCount !== 0) stops.push("row count != 0");
    if (evidence.productionPurposeCount !== 0) {
      stops.push("production-purpose rows != 0");
    }
    if (hashCounts.hash0096 !== 1) stops.push("0096 not once");
    if (hashCounts.hash0097 !== 1) stops.push("0097 not once");
    if (latest[0]?.hash !== hashes.hash0097) stops.push("terminus not 0097");
    const names = new Set(indexes.map((i) => i.INDEX_NAME));
    for (const n of [
      "PRIMARY",
      "payment_collection_facts_fact_id_unique",
      "payment_collection_facts_idempotency_unique",
      "payment_collection_facts_intent_unique",
    ]) {
      if (!names.has(n)) stops.push(`missing ${n}`);
    }
    if (stops.length > 0) {
      console.error(JSON.stringify({ STOP: stops }));
      process.exit(3);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: "NONE", reason: String(err) }));
  process.exit(1);
});
