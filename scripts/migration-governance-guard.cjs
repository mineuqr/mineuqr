/**
 * MIGRATION-GOVERNANCE-RESTORATION-1 — strict repository governance gate.
 * Exit 0 = journal/SQL lineage is deployable; 1 = violation (blocks CI/deploy).
 *
 * Usage: node scripts/migration-governance-guard.cjs
 */
const {
  CANONICAL_TAIL_TAGS,
  CANONICAL_MIGRATION_TAIL_TAG,
  CANONICAL_JOURNAL_ENTRY_COUNT,
  findGovernanceViolations,
  loadJournal,
  validateJournalOrdering,
} = require("./lib/migration-governance-lib.cjs");

function main() {
  const v = findGovernanceViolations();
  const journal = loadJournal();
  let failed = false;

  console.log("=== MineuQR migration governance guard ===\n");
  console.log(`Journal entries: ${v.journalTags.length}`);
  console.log(`Last journal tag: ${v.journalTags[v.journalTags.length - 1]}`);
  console.log(`Legacy orphan SQL (documented): ${v.legacyOrphans.length}`);

  if (v.journalMissingFiles.length > 0) {
    failed = true;
    console.error("\n✗ FAIL — journal tags missing SQL files:");
    for (const t of v.journalMissingFiles) console.error(`  - ${t}`);
  }

  if (v.nonLegacyOrphans.length > 0) {
    failed = true;
    console.error("\n✗ FAIL — non-legacy SQL files outside journal:");
    for (const t of v.nonLegacyOrphans.sort()) console.error(`  - ${t}`);
    console.error("  Fix: drizzle-kit generate after schema.ts changes, or journalize existing SQL.");
  }

  if (v.orderingErrors.length > 0) {
    failed = true;
    console.error("\n✗ FAIL — journal ordering violations:");
    for (const e of v.orderingErrors) console.error(`  - ${e}`);
  }

  if (v.missingCanonicalTail.length > 0) {
    failed = true;
    console.error("\n✗ FAIL — canonical tail migrations missing from journal:");
    for (const t of v.missingCanonicalTail) console.error(`  - ${t}`);
  }

  for (const tag of CANONICAL_TAIL_TAGS) {
    if (!v.journalTags.includes(tag)) {
      failed = true;
    }
  }

  const lastTag = v.journalTags[v.journalTags.length - 1];
  if (lastTag !== CANONICAL_MIGRATION_TAIL_TAG) {
    failed = true;
    console.error(
      `\n✗ FAIL — journal must end at ${CANONICAL_MIGRATION_TAIL_TAG} (got ${lastTag})`
    );
  }

  if (journal.entries.length !== CANONICAL_JOURNAL_ENTRY_COUNT) {
    failed = true;
    console.error(
      `\n✗ FAIL — expected ${CANONICAL_JOURNAL_ENTRY_COUNT} journal entries (0000–0099), got ${journal.entries.length}`
    );
  }

  if (failed) {
    console.error("\n[governance-guard] BLOCKED — resolve violations before deploy.");
    process.exit(1);
  }

  console.log(
    `\n✓ Journal ↔ SQL lineage consistent (canonical migrations 0000–0099).`
  );
  console.log("✓ No non-legacy orphan SQL files.");
  console.log("✓ Journal ordering valid.");
  console.log("\n[governance-guard] OK");
}

main();
