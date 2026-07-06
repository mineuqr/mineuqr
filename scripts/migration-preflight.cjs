/**
 * Read-only migration preflight — journal vs disk vs DB.
 * Does not apply migrations. Fails on governance violations when --strict (default).
 *
 * Usage: node scripts/migration-preflight.cjs [--strict] [--readonly]
 */
require("dotenv").config();
const {
  buildJournalHashMap,
  findGovernanceViolations,
  hashMigrationSql,
  loadJournal,
} = require("./lib/migration-governance-lib.cjs");

const strict = !process.argv.includes("--readonly");

async function loadAppliedRows(conn) {
  try {
    const [rows] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at, id"
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
  const v = findGovernanceViolations();
  const journal = loadJournal();
  let failed = false;

  console.log("=== MineuQR migration preflight ===\n");
  console.log(`Journal entries: ${v.journalTags.length}`);
  console.log(`SQL files (####_*.sql): ${v.sqlTags.length}`);
  console.log(`Last journal tag: ${v.journalTags[v.journalTags.length - 1]}`);

  if (v.nonLegacyOrphans.length > 0) {
    failed = true;
    console.error("\n✗ Non-legacy SQL files NOT in journal:");
    for (const t of v.nonLegacyOrphans.sort()) console.error(`  - ${t}`);
  } else {
    console.log("\n✓ No non-legacy orphan SQL files.");
  }

  if (v.legacyOrphans.length > 0) {
    console.log(`\nℹ Legacy orphan SQL (documented, ignore): ${v.legacyOrphans.length} files`);
  }

  if (v.journalMissingFiles.length > 0) {
    failed = true;
    console.error("\n✗ Journal tags missing SQL files:");
    for (const t of v.journalMissingFiles) console.error(`  - ${t}`);
  }

  if (v.orderingErrors.length > 0) {
    failed = true;
    console.error("\n✗ Journal ordering errors:");
    for (const e of v.orderingErrors) console.error(`  - ${e}`);
  }

  const journalHashes = buildJournalHashMap();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("\n(skip DB: DATABASE_URL not set)");
    if (strict && failed) process.exit(1);
    return;
  }

  const { createAuditReadonlyConnection } = await import("./lib/tidb-audit-connection.mjs");
  const conn = await createAuditReadonlyConnection(url);
  try {
    const applied = await loadAppliedRows(conn);
    if (!applied) {
      console.log("\nDB: __drizzle_migrations table not found (fresh DB or never migrated).");
      console.log(`Pending journal migrations: ${journal.entries.length}`);
      if (strict && failed) process.exit(1);
      return;
    }

    console.log(`\nDB: __drizzle_migrations rows: ${applied.length}`);
    const expectedMin = journal.entries.length;
    const orphanBootstrapCount = Math.max(0, applied.length - expectedMin);

    if (orphanBootstrapCount > 0) {
      console.log(
        `ℹ DB has ${orphanBootstrapCount} extra row(s) vs journal — expected if historical bootstrap rows retained.`
      );
    }

    const appliedHashes = new Set(applied.map((r) => r.hash));
    const missingInDb = [];
    for (const entry of journal.entries) {
      const hash = journalHashes.get(entry.tag);
      if (!appliedHashes.has(hash)) {
        missingInDb.push(entry.tag);
      }
    }

    if (missingInDb.length > 0) {
      console.log(`\n⚠ Pending journal migrations (${missingInDb.length}):`);
      for (const tag of missingInDb) console.log(`  - ${tag}`);
      console.log("  Run: pnpm exec drizzle-kit migrate");
      console.log("  Then: node scripts/verify-schema-deployment.cjs");
    } else {
      console.log("\n✓ All journal migration hashes recorded in DB.");
    }

    const unmatchedDb = applied.filter((r) => {
      for (const entry of journal.entries) {
        if (journalHashes.get(entry.tag) === r.hash) return false;
      }
      return !v.legacyOrphans.some((tag) => hashMigrationSql(tag) === r.hash);
    });
    if (unmatchedDb.length > 0) {
      console.log(`\n⚠ DB rows with unmatched hashes: ${unmatchedDb.length} (investigate drift)`);
    }
  } finally {
    await conn.end();
  }

  if (strict && failed) {
    console.error("\n[preflight] BLOCKED — governance violations detected.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[preflight] Failed:", err.message);
  process.exit(1);
});
