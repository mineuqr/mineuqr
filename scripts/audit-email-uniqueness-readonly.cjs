/**
 * Read-only audit: duplicate emails before 0019_users_email_unique.
 * Usage: node scripts/audit-email-uniqueness-readonly.cjs
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[audit] DATABASE_URL is required");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  try {
    const [dupGroups] = await conn.query(`
      SELECT TRIM(LOWER(email)) AS normalized_email, COUNT(*) AS count
      FROM users
      WHERE email IS NOT NULL AND TRIM(email) <> ''
      GROUP BY TRIM(LOWER(email))
      HAVING COUNT(*) > 1
      ORDER BY count DESC, normalized_email
    `);

    const [dupRows] = await conn.query(`
      SELECT u.id, u.openId, u.email, u.loginMethod, u.role,
             TRIM(LOWER(u.email)) AS normalized_email
      FROM users u
      WHERE u.email IS NOT NULL AND TRIM(u.email) <> ''
        AND TRIM(LOWER(u.email)) IN (
          SELECT normalized_email FROM (
            SELECT TRIM(LOWER(email)) AS normalized_email, COUNT(*) AS c
            FROM users
            WHERE email IS NOT NULL AND TRIM(email) <> ''
            GROUP BY TRIM(LOWER(email))
            HAVING COUNT(*) > 1
          ) d
        )
      ORDER BY normalized_email, u.id
    `);

    const [caseVariants] = await conn.query(`
      SELECT TRIM(LOWER(email)) AS normalized_email,
             GROUP_CONCAT(DISTINCT email ORDER BY email SEPARATOR ' | ') AS raw_variants,
             COUNT(DISTINCT email) AS distinct_raw_count,
             COUNT(*) AS row_count
      FROM users
      WHERE email IS NOT NULL AND TRIM(email) <> ''
      GROUP BY TRIM(LOWER(email))
      HAVING COUNT(DISTINCT email) > 1 OR COUNT(*) > 1
      ORDER BY normalized_email
    `);

    const [whitespaceVariants] = await conn.query(`
      SELECT id, openId, email, loginMethod,
             LENGTH(email) AS email_len,
             LENGTH(TRIM(email)) AS trimmed_len
      FROM users
      WHERE email IS NOT NULL AND email <> TRIM(email)
      ORDER BY id
    `);

    const [[{ total: totalUsers }]] = await conn.query(
      "SELECT COUNT(*) AS total FROM users"
    );
    const [[{ total: totalWithEmail }]] = await conn.query(`
      SELECT COUNT(*) AS total FROM users WHERE email IS NOT NULL AND TRIM(email) <> ''
    `);

    const report = {
      auditedAt: new Date().toISOString(),
      totalUsers,
      totalWithEmail,
      duplicateGroupCount: dupGroups.length,
      duplicateGroups: dupGroups,
      duplicateRecords: dupRows,
      caseOrDuplicateVariants: caseVariants,
      whitespaceVariants,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[audit] Failed:", err.message);
  process.exit(1);
});
