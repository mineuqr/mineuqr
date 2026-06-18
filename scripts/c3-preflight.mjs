import crypto from "crypto";
import fs from "fs";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "./lib/tidb-audit-connection.mjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("NO_DATABASE_URL");

const target = auditConnectionTarget(url);
if (!/gateway01/i.test(target.host) || target.database !== "mineuqr") {
  throw new Error(`WRONG_TARGET: ${JSON.stringify(target)}`);
}

const h19 = crypto
  .createHash("sha256")
  .update(fs.readFileSync("drizzle/0019_users_email_unique.sql", "utf8"))
  .digest("hex");

const schemaSrc = fs.readFileSync("drizzle/schema.ts", "utf8");
const schemaExpects =
  /uniqueIndex\("users_email_unique"\)\.on\(table\.email\)/.test(schemaSrc);

const conn = await createAuditReadonlyConnection(url);

const [idx] = await conn.query(
  `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_email_unique'`
);

const [dupes] = await conn.query(`
  SELECT email, COUNT(*) cnt FROM users
  WHERE email IS NOT NULL AND TRIM(email) != ''
  GROUP BY email HAVING COUNT(*) > 1
`);

const [hashRow] = await conn.query(
  "SELECT id FROM __drizzle_migrations WHERE hash = ? LIMIT 1",
  [h19]
);

const checks = {
  users_email_unique_absent: idx.length === 0,
  duplicate_email_groups: dupes.length,
  hash_0019_absent: hashRow.length === 0,
  schema_expects_users_email_unique: schemaExpects,
};

const pass = Object.values(checks).every((v) =>
  typeof v === "boolean" ? v : v === 0
);

console.log(
  JSON.stringify(
    {
      audited_at: new Date().toISOString(),
      target,
      hash_0019: h19,
      checks,
      duplicates: dupes,
      verdict: pass ? "GO" : "NO-GO",
    },
    null,
    2
  )
);

await conn.end();
