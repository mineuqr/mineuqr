import crypto from "crypto";
import fs from "fs";
import mysql from "mysql2/promise";
import {
  parseDatabaseUrl,
  resolveTlsForHost,
  auditConnectionTarget,
} from "./lib/tidb-audit-connection.mjs";

const HASH_0019 =
  "fb42c4dd92c722f7ebb0f97e0a3fa9cac049cbff01735a4d0fdde4f647f2bc9b";
const CREATED_AT_0019 = 1778756200000;
const TAG_0019 = "0019_users_email_unique";

const DDL =
  "CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`)";

function hashFile(tag) {
  const content = fs.readFileSync(`drizzle/${tag}.sql`, "utf8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("NO_DATABASE_URL");

const target = auditConnectionTarget(url);
if (!/gateway01/i.test(target.host) || target.database !== "mineuqr") {
  throw new Error(`WRONG_TARGET: ${JSON.stringify(target)}`);
}

const repoHash = hashFile(TAG_0019);
if (repoHash !== HASH_0019) {
  throw new Error(`REPO_HASH_MISMATCH: ${repoHash} != ${HASH_0019}`);
}

const cfg = parseDatabaseUrl(url);
const ssl = resolveTlsForHost(cfg);
const conn = await mysql.createConnection({
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  ...(ssl ? { ssl } : {}),
});

const report = {
  executed_at: new Date().toISOString(),
  target,
  tag: TAG_0019,
  hash: HASH_0019,
  created_at: CREATED_AT_0019,
  preflight: {},
  sectionA: { status: "pending", error: null },
  sectionB: { status: "pending", error: null, affected_rows: null },
  sectionC: {},
  sectionD: {},
};

async function indexExists() {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_email_unique'`
  );
  return rows.length > 0;
}

async function duplicateEmailGroups() {
  const [rows] = await conn.query(`
    SELECT email, COUNT(*) cnt FROM users
    WHERE email IS NOT NULL AND TRIM(email) != ''
    GROUP BY email HAVING COUNT(*) > 1
  `);
  return rows;
}

async function hashRecorded() {
  const [rows] = await conn.query(
    "SELECT id, hash, created_at FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
    [HASH_0019]
  );
  return rows[0] ?? null;
}

async function duplicateHashes() {
  const [rows] = await conn.query(
    "SELECT hash, COUNT(*) cnt FROM __drizzle_migrations GROUP BY hash HAVING COUNT(*) > 1"
  );
  return rows;
}

// Step 1-2: Preflight
report.preflight.index_absent = !(await indexExists());
const dupes = await duplicateEmailGroups();
report.preflight.duplicate_email_groups = dupes.length;
report.preflight.duplicates = dupes;
report.preflight.hash_absent = (await hashRecorded()) === null;

if (!report.preflight.index_absent) {
  report.sectionA.status = "skipped";
  report.sectionA.error = "Index already exists";
} else if (dupes.length > 0) {
  report.sectionA.status = "blocked";
  report.sectionA.error = "Duplicate emails present";
} else {
  // Step 3-4: DDL
  try {
    await conn.query(DDL);
    report.sectionA.status = "success";
    report.sectionA.index_exists_after = await indexExists();
    if (!report.sectionA.index_exists_after) {
      report.sectionA.status = "failed";
      report.sectionA.error = "Index not found after DDL";
    }
  } catch (err) {
    report.sectionA.status = "failed";
    report.sectionA.error = { message: err.message, code: err.code };
  }
}

// Step 5-6: Hash insert (only if DDL succeeded or index already verified)
if (
  report.sectionA.status === "success" &&
  report.preflight.hash_absent
) {
  try {
    const [res] = await conn.query(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `__drizzle_migrations` WHERE `hash` = ?)",
      [HASH_0019, CREATED_AT_0019, HASH_0019]
    );
    report.sectionB.status = "success";
    report.sectionB.affected_rows = res.affectedRows ?? 0;
  } catch (err) {
    report.sectionB.status = "failed";
    report.sectionB.error = { message: err.message, code: err.code };
  }
} else if (!report.preflight.hash_absent) {
  report.sectionB.status = "skipped";
  report.sectionB.error = "Hash already recorded";
} else {
  report.sectionB.status = "blocked";
  report.sectionB.error = "DDL did not succeed";
}

// Step 7-8: Verification + reconciliation
const [totalRows] = await conn.query(
  "SELECT COUNT(*) c FROM __drizzle_migrations"
);
const hashRow = await hashRecorded();
const dupeHashes = await duplicateHashes();

report.sectionC = {
  index_exists: await indexExists(),
  hash_recorded: hashRow !== null,
  hash_row: hashRow,
  duplicate_hashes: dupeHashes.length,
  duplicate_hash_groups: dupeHashes,
  total_migration_rows: Number(totalRows[0].c),
  pass:
    (await indexExists()) &&
    hashRow !== null &&
    hashRow.created_at === CREATED_AT_0019 &&
    dupeHashes.length === 0,
};

// Journal tags vs recorded hashes reconciliation
const journal = JSON.parse(
  fs.readFileSync("drizzle/meta/_journal.json", "utf8")
);
const journalTags = journal.entries.map((e) => e.tag);

const recorded = [];
for (const entry of journal.entries) {
  const h = hashFile(entry.tag);
  const [r] = await conn.query(
    "SELECT 1 ok FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
    [h]
  );
  recorded.push({
    idx: entry.idx,
    tag: entry.tag,
    hash: h,
    recorded: r.length > 0,
  });
}

report.sectionD = {
  journal_entry_count: journalTags.length,
  recorded_in_db: recorded.filter((r) => r.recorded).length,
  missing_from_db: recorded.filter((r) => !r.recorded).map((r) => r.tag),
  lineage: recorded,
  orphan_bootstrap_rows: "814a08e4, 41fb28ff, 6d466225, 6e4f95fe (legacy, retained)",
  expected_total_rows: 30,
  actual_total_rows: Number(totalRows[0].c),
  reconciliation_complete:
    recorded.every((r) => r.recorded) &&
    Number(totalRows[0].c) === 30 &&
    dupeHashes.length === 0,
};

report.final_verdict =
  report.sectionA.status === "success" &&
  report.sectionB.status === "success" &&
  report.sectionC.pass &&
  report.sectionD.reconciliation_complete
    ? "SUCCESS"
    : "INCOMPLETE";

console.log(JSON.stringify(report, null, 2));
await conn.end();

if (report.final_verdict !== "SUCCESS") {
  process.exit(1);
}
