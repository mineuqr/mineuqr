/**
 * COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-APPLY-1
 * SELECT / INFORMATION_SCHEMA only. Mutation NONE.
 * Does not apply 0094.
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
    mentions_pos_lock: /pos_.*lock|PosTerminalLock|PosOccupancy/i.test(sql),
    mentions_commercial_limit_values: /commercial_limit_values/i.test(sql),
    mentions_occupied_counter: /occupied/i.test(sql),
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
    !c.mentions_780001 &&
    !c.mentions_pos_lock &&
    !c.mentions_commercial_limit_values &&
    !c.mentions_occupied_counter
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
    const [rows] = params ? await conn.execute(text, params) : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
  const latest = await q(
    "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 8"
  );
  const hashCounts = {};
  for (const [key, hash] of Object.entries(hashes)) {
    const rows = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations` WHERE hash = ?", [
      hash,
    ]);
    hashCounts[key] = Number(rows[0]?.n ?? 0);
  }
  const allTables = await q(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`
  );
  const tableNames = allTables.map((row) => row.TABLE_NAME);
  const occupancyLike = tableNames.filter(
    (name) =>
      /occupancy|commercial_limit_occupancy/i.test(name) ||
      name.startsWith("pos_") && /lock/i.test(name)
  );
  const tables = {
    commercial_limit_occupancy_locks: await tableSnapshot(
      q,
      "commercial_limit_occupancy_locks"
    ),
    pos_terminals: await tableSnapshot(q, "pos_terminals"),
    pos_permission_grants: await tableSnapshot(q, "pos_permission_grants"),
    pos_sale_idempotency: await tableSnapshot(q, "pos_sale_idempotency"),
  };
  const counts = await q(
    `SELECT
       (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
       (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
       (SELECT COUNT(*) FROM commercial_subscription_charged_terms) AS charged_terms,
       (SELECT COUNT(*) FROM commercial_subscription_concessions) AS concessions,
       (SELECT COUNT(*) FROM commercial_plans) AS plans,
       (SELECT COUNT(*) FROM commercial_prices) AS prices,
       (SELECT COUNT(*) FROM restaurants) AS restaurants,
       (SELECT COUNT(*) FROM categories) AS categories,
       (SELECT COUNT(*) FROM menu_items) AS menu_items,
       (SELECT COUNT(*) FROM orders) AS orders,
       (SELECT COUNT(*) FROM operational_checks) AS checks,
       (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
       (SELECT COUNT(*) FROM crmp_registers) AS registers,
       (SELECT COUNT(*) FROM crmp_financial_shifts) AS financial_shifts,
       (SELECT COUNT(*) FROM pos_terminals) AS pos_terminals,
       (SELECT COUNT(*) FROM pos_permission_grants) AS pos_permission_grants,
       (SELECT COUNT(*) FROM pos_sale_idempotency) AS pos_sale_idempotency`
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
    table_count: tableNames.length,
    occupancy_like_tables: occupancyLike,
    tables,
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
  const sql0094 = readFileSync(
    join(process.cwd(), "drizzle/0094_commercial_limit_occupancy_locks.sql"),
    "utf8"
  );
  const hashes = {
    hash0091: hashMigrationSql("0091_pos_terminals"),
    hash0092: hashMigrationSql("0092_pos_permission_grants"),
    hash0093: hashMigrationSql("0093_pos_sale_idempotency"),
    hash0094: hashMigrationSql("0094_commercial_limit_occupancy_locks"),
  };
  const sqlIntegrity = {
    hashes,
    sql0094: classifySql(sql0094, "commercial_limit_occupancy_locks"),
    sql0094_safe: sqlSafe(sql0094, "commercial_limit_occupancy_locks"),
  };
  const target = auditConnectionTarget(url);
  const classify = classifyHost(target);
  const conn = await createAuditReadonlyConnection(url);
  try {
    const data = await collect(conn, hashes);
    const evidence = {
      program: "COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-APPLY-1",
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
      if (evidence.hash_counts.hash0091 !== 1) {
        console.error("STOP: 0091 is not applied exactly once");
        process.exit(3);
      }
      if (evidence.hash_counts.hash0092 !== 1) {
        console.error("STOP: 0092 is not applied exactly once");
        process.exit(3);
      }
      if (evidence.hash_counts.hash0093 !== 1) {
        console.error("STOP: 0093 is not applied exactly once");
        process.exit(3);
      }
      if (evidence.journal_latest?.hash !== hashes.hash0093) {
        console.error("STOP: journal terminus is not 0093_pos_sale_idempotency");
        process.exit(3);
      }
      if (evidence.hash_counts.hash0094 !== 0) {
        console.error("STOP: 0094 is already applied");
        process.exit(3);
      }
      if (evidence.tables.commercial_limit_occupancy_locks.exists) {
        console.error("STOP: commercial_limit_occupancy_locks already exists");
        process.exit(3);
      }
      if (!sqlIntegrity.sql0094_safe) {
        console.error("STOP: certified SQL integrity failed");
        process.exit(3);
      }
      if (!evidence.tables.pos_terminals.exists) {
        console.error("STOP: 0091 table pos_terminals missing");
        process.exit(3);
      }
      if (!evidence.tables.pos_permission_grants.exists) {
        console.error("STOP: 0092 table pos_permission_grants missing");
        process.exit(3);
      }
      if (!evidence.tables.pos_sale_idempotency.exists) {
        console.error("STOP: 0093 table pos_sale_idempotency missing");
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
