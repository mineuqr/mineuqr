// Minimal local DB compatibility patch for AUTH2-B schema changes.
// Applies only the missing columns/table needed by current server code.

const path = require("path");
const mysql = require("mysql2/promise");

function loadEnv() {
  // Load root .env if present.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("dotenv").config({ path: path.join(process.cwd(), ".env") });
  } catch {
    // ignore
  }
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    "SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    "SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [table]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureUserColumns(conn) {
  const needEmailVerifiedAt = !(await columnExists(conn, "users", "emailVerifiedAt"));
  const needPasswordChangedAt = !(await columnExists(conn, "users", "passwordChangedAt"));

  if (!needEmailVerifiedAt && !needPasswordChangedAt) {
    console.log("[db] users columns already present");
    return;
  }

  const addParts = [];
  if (needEmailVerifiedAt) addParts.push("ADD `emailVerifiedAt` timestamp NULL");
  if (needPasswordChangedAt) addParts.push("ADD `passwordChangedAt` timestamp NULL");

  const sql = `ALTER TABLE \`users\` ${addParts.join(", ")};`;
  console.log("[db] applying:", sql);
  await conn.query(sql);
}

async function ensureAuthTokensTable(conn) {
  const exists = await tableExists(conn, "auth_tokens");
  if (exists) {
    console.log("[db] auth_tokens table already present");
    return;
  }

  // Mirrors drizzle/0017_auth_tokens.sql but safe to run once.
  const statements = [
    `CREATE TABLE \`auth_tokens\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`userId\` int NOT NULL,
      \`type\` enum('password_reset','email_verify') NOT NULL,
      \`tokenHash\` varchar(64) NOT NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`usedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    );`,
    "CREATE INDEX `auth_tokens_user_id` ON `auth_tokens` (`userId`);",
    "CREATE INDEX `auth_tokens_token_hash` ON `auth_tokens` (`tokenHash`);",
    "CREATE INDEX `auth_tokens_type` ON `auth_tokens` (`type`);",
  ];

  for (const s of statements) {
    console.log("[db] applying:", s.split("\n")[0]);
    await conn.query(s);
  }
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required (set it or add it to .env)");

  const conn = await mysql.createConnection(url);
  try {
    await ensureUserColumns(conn);
    await ensureAuthTokensTable(conn);
    console.log("[db] done");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[db] failed:", e);
  process.exit(1);
});

