/**
 * PRODUCTION-MIGRATION-0096-COLLECTION-FACT-EXECUTION-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE.
 * Does not apply 0096.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    creates_expected_table: sql.includes("CREATE TABLE `payment_collection_facts`"),
    creates_payments_table: /CREATE TABLE `payments`/i.test(sql),
    has_insert: /INSERT\s+INTO/i.test(sql),
    has_update: /^\s*UPDATE\b/im.test(sql),
    has_delete: /^\s*DELETE\b/im.test(sql),
    has_drop: /DROP\s+/i.test(sql),
    has_truncate: /TRUNCATE\s+/i.test(sql),
    has_alter: /^\s*ALTER\b/im.test(sql),
    alters_checks: /ALTER TABLE `operational_checks`/i.test(sql),
    alters_orders: /ALTER TABLE `orders`/i.test(sql),
    alters_settlement_records: /ALTER TABLE `settlement_records`/i.test(sql),
    restaurant_id_not_null: /`restaurantId` int NOT NULL/.test(sql),
    purpose_isolated:
      sql.includes("enum('synthetic','shadow','test','validation')") &&
      !/`purpose` enum\('synthetic','shadow','test','validation','production'\)/.test(
        sql
      ),
  };
}

function sqlSafe(sql) {
  const c = classifySql(sql);
  return (
    c.creates_expected_table &&
    c.restaurant_id_not_null &&
    c.purpose_isolated &&
    !c.creates_payments_table &&
    !c.has_insert &&
    !c.has_update &&
    !c.has_delete &&
    !c.has_drop &&
    !c.has_truncate &&
    !c.has_alter &&
    !c.alters_checks &&
    !c.alters_orders &&
    !c.alters_settlement_records
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
    return { exists: false, rowCount: null, columns: [], indexes: [] };
  }
  const count = await q(`SELECT COUNT(*) AS n FROM \`${name}\``);
  const columns = await q(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [name]
  );
  const indexes = await q(
    `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     GROUP BY INDEX_NAME, NON_UNIQUE`,
    [name]
  );
  return {
    exists: true,
    rowCount: Number(count[0]?.n ?? 0),
    columns,
    indexes,
  };
}

async function collect(conn, hashes) {
  const q = async (text, params) => {
    const [rows] = params
      ? await conn.execute(text, params)
      : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  const session = await q(
    "SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts"
  );
  const latest = await q(
    "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 8"
  );
  const hashCounts = {};
  for (const [key, hash] of Object.entries(hashes)) {
    const rows = await q(
      "SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?",
      [hash]
    );
    hashCounts[key] = Number(rows[0]?.n ?? 0);
  }
  const tables = {
    payment_collection_facts: await tableSnapshot(q, "payment_collection_facts"),
    payments: await tableSnapshot(q, "payments"),
    check_charges: await tableSnapshot(q, "check_charges"),
    settlement_records: await tableSnapshot(q, "settlement_records"),
    operational_checks: await tableSnapshot(q, "operational_checks"),
  };
  const counts = await q(
    `SELECT
       (SELECT COUNT(*) FROM operational_checks) AS checks,
       (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
       (SELECT COUNT(*) FROM orders) AS orders,
       (SELECT COUNT(*) FROM check_settlement_transactions) AS settlement_transactions,
       (SELECT COUNT(*) FROM restaurants) AS restaurants`
  );
  return {
    session: session[0] ?? null,
    journal_latest: latest[0] ?? null,
    journal_recent: latest,
    hash_counts: hashCounts,
    tables,
    counts: counts[0] ?? null,
  };
}

async function main() {
  const label = process.argv[2] || "pre";
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const sql0096 = readFileSync(
    join(process.cwd(), "drizzle/0096_payment_collection_facts.sql"),
    "utf8"
  );
  const hashes = {
    hash0095: hashMigrationSql("0095_check_charges"),
    hash0096: hashMigrationSql("0096_payment_collection_facts"),
  };
  const sqlIntegrity = {
    hashes,
    sql0096: classifySql(sql0096),
    sql0096_safe: sqlSafe(sql0096),
  };
  const target = auditConnectionTarget(url);
  const classify = classifyHost(target);
  const conn = await createAuditReadonlyConnection(url);
  try {
    const data = await collect(conn, hashes);
    const evidence = {
      program: "PRODUCTION-MIGRATION-0096-COLLECTION-FACT-EXECUTION-1",
      label,
      queriedAt: new Date().toISOString(),
      mutation: "NONE",
      access: classify.matchesKnownProductionShape
        ? "PRODUCTION"
        : "NON_PRODUCTION_OR_UNVERIFIED",
      target: classify,
      sqlIntegrity,
      ...data,
    };
    console.log(JSON.stringify(evidence, null, 2));
    if (label === "pre") {
      if (evidence.access !== "PRODUCTION") {
        console.error("STOP: Production target not verified");
        process.exit(3);
      }
      if (evidence.session?.db !== "mineuqr") {
        console.error("STOP: DATABASE() is not mineuqr");
        process.exit(3);
      }
      if (evidence.hash_counts.hash0095 !== 1) {
        console.error("STOP: 0095 is not applied exactly once");
        process.exit(3);
      }
      if (evidence.journal_latest?.hash !== hashes.hash0095) {
        console.error("STOP: journal terminus is not 0095_check_charges");
        process.exit(3);
      }
      if (evidence.hash_counts.hash0096 !== 0) {
        console.error("STOP: 0096 already applied — no execution performed.");
        process.exit(3);
      }
      if (evidence.tables.payment_collection_facts.exists) {
        console.error("STOP: payment_collection_facts already exists");
        process.exit(3);
      }
      if (!sqlIntegrity.sql0096_safe) {
        console.error("STOP: certified SQL integrity failed");
        process.exit(3);
      }
      if (!evidence.tables.check_charges.exists) {
        console.error("STOP: 0095 table check_charges missing");
        process.exit(3);
      }
      if (
        evidence.tables.payments.exists &&
        !evidence.tables.payments.columns.some((c) => c.COLUMN_NAME === "tapChargeId")
      ) {
        console.error("STOP: unexpected payments table shape (not SaaS Tap billing)");
        process.exit(3);
      }
    }
    if (label === "post") {
      if (evidence.access !== "PRODUCTION") {
        console.error("STOP: Production target not verified");
        process.exit(3);
      }
      if (evidence.hash_counts.hash0096 !== 1) {
        console.error("STOP: 0096 is not recorded exactly once");
        process.exit(3);
      }
      if (evidence.journal_latest?.hash !== hashes.hash0096) {
        console.error("STOP: journal terminus is not 0096_payment_collection_facts");
        process.exit(3);
      }
      if (!evidence.tables.payment_collection_facts.exists) {
        console.error("STOP: payment_collection_facts missing after migrate");
        process.exit(3);
      }
      if (Number(evidence.tables.payment_collection_facts.rowCount) !== 0) {
        console.error("STOP: payment_collection_facts is not empty after migrate");
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
