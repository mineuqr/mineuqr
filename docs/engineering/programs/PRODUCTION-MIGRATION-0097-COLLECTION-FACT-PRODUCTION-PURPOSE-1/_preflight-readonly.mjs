/**
 * PRODUCTION-MIGRATION-0097-COLLECTION-FACT-PRODUCTION-PURPOSE-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE.
 * Does not apply 0097.
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";
import {
  buildJournalHashMap,
  hashMigrationSql,
  loadJournal,
} from "../../../../scripts/lib/migration-governance-lib.cjs";

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

function classifySql(sql) {
  return {
    alters_purpose_enum:
      /ALTER TABLE `payment_collection_facts` MODIFY COLUMN `purpose` enum\('synthetic','shadow','test','validation','production'\) NOT NULL/.test(
        sql
      ),
    creates_table: /CREATE TABLE/i.test(sql),
    creates_payments: /CREATE TABLE `payments`/i.test(sql),
    has_insert: /INSERT\s+INTO/i.test(sql),
    has_update: /^\s*UPDATE\b/im.test(sql),
    has_delete: /^\s*DELETE\b/im.test(sql),
    has_drop: /DROP\s+/i.test(sql),
    has_truncate: /TRUNCATE\s+/i.test(sql),
    has_fk: /FOREIGN KEY/i.test(sql),
    alters_checks: /ALTER TABLE `operational_checks`/i.test(sql),
    alters_orders: /ALTER TABLE `orders`/i.test(sql),
    alters_settlement: /ALTER TABLE `settlement_records`/i.test(sql),
  };
}

function sqlSafe(c) {
  return (
    c.alters_purpose_enum &&
    !c.creates_table &&
    !c.creates_payments &&
    !c.has_insert &&
    !c.has_update &&
    !c.has_delete &&
    !c.has_drop &&
    !c.has_truncate &&
    !c.has_fk &&
    !c.alters_checks &&
    !c.alters_orders &&
    !c.alters_settlement
  );
}

async function tableSnapshot(q, name) {
  const existsRows = await q(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  if (existsRows.length === 0) {
    return { exists: false, rowCount: null };
  }
  const count = await q(`SELECT COUNT(*) AS n FROM \`${name}\``);
  return { exists: true, rowCount: Number(count[0]?.n ?? 0) };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sqlPath = join(
    process.cwd(),
    "drizzle/0097_payment_collection_facts_production_purpose.sql"
  );
  if (!existsSync(sqlPath)) {
    throw new Error("0097 SQL file missing");
  }
  if (existsSync(join(process.cwd(), "drizzle/0098.sql"))) {
    throw new Error("unexpected 0098.sql");
  }
  const sql = readFileSync(sqlPath, "utf8");
  const sqlClass = classifySql(sql);
  const hashes = {
    hash0096: hashMigrationSql("0096_payment_collection_facts"),
    hash0097: hashMigrationSql("0097_payment_collection_facts_production_purpose"),
  };
  const journal = loadJournal();
  const lastTag = journal.entries[journal.entries.length - 1]?.tag;
  const journalHashes = buildJournalHashMap();
  const target = auditConnectionTarget(url);
  const host = target.host ?? "";
  const access =
    /\.tidbcloud\.com$/i.test(host) &&
    /\.prod\./i.test(host) &&
    /^gateway01\./i.test(host) &&
    target.database === "mineuqr"
      ? "PRODUCTION"
      : "NON_PRODUCTION_OR_UNVERIFIED";

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
    const applied = await q(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at, id"
    );
    const appliedHashes = new Set(applied.map((r) => r.hash));
    const pending = [];
    for (const [tag, hash] of journalHashes.entries()) {
      if (!appliedHashes.has(hash)) pending.push({ tag, hash });
    }
    const purpose = await q(
      `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_collection_facts'
         AND COLUMN_NAME = 'purpose'`
    );
    const indexes = await q(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_collection_facts'
       GROUP BY INDEX_NAME, NON_UNIQUE`
    );
    const productionPurposeCount = await q(
      `SELECT COUNT(*) AS n FROM payment_collection_facts WHERE purpose = 'production'`
    ).catch(() => [{ n: "enum-rejected-or-missing" }]);
    const facts = await tableSnapshot(q, "payment_collection_facts");
    const related = {
      operational_checks: await tableSnapshot(q, "operational_checks"),
      settlement_records: await tableSnapshot(q, "settlement_records"),
      orders: await tableSnapshot(q, "orders"),
      check_settlement_transactions: await tableSnapshot(
        q,
        "check_settlement_transactions"
      ),
      restaurants: await tableSnapshot(q, "restaurants"),
    };
    const hashCounts = {
      hash0096: applied.filter((r) => r.hash === hashes.hash0096).length,
      hash0097: applied.filter((r) => r.hash === hashes.hash0097).length,
    };
    const latest = applied[applied.length - 1] ?? null;
    const evidence = {
      program: "PRODUCTION-MIGRATION-0097-COLLECTION-FACT-PRODUCTION-PURPOSE-1",
      mutation: "NONE",
      access,
      database: session[0]?.db ?? null,
      lastJournalTag: lastTag,
      sqlSafe: sqlSafe(sqlClass),
      sqlClass,
      hashes,
      hashCounts,
      journalLatest: latest,
      pending,
      purposeEnum: purpose[0]?.COLUMN_TYPE ?? null,
      indexes,
      payment_collection_facts: facts,
      productionPurposeCount:
        productionPurposeCount[0]?.n === "enum-rejected-or-missing"
          ? "enum-rejected-or-missing"
          : Number(productionPurposeCount[0]?.n ?? 0),
      related,
    };
    console.log(JSON.stringify(evidence, null, 2));

    const uniqueNames = new Set(indexes.map((i) => i.INDEX_NAME));
    const stops = [];
    if (access !== "PRODUCTION") stops.push("not production");
    if (evidence.database !== "mineuqr") stops.push("database not mineuqr");
    if (lastTag !== "0097_payment_collection_facts_production_purpose") {
      stops.push("journal tail is not 0097");
    }
    if (!evidence.sqlSafe) stops.push("0097 SQL is not enum-only");
    if (hashCounts.hash0096 !== 1) stops.push("0096 not recorded once");
    if (hashCounts.hash0097 !== 0) stops.push("0097 already recorded");
    if (latest?.hash !== hashes.hash0096) stops.push("terminus is not 0096");
    if (pending.length !== 1 || pending[0]?.tag !== "0097_payment_collection_facts_production_purpose") {
      stops.push(`pending is not 0097-only: ${JSON.stringify(pending)}`);
    }
    if (!facts.exists) stops.push("payment_collection_facts missing");
    if (facts.rowCount !== 0) stops.push("collection fact rows != 0");
    if (evidence.purposeEnum !== "enum('synthetic','shadow','test','validation')") {
      stops.push(`purpose enum unexpected: ${evidence.purposeEnum}`);
    }
    if (!uniqueNames.has("PRIMARY")) stops.push("PRIMARY missing");
    if (!uniqueNames.has("payment_collection_facts_fact_id_unique")) {
      stops.push("collectionFactId unique missing");
    }
    if (!uniqueNames.has("payment_collection_facts_idempotency_unique")) {
      stops.push("idempotency unique missing");
    }
    if (!uniqueNames.has("payment_collection_facts_intent_unique")) {
      stops.push("intent unique missing");
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
