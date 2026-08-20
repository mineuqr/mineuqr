/**
 * PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE.
 * Does not apply 0097.
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
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
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
    const evidence = {
      program: "PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1",
      mutation: "NONE",
      access,
      database: session[0]?.db ?? null,
      purposeEnum: purpose[0]?.COLUMN_TYPE ?? null,
      rowCount: Number(count[0]?.n ?? 0),
      indexes,
      journalLatest: latest[0] ?? null,
      hashCounts,
    };
    console.log(JSON.stringify(evidence, null, 2));
    if (access !== "PRODUCTION") process.exit(3);
    if (evidence.database !== "mineuqr") process.exit(3);
    if (evidence.hashCounts.hash0096 !== 1) process.exit(3);
    if (evidence.hashCounts.hash0097 !== 0) process.exit(3);
    if (evidence.rowCount !== 0) process.exit(3);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: "NONE", reason: String(err) }));
  process.exit(1);
});
