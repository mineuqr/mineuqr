/**
 * Idempotent schema verification for staging/production deploys.
 * Compares live DB against code expectations — does NOT run drizzle migrate.
 *
 * Usage: node scripts/verify-schema-deployment.cjs
 * Exit 0 = all required objects present; 1 = missing objects listed.
 */

require("dotenv").config();

const REQUIRED = {
  usersColumns: ["emailVerifiedAt", "passwordChangedAt", "sessionValidAfter"],
  usersIndexes: ["users_email_unique"],
  tables: ["auth_tokens"],
  orderReadTables: [
    "order_read_orders",
    "order_read_order_line_items",
    "order_read_order_timeline",
    "order_read_operational_kpi_daily",
    "order_read_analytics_daily",
    "order_read_public_order_status",
    "order_read_backfill_runs",
  ],
  operationalDeviceTables: ["operational_devices", "operational_device_tokens"],
  operationalDeviceColumns: [
    ["operational_devices", "screenConfig"],
    ["operational_devices", "screenConfigRevision"],
  ],
  orderReadColumns: [["order_read_order_line_items", "categoryProjection"]],
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

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const { createAuditReadonlyConnection } = await import("./lib/tidb-audit-connection.mjs");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[schema-verify] DATABASE_URL is required");
    process.exit(1);
  }

  const conn = await createAuditReadonlyConnection(url);
  const missing = [];

  try {
    for (const col of REQUIRED.usersColumns) {
      if (!(await columnExists(conn, "users", col))) {
        missing.push(`users.${col}`);
      }
    }
    for (const idx of REQUIRED.usersIndexes) {
      if (!(await indexExists(conn, "users", idx))) {
        missing.push(`index:users.${idx}`);
      }
    }
    for (const table of REQUIRED.tables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const table of REQUIRED.orderReadTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const table of REQUIRED.operationalDeviceTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.operationalDeviceColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, column] of REQUIRED.orderReadColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }

    if (missing.length === 0) {
      console.log("[schema-verify] OK — required schema objects present (auth, order-read, operational-device).");
      return;
    }

    console.error("[schema-verify] MISSING required objects:");
    for (const m of missing) console.error(`  - ${m}`);
    console.error(
      "[schema-verify] Fix: node scripts/migration-preflight.cjs && pnpm exec drizzle-kit migrate"
    );
    console.error(
      "[schema-verify] Production: see scripts/recovery/migration-0054-0057-preflight.mjs"
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
