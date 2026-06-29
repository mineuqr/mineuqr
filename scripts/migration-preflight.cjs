/**
 * Read-only migration preflight — journal vs disk vs DB.
 * Does not apply migrations.
 *
 * Usage: node scripts/migration-preflight.cjs
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const DRIZZLE_DIR = path.join(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(DRIZZLE_DIR, "meta", "_journal.json");

function loadJournalTags() {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
  return journal.entries.map((e) => e.tag);
}

function loadSqlMigrationFiles() {
  return fs
    .readdirSync(DRIZZLE_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .map((f) => f.replace(/\.sql$/, ""));
}

async function loadAppliedTags(conn) {
  try {
    const [rows] = await conn.query(
      "SELECT hash, created_at FROM `__drizzle_migrations` ORDER BY created_at"
    );
    return rows;
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return null;
    }
    throw err;
  }
}

async function main() {
  const journalTags = loadJournalTags();
  const sqlTags = loadSqlMigrationFiles();

  const orphansOnDisk = sqlTags.filter((t) => !journalTags.includes(t));
  const journalMissingFiles = journalTags.filter((t) => !sqlTags.includes(t));

  console.log("=== MineuQR migration preflight ===\n");
  console.log(`Journal entries: ${journalTags.length}`);
  console.log(`SQL files (####_*.sql): ${sqlTags.length}`);
  console.log(`Last journal tag: ${journalTags[journalTags.length - 1]}`);

  if (orphansOnDisk.length > 0) {
    console.log("\n⚠ SQL files NOT in journal (do not run manually):");
    for (const t of orphansOnDisk.sort()) console.log(`  - ${t}`);
  } else {
    console.log("\n✓ No orphan SQL files outside journal.");
  }

  if (journalMissingFiles.length > 0) {
    console.log("\n✗ Journal tags missing SQL files:");
    for (const t of journalMissingFiles) console.log(`  - ${t}`);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("\n(skip DB: DATABASE_URL not set)");
    return;
  }

  const { createAuditReadonlyConnection } = await import("./lib/tidb-audit-connection.mjs");
  const conn = await createAuditReadonlyConnection(url);
  try {
    const applied = await loadAppliedTags(conn);
    if (!applied) {
      console.log("\nDB: __drizzle_migrations table not found (fresh DB or never migrated).");
      console.log("Pending journal migrations:", journalTags.length);
      return;
    }

    console.log(`\nDB: __drizzle_migrations rows: ${applied.length}`);
    const pending = journalTags.length - applied.length;
    if (pending > 0) {
      console.log(`⚠ Likely pending journal migrations: ~${pending} (compare tags manually).`);
      console.log("  Run: pnpm exec drizzle-kit migrate");
      console.log("  Then: node scripts/verify-schema-deployment.cjs");
    } else if (applied.length > journalTags.length) {
      console.log("⚠ DB has more migration rows than journal — investigate drift.");
    } else {
      console.log("✓ Applied count aligns with journal length (rough check).");
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[preflight] Failed:", err.message);
  process.exit(1);
});
