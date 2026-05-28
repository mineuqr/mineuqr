/* eslint-disable no-console */
/**
 * Local DB compatibility patch for AUTH2-D.
 *
 * Adds `users.sessionValidAfter TIMESTAMP NULL` if missing.
 *
 * Constraints:
 * - No migration history surgery
 * - No destructive operations
 * - Safe/idempotent
 */

require("dotenv").config();

const mysql = require("mysql2/promise");

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslRaw = url.searchParams.get("ssl");
  let ssl = undefined;
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw);
    } catch {
      // If it's not JSON, pass it through as a string (mysql2 supports some ssl forms).
      ssl = sslRaw;
    }
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl,
  };
}

async function columnExists(conn, schema, table, column) {
  const [rows] = await conn.execute(
    `
      SELECT 1 as ok
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
    `,
    [schema, table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const cfg = parseDatabaseUrl(databaseUrl);

  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: cfg.ssl,
  });

  try {
    const schema = cfg.database;
    const exists = await columnExists(
      conn,
      schema,
      "users",
      "sessionValidAfter"
    );

    if (exists) {
      console.log("[local-patch] users.sessionValidAfter already exists. No-op.");
      return;
    }

    console.log("[local-patch] Applying patch: ALTER TABLE users ADD COLUMN sessionValidAfter TIMESTAMP NULL;");
    await conn.execute(
      "ALTER TABLE `users` ADD COLUMN `sessionValidAfter` TIMESTAMP NULL"
    );
    console.log("[local-patch] Patch applied successfully.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[local-patch] Failed.", err);
  process.exitCode = 1;
});

