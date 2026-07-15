/**
 * MIGRATION-GOVERNANCE-RESTORATION-1 — shared migration governance helpers.
 * Used by preflight, guard, and recovery scripts.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DRIZZLE_DIR = path.join(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(DRIZZLE_DIR, "meta", "_journal.json");

/** Historical parallel-branch duplicates — documented, never execute, never journalize. */
const LEGACY_ORPHAN_SQL_TAGS = [
  "0000_exotic_hellfire_club",
  "0001_lumpy_naoko",
  "0002_watery_ironclad",
  "0003_square_krista_starr",
  "0004_long_nekra",
  "0005_living_molecule_man",
  "0006_confused_bloodaxe",
  "0007_loose_mandrill",
  "0008_glamorous_phantom_reporter",
];

const CANONICAL_TAIL_TAGS = [
  "0054_operational_devices",
  "0055_operational_device_screen_config",
  "0056_order_read_category_projection",
  "0057_operational_device_screen_config_revision",
];

/** PRODUCTION-MIGRATION-GOVERNANCE — certified production journal terminus. */
const CANONICAL_MIGRATION_TAIL_TAG = "0067_operational_device_waiter_display";
const CANONICAL_JOURNAL_ENTRY_COUNT = 68;

function loadJournal() {
  return JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
}

function loadJournalTags() {
  return loadJournal().entries.map((e) => e.tag);
}

function loadSqlMigrationFiles() {
  return fs
    .readdirSync(DRIZZLE_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .map((f) => f.replace(/\.sql$/, ""));
}

function hashMigrationSql(tag) {
  const filePath = path.join(DRIZZLE_DIR, `${tag}.sql`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing SQL file for tag: ${tag}`);
  }
  return crypto.createHash("sha256").update(fs.readFileSync(filePath, "utf8")).digest("hex");
}

function buildJournalHashMap() {
  const journal = loadJournal();
  const map = new Map();
  for (const entry of journal.entries) {
    map.set(entry.tag, hashMigrationSql(entry.tag));
  }
  return map;
}

function validateJournalOrdering() {
  const journal = loadJournal();
  const errors = [];
  for (let i = 0; i < journal.entries.length; i++) {
    const entry = journal.entries[i];
    if (entry.idx !== i) {
      errors.push(`Journal idx gap: expected ${i}, got ${entry.idx} for ${entry.tag}`);
    }
    if (i > 0 && entry.when < journal.entries[i - 1].when) {
      errors.push(`Journal when not monotonic at ${entry.tag}`);
    }
  }
  return errors;
}

function findGovernanceViolations() {
  const journalTags = loadJournalTags();
  const sqlTags = loadSqlMigrationFiles();
  const journalSet = new Set(journalTags);
  const legacySet = new Set(LEGACY_ORPHAN_SQL_TAGS);

  const orphansOnDisk = sqlTags.filter((t) => !journalSet.has(t));
  const nonLegacyOrphans = orphansOnDisk.filter((t) => !legacySet.has(t));
  const journalMissingFiles = journalTags.filter((t) => !sqlTags.includes(t));
  const orderingErrors = validateJournalOrdering();

  const missingCanonicalTail = CANONICAL_TAIL_TAGS.filter((t) => !journalSet.has(t));

  return {
    journalTags,
    sqlTags,
    orphansOnDisk,
    nonLegacyOrphans,
    journalMissingFiles,
    orderingErrors,
    missingCanonicalTail,
    legacyOrphans: orphansOnDisk.filter((t) => legacySet.has(t)),
  };
}

module.exports = {
  CANONICAL_TAIL_TAGS,
  CANONICAL_MIGRATION_TAIL_TAG,
  CANONICAL_JOURNAL_ENTRY_COUNT,
  DRIZZLE_DIR,
  JOURNAL_PATH,
  LEGACY_ORPHAN_SQL_TAGS,
  buildJournalHashMap,
  findGovernanceViolations,
  hashMigrationSql,
  loadJournal,
  loadJournalTags,
  loadSqlMigrationFiles,
  validateJournalOrdering,
};
