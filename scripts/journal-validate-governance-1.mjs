/**
 * DB-MIGRATION-GOVERNANCE-1 — hash capture + 0021–0024 SQL validation on isolated DB.
 */
import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { parseDatabaseUrl, resolveTlsForHost } from "./lib/tidb-audit-connection.mjs";

const VALIDATE_DB = "mineuqr_journal_validate_g1";
const TARGET_TAGS = [
  "0021_audit_events",
  "0022_order_tracking_token",
  "0023_customer_push_subscriptions",
  "0024_orders_ready_push_sent_at",
];

function hashFile(tag) {
  const content = fs.readFileSync(`drizzle/${tag}.sql`, "utf8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function connectAdmin(baseUrl) {
  const cfg = parseDatabaseUrl(baseUrl);
  const ssl = resolveTlsForHost(cfg);
  return {
    cfg,
    conn: await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      ...(ssl ? { ssl } : {}),
    }),
  };
}

async function main() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("DATABASE_URL required");

  const hashes = Object.fromEntries(TARGET_TAGS.map((tag) => [tag, hashFile(tag)]));
  console.log("=== Captured baseline hashes (Drizzle sha256 of SQL file) ===");
  console.log(JSON.stringify(hashes, null, 2));

  const { cfg, conn: admin } = await connectAdmin(baseUrl);
  await admin.query(`DROP DATABASE IF EXISTS \`${VALIDATE_DB}\``);
  await admin.query(`CREATE DATABASE \`${VALIDATE_DB}\``);
  await admin.end();

  const ssl = resolveTlsForHost(cfg);
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: VALIDATE_DB,
    ...(ssl ? { ssl } : {}),
  });

  await conn.query(
    "CREATE TABLE orders (id int AUTO_INCREMENT PRIMARY KEY, status varchar(32) NOT NULL DEFAULT 'pending')"
  );

  for (const tag of TARGET_TAGS) {
    const sql = fs.readFileSync(`drizzle/${tag}.sql`, "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    console.log(`Applied: ${tag}`);
  }

  async function exists(table) {
    const [r] = await conn.query(
      "SELECT 1 ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [VALIDATE_DB, table]
    );
    return r.length > 0;
  }
  async function col(table, column) {
    const [r] = await conn.query(
      "SELECT 1 ok FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [VALIDATE_DB, table, column]
    );
    return r.length > 0;
  }
  async function idx(table, indexName) {
    const [r] = await conn.query(
      "SELECT 1 ok FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
      [VALIDATE_DB, table, indexName]
    );
    return r.length > 0;
  }

  const checks = {
    audit_events: await exists("audit_events"),
    trackingToken: await col("orders", "trackingToken"),
    orders_tracking_token_unique: await idx("orders", "orders_tracking_token_unique"),
    customer_push_subscriptions: await exists("customer_push_subscriptions"),
    readyPushSentAt: await col("orders", "readyPushSentAt"),
  };
  console.log("\n=== Schema object checks (0021–0024) ===");
  console.log(JSON.stringify(checks, null, 2));

  await conn.end();

  const { conn: admin2 } = await connectAdmin(baseUrl);
  await admin2.query(`DROP DATABASE IF EXISTS \`${VALIDATE_DB}\``);
  await admin2.end();
  console.log("\nValidation DB dropped (cleanup complete).");

  if (!Object.values(checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
