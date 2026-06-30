import "dotenv/config";
import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL);
const cfg = {
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
};
if (/\.tidbcloud\.com$/i.test(cfg.host)) {
  cfg.ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };
}

const conn = await mysql.createConnection(cfg);
console.log("CONNECTED:", cfg.host, "db=", cfg.database);
const [rows] = await conn.query(
  "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 8"
);
console.log("LATEST_MIGRATIONS:", JSON.stringify(rows, null, 2));
const [count] = await conn.query("SELECT COUNT(*) as c FROM __drizzle_migrations");
console.log("TOTAL_MIGRATIONS:", count[0].c);
const [has49] = await conn.query(
  "SELECT hash, created_at FROM __drizzle_migrations WHERE created_at = 1783900000000"
);
console.log("ROW_0049:", has49.length ? "FOUND" : "NOT_FOUND");
const [has48] = await conn.query(
  "SELECT hash, created_at FROM __drizzle_migrations WHERE created_at = 1783800000000"
);
console.log("ROW_0048:", has48.length ? "FOUND" : "NOT_FOUND");
const [tables] = await conn.query("SHOW TABLES LIKE 'restaurant_printers'");
console.log("TABLE_restaurant_printers:", tables.length ? "EXISTS" : "MISSING");
await conn.end();
