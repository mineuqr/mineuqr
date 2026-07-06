/**
 * MIGRATION-EXECUTION-ALIGNMENT-1 — phased recovery engine (orchestration only).
 */
const fs = require("fs");
const path = require("path");
const {
  DRIZZLE_DIR,
  hashMigrationSql,
} = require("./migration-governance-lib.cjs");
const {
  assertApprovedMigrationTag,
  getJournalWhen,
} = require("./phased-recovery-contract.cjs");

/**
 * @typedef {Object} PhaseVerifySpec
 * @property {string[]} [tables]
 * @property {Array<[string, string]>} [columns]
 * @property {Array<[string, string]>} [indexes]
 * @property {boolean} [backfillIntegrity]
 * @property {boolean} [smokeChecklist]
 */

function loadMigrationSqlStatements(tag) {
  assertApprovedMigrationTag(tag);
  const filePath = path.join(DRIZZLE_DIR, `${tag}.sql`);
  const query = fs.readFileSync(filePath, "utf8");
  return query.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
}

async function hashRecorded(conn, tag) {
  const hash = hashMigrationSql(tag);
  const [rows] = await conn.query(
    "SELECT 1 AS ok FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
    [hash]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function verifyPhaseSchema(conn, verify) {
  const missing = [];
  for (const table of verify.tables ?? []) {
    if (!(await tableExists(conn, table))) {
      missing.push(`table:${table}`);
    }
  }
  for (const [table, column] of verify.columns ?? []) {
    if (!(await columnExists(conn, table, column))) {
      missing.push(`${table}.${column}`);
    }
  }
  for (const [table, indexName] of verify.indexes ?? []) {
    if (!(await indexExists(conn, table, indexName))) {
      missing.push(`index:${table}.${indexName}`);
    }
  }
  return missing;
}

async function isMigrationPhaseComplete(conn, phase) {
  const tag = phase.migrationTag;
  const hashOk = await hashRecorded(conn, tag);
  const schemaMissing = await verifyPhaseSchema(conn, phase.verify);
  if (schemaMissing.length === 0 && hashOk) {
    return { complete: true, status: "complete" };
  }
  if (schemaMissing.length === 0 && !hashOk) {
    return { complete: false, status: "schema_only_needs_hash", schemaMissing: [] };
  }
  if (hashOk && schemaMissing.length > 0) {
    return { complete: false, status: "drift_hash_without_schema", schemaMissing };
  }
  return { complete: false, status: "pending", schemaMissing };
}

async function recordMigrationHash(conn, tag) {
  const hash = hashMigrationSql(tag);
  const when = getJournalWhen(tag);
  const [existing] = await conn.query(
    "SELECT 1 AS ok FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
    [hash]
  );
  if (existing.length > 0) {
    return { inserted: false, hash, when };
  }
  await conn.query(
    "INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)",
    [hash, when]
  );
  return { inserted: true, hash, when };
}

async function executeApprovedMigration(conn, tag, { dryRun }) {
  assertApprovedMigrationTag(tag);
  const statements = loadMigrationSqlStatements(tag);
  const hash = hashMigrationSql(tag);

  if (await hashRecorded(conn, tag)) {
    console.log(`[phased-recovery] SKIP DDL — hash already recorded for ${tag}`);
    return { skipped: true, reason: "hash_recorded" };
  }

  if (dryRun) {
    console.log(`[phased-recovery] DRY-RUN would execute ${tag} (${statements.length} statement(s))`);
    for (const [i, stmt] of statements.entries()) {
      console.log(`  stmt ${i + 1}: ${stmt.split("\n")[0]}...`);
    }
    return { skipped: true, reason: "dry_run" };
  }

  await conn.beginTransaction();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    const recorded = await recordMigrationHash(conn, tag);
    await conn.commit();
    console.log(
      `[phased-recovery] Applied ${tag} — hash ${recorded.hash.slice(0, 16)}... (inserted=${recorded.inserted})`
    );
    return { skipped: false, recorded };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

async function countLegacyLineItems(conn) {
  const [rows] = await conn.query("SELECT COUNT(*) AS n FROM order_read_order_line_items");
  return Number(rows[0]?.n ?? 0);
}

async function countLegacyProjectionRows(conn) {
  const [rows] = await conn.query(`
    SELECT COUNT(*) AS n FROM order_read_order_line_items
    WHERE categoryProjection IS NULL
       OR JSON_TYPE(categoryProjection) = 'NULL'
       OR JSON_EXTRACT(categoryProjection, '$.categoryId') IS NULL
       OR CAST(JSON_EXTRACT(categoryProjection, '$.categoryId') AS SIGNED) < 1
  `);
  return Number(rows[0]?.n ?? 0);
}

const SMOKE_CHECKLIST = [
  "Fleet KPIs load without HTTP 500",
  "Screen Management list/create/update",
  "Screen Provisioning / pairing flow",
  "Runtime bootstrap + authentication",
  "Kitchen runtime queue loads",
  "Category filtering active (post-backfill)",
  "Display density + configuration reload",
];

module.exports = {
  SMOKE_CHECKLIST,
  countLegacyLineItems,
  countLegacyProjectionRows,
  executeApprovedMigration,
  hashRecorded,
  isMigrationPhaseComplete,
  loadMigrationSqlStatements,
  recordMigrationHash,
  verifyPhaseSchema,
};
