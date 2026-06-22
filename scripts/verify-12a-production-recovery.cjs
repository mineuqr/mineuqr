/**
 * THERMAL-PRINTING-12A post-migration smoke (read-only).
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslRaw = url.searchParams.get("ssl");
  let ssl;
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw);
    } catch {
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

function createConnectionOptions(databaseUrl) {
  const cfg = parseDatabaseUrl(databaseUrl);
  const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host ?? "");
  const ssl =
    cfg.ssl ??
    (isTidbCloud ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined);
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(ssl ? { ssl } : {}),
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(JSON.stringify({ error: "DATABASE_URL not set" }));
    process.exit(1);
  }

  const conn = await mysql.createConnection(createConnectionOptions(url));
  try {
    const [printJobCols] = await conn.query("SHOW COLUMNS FROM print_jobs");
    const [categoryCols] = await conn.query("SHOW COLUMNS FROM categories");
    const [stationsTables] = await conn.query("SHOW TABLES LIKE 'print_stations'");

    const [legacyJobs] = await conn.query(
      `SELECT id, orderId, printerId, stationId, status, idempotencyKey
       FROM print_jobs
       ORDER BY id DESC
       LIMIT 5`
    );

    const [stationJobCounts] = await conn.query(
      `SELECT stationId, COUNT(*) AS jobCount
       FROM print_jobs
       GROUP BY stationId
       ORDER BY jobCount DESC`
    );

    const [stations] = await conn.query(
      `SELECT id, restaurantId, name, printerId FROM print_stations LIMIT 10`
    );

    const [latestMigration] = await conn.query(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 3"
    );

    console.log(
      JSON.stringify(
        {
          show_columns_print_jobs: printJobCols,
          show_columns_categories: categoryCols.filter((c) =>
            ["stationId", "id", "restaurantId"].includes(c.Field)
          ),
          show_tables_print_stations: stationsTables,
          legacy_print_jobs_sample: legacyJobs,
          station_job_counts: stationJobCounts,
          print_stations_rows: stations,
          latest_migrations: latestMigration,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.log(JSON.stringify({ error: error.message }));
  process.exit(1);
});
