import fs from "fs";
import crypto from "crypto";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "./lib/tidb-audit-connection.mjs";

const APPROVED_CHECKSUM =
  "8d99ab7356d5c532675435691f0e5040f44c6c825a60431dede9d2929fe30dd6";

const EXCLUDE = new Set([
  "0019_users_email_unique",
  "0021_audit_events",
  "0022_order_tracking_token",
  "0023_customer_push_subscriptions",
  "0024_orders_ready_push_sent_at",
]);

const BASELINE_HASHES = [
  "448d741eeb328825cb87b408ef5974f8f976559b1aa8ca56e2c0f2f9398c3d6e",
  "796274c6ca459d4a33978ec037193302c806133330bce69e69766aaeff431a5a",
  "cc92e64445351d1e47bd44f6d15ec66882ef300e4ad85e317d6e7dbb3a2667a5",
  "7f6cd216692cfca26e16eeea90346f96752b59f14abba877e94835f82ebe0ff1",
  "f2dd81bb61f404745aab9421643f6944776c9f30fa48b28eea19e0c588d8271d",
  "7d0f411c417a8cbf343f53338a9cece3868e218e63a429d986e319ff5fc2af8d",
  "d0038ee749899985d97fb6d5217cfbc86cac53263e0acade37fcaa2b4eb4f85b",
  "a08e229f24acc0f42f1c8c49a0924d91d44c62ece80cb3d56cf2d4f45e19e766",
  "244c3fbe0cc6b43b2636deb870fc905460bda9770ef30e3efdc08ad0765b53d4",
  "6288ca9169d99477edceb7410958b67ca06fac1f54a813ba1d8257caa3d3e3eb",
  "b6ab6fba0518a9f65065683e8165012b7e15b9594fc5866bbe374ca20d8b11ee",
  "69fe4903bdcd5c06cf23bb7f8559c0acaad228914c4b928d786141dd005d3f25",
  "b7ca2ec5c157075eed59fd704f6fbeed0ee7704b125fbb82b5aafe8623337e79",
  "f6d8a8c53083b8cc8e13c660a5f9be8bcab5cc59551404f795ce5fdfc5ea5461",
  "aba22acc8f9dc3d2bfde24f785f71b1b14a5c9a894a86af0888d674635da6988",
  "1408c04fa07c2fd18da254349548a617910cb01efe26102b369b75d7b8ba0f0c",
  "c40b1501f8df6048e04b9073946ded91f8eb344a5c6801f07f6d28e57c9131c6",
  "c32e0e75cd3c0a0e89b87f6c5cc1f90c1912c14c3a422a04a6bdac6383d0d887",
  "cdd0c8c5419f8043b06fe4118565e0c05b8bae5cdf894473f946ffcce1c36b1f",
  "ed7c84f75b6123b6dfdb3ba7ca8dca387153004b6c91baad45521e2f87179528",
  "9afc1d721c813bb30decdebc90015e1bec174b3ef93b89c4f49ae5f8e589bec1",
];

function hashFile(tag) {
  const content = fs.readFileSync(`drizzle/${tag}.sql`, "utf8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

const journal = JSON.parse(
  fs.readFileSync("drizzle/meta/_journal.json", "utf8")
);

const baseline = journal.entries
  .filter((e) => !EXCLUDE.has(e.tag))
  .map((e) => ({
    tag: e.tag,
    when: e.when,
    hash: hashFile(e.tag),
  }));

if (baseline.length !== 21) {
  throw new Error(`Expected 21 baseline entries, got ${baseline.length}`);
}

const manifest = baseline
  .map((r) => `${r.tag}|${r.when}|${r.hash}`)
  .join("\n");
const checksum = crypto.createHash("sha256").update(manifest).digest("hex");

if (checksum !== APPROVED_CHECKSUM) {
  throw new Error(
    `CHECKSUM_MISMATCH: got ${checksum}, expected ${APPROVED_CHECKSUM}`
  );
}

for (let i = 0; i < baseline.length; i++) {
  if (baseline[i].hash !== BASELINE_HASHES[i]) {
    throw new Error(`HASH_ORDER_MISMATCH at ${baseline[i].tag}`);
  }
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("NO_DATABASE_URL");

const target = auditConnectionTarget(url);
if (!/gateway01/i.test(target.host) || target.database !== "mineuqr") {
  throw new Error(`WRONG_TARGET: ${JSON.stringify(target)}`);
}

const conn = await createAuditReadonlyConnection(url);

const result = {
  executed_at: new Date().toISOString(),
  target,
  package_checksum: checksum,
  before_count: null,
  after_count: null,
  inserts_attempted: 0,
  inserts_applied: 0,
  execution: { status: "pending", error: null },
  verification: {},
};

try {
  const [before] = await conn.query(
    "SELECT COUNT(*) c FROM __drizzle_migrations"
  );
  result.before_count = Number(before[0].c);

  await conn.beginTransaction();

  for (const row of baseline) {
    const [res] = await conn.query(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `__drizzle_migrations` WHERE `hash` = ?)",
      [row.hash, row.when, row.hash]
    );
    result.inserts_attempted++;
    result.inserts_applied += res.affectedRows ?? 0;
  }

  await conn.commit();
  result.execution.status = "success";
} catch (err) {
  try {
    await conn.rollback();
  } catch {
    /* ignore */
  }
  result.execution.status = "failed";
  result.execution.error = { message: err.message, code: err.code };
  console.log(JSON.stringify(result, null, 2));
  await conn.end();
  process.exit(1);
}

const [after] = await conn.query("SELECT COUNT(*) c FROM __drizzle_migrations");
result.after_count = Number(after[0].c);

const placeholders = BASELINE_HASHES.map(() => "?").join(", ");
const [present] = await conn.query(
  `SELECT COUNT(*) c FROM __drizzle_migrations WHERE hash IN (${placeholders})`,
  BASELINE_HASHES
);
result.verification.baseline_present = Number(present[0].c);

const [dupes] = await conn.query(
  "SELECT hash, COUNT(*) cnt FROM __drizzle_migrations GROUP BY hash HAVING COUNT(*) > 1"
);
result.verification.duplicate_groups = dupes.length;
result.verification.duplicates = dupes;

result.verification.pass =
  result.after_count === 29 &&
  result.verification.baseline_present === 21 &&
  result.verification.duplicate_groups === 0;

result.c3_gate =
  result.verification.pass && result.execution.status === "success"
    ? "GO"
    : "NO-GO";

console.log(JSON.stringify(result, null, 2));
await conn.end();
