/**
 * POS-DOMAIN-PRODUCTION-APPLY-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE.
 * Does not apply 0091–0093.
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

function classifySql(sql, expectedCreate) {
  return {
    creates_expected_table: sql.includes(`CREATE TABLE \`${expectedCreate}\``),
    has_insert: /INSERT\s+INTO/i.test(sql),
    has_update: /^\s*UPDATE\b/im.test(sql),
    has_delete: /^\s*DELETE\b/im.test(sql),
    has_drop: /DROP\s+/i.test(sql),
    has_truncate: /TRUNCATE\s+/i.test(sql),
    has_alter: /^\s*ALTER\b/im.test(sql),
    mentions_780001: sql.includes("780001"),
    mentions_orders: /ALTER TABLE `orders`/i.test(sql),
    mentions_checks: /operational_checks|CREATE TABLE `checks`/i.test(sql),
    mentions_settlement: /settle|CREATE TABLE `.*settlement/i.test(sql),
    mentions_register: /crmp_registers|CREATE TABLE `.*register/i.test(sql),
  };
}

function sqlSafe(sql, expectedCreate) {
  const c = classifySql(sql, expectedCreate);
  return (
    c.creates_expected_table &&
    !c.has_insert &&
    !c.has_update &&
    !c.has_delete &&
    !c.has_drop &&
    !c.has_truncate &&
    !c.has_alter &&
    !c.mentions_780001
  );
}

async function collect(conn, hashes) {
  const q = async (text, params) => {
    const [rows] = params ? await conn.execute(text, params) : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
  const latest = await q(
    "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
  );
  const hashCounts = {};
  for (const [key, hash] of Object.entries(hashes)) {
    const rows = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [
      hash,
    ]);
    hashCounts[key] = Number(rows[0]?.n ?? 0);
  }
  const posTables = await q(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND (
         TABLE_NAME IN ('pos_terminals', 'pos_permission_grants', 'pos_sale_idempotency')
         OR TABLE_NAME LIKE 'pos_%'
         OR TABLE_NAME LIKE '%pos_order%'
       )
     ORDER BY TABLE_NAME`
  );
  const tableMeta = {};
  for (const name of [
    "pos_terminals",
    "pos_permission_grants",
    "pos_sale_idempotency",
  ]) {
    const exists = posTables.some((row) => row.TABLE_NAME === name);
    if (!exists) {
      tableMeta[name] = { exists: false, rowCount: null, columns: [], indexes: [] };
      continue;
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
    tableMeta[name] = {
      exists: true,
      rowCount: Number(count[0]?.n ?? 0),
      columns,
      indexes,
    };
  }
  const counts = await q(
    `SELECT
       (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
       (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
       (SELECT COUNT(*) FROM commercial_subscription_charged_terms) AS charged_terms,
       (SELECT COUNT(*) FROM commercial_subscription_concessions) AS concessions,
       (SELECT COUNT(*) FROM commercial_plans) AS plans,
       (SELECT COUNT(*) FROM commercial_prices) AS prices,
       (SELECT COUNT(*) FROM orders) AS orders,
       (SELECT COUNT(*) FROM operational_checks) AS checks,
       (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
       (SELECT COUNT(*) FROM crmp_registers) AS registers,
       (SELECT COUNT(*) FROM crmp_financial_shifts) AS financial_shifts`
  );
  const row780001 = await q(
    `SELECT us.id, us.status, us.billingCycle, us.planId, us.currentPeriodEnd
     FROM user_subscriptions us
     WHERE us.id = 780001`
  );
  return {
    session: session[0] ?? null,
    journal_latest: latest[0] ?? null,
    journal_recent: latest,
    hash_counts: hashCounts,
    unexpected_pos_tables: posTables
      .map((row) => row.TABLE_NAME)
      .filter(
        (name) =>
          !["pos_terminals", "pos_permission_grants", "pos_sale_idempotency"].includes(
            name
          )
      ),
    tables: tableMeta,
    counts: counts[0] ?? null,
    subscription_780001: row780001,
  };
}

async function main() {
  const label = process.argv[2] || "pre";
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const sql0091 = readFileSync(join(process.cwd(), "drizzle/0091_pos_terminals.sql"), "utf8");
  const sql0092 = readFileSync(
    join(process.cwd(), "drizzle/0092_pos_permission_grants.sql"),
    "utf8"
  );
  const sql0093 = readFileSync(
    join(process.cwd(), "drizzle/0093_pos_sale_idempotency.sql"),
    "utf8"
  );
  const hashes = {
    hash0090: hashMigrationSql("0090_commercial_subscription_concessions"),
    hash0091: hashMigrationSql("0091_pos_terminals"),
    hash0092: hashMigrationSql("0092_pos_permission_grants"),
    hash0093: hashMigrationSql("0093_pos_sale_idempotency"),
  };
  const sqlIntegrity = {
    hashes,
    sql0091: classifySql(sql0091, "pos_terminals"),
    sql0092: classifySql(sql0092, "pos_permission_grants"),
    sql0093: classifySql(sql0093, "pos_sale_idempotency"),
    sql0091_safe: sqlSafe(sql0091, "pos_terminals"),
    sql0092_safe: sqlSafe(sql0092, "pos_permission_grants"),
    sql0093_safe: sqlSafe(sql0093, "pos_sale_idempotency"),
  };
  const target = auditConnectionTarget(url);
  const classify = classifyHost(target);
  const conn = await createAuditReadonlyConnection(url);
  try {
    const data = await collect(conn, hashes);
    const evidence = {
      program: "POS-DOMAIN-PRODUCTION-APPLY-1",
      label,
      queriedAt: new Date().toISOString(),
      mutation: "NONE",
      access: classify.matchesKnownProductionShape ? "PRODUCTION" : "NON_PRODUCTION_OR_UNVERIFIED",
      target: classify,
      sqlIntegrity,
      ...data,
    };
    const dir = dirname(fileURLToPath(import.meta.url));
    const file =
      label === "after" ? "POST-APPLY-VERIFICATION.json" : "PRE-APPLY-BASELINE.json";
    writeFileSync(join(dir, file), `${JSON.stringify(evidence, null, 2)}\n`);
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
      if (evidence.hash_counts.hash0090 !== 1) {
        console.error("STOP: 0090 is not the applied concession migration");
        process.exit(3);
      }
      if (evidence.journal_latest?.hash !== hashes.hash0090) {
        console.error("STOP: journal terminus is not 0090");
        process.exit(3);
      }
      const anyPosExists =
        evidence.tables.pos_terminals.exists ||
        evidence.tables.pos_permission_grants.exists ||
        evidence.tables.pos_sale_idempotency.exists;
      const anyPosHash =
        evidence.hash_counts.hash0091 !== 0 ||
        evidence.hash_counts.hash0092 !== 0 ||
        evidence.hash_counts.hash0093 !== 0;
      if (anyPosExists || anyPosHash) {
        console.error("STOP: POS schema or journal is partially or fully applied");
        process.exit(3);
      }
      if (evidence.unexpected_pos_tables.length > 0) {
        console.error("STOP: unexpected POS tables present");
        process.exit(3);
      }
      if (
        !sqlIntegrity.sql0091_safe ||
        !sqlIntegrity.sql0092_safe ||
        !sqlIntegrity.sql0093_safe
      ) {
        console.error("STOP: certified SQL integrity failed");
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
