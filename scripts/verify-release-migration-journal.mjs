/**
 * RELEASE-READINESS-CERTIFICATION-1 — migration journal + registry schema verification.
 * Read-only. Does not apply migrations.
 *
 * Usage: node scripts/verify-release-migration-journal.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("NO_DATABASE_URL");
  process.exit(1);
}

const pool = mysql.createPool(
  url.includes("tidbcloud")
    ? { uri: url, ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
    : url
);

try {
  const [statusCol] = await pool.query(
    "SHOW COLUMNS FROM connector_published_releases LIKE 'status'"
  );
  console.log("STATUS_COL:", JSON.stringify(statusCol[0]?.Type));

  const [cols] = await pool.query("SHOW COLUMNS FROM connector_published_releases");
  console.log("COLUMNS:", cols.map((r) => r.Field).join(", "));

  const [migs] = await pool.query(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 8"
  );
  console.log("RECENT_MIGRATIONS:", JSON.stringify(migs, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await pool.end();
}
