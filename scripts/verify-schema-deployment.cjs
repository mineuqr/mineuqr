/**
 * Idempotent schema verification for staging/production deploys.
 * Compares live DB against code expectations — does NOT run drizzle migrate.
 *
 * Usage: node scripts/verify-schema-deployment.cjs
 * Exit 0 = all required objects present; 1 = missing objects listed.
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const REQUIRED = {
  usersColumns: ["emailVerifiedAt", "passwordChangedAt", "sessionValidAfter"],
  tables: ["auth_tokens"],
};

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[schema-verify] DATABASE_URL is required");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  const missing = [];

  try {
    for (const col of REQUIRED.usersColumns) {
      if (!(await columnExists(conn, "users", col))) {
        missing.push(`users.${col}`);
      }
    }
    for (const table of REQUIRED.tables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }

    if (missing.length === 0) {
      console.log("[schema-verify] OK — required auth/schema objects present.");
      return;
    }

    console.error("[schema-verify] MISSING required objects:");
    for (const m of missing) console.error(`  - ${m}`);
    console.error(
      "[schema-verify] Fix: run pending journal migrations on a fresh DB, or node scripts/apply-auth2b-local-schema.cjs && node scripts/apply-session-valid-after-local-patch.cjs on existing DB."
    );
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[schema-verify] Failed:", err.message);
  process.exit(1);
});
