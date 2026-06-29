/**
 * ORDERS-READ-MODEL-1 Phase 3A — staging validation & backfill operations.
 *
 * Read-only modes (no confirm):
 *   --verify-schema    Assert order_read_* tables exist (post-migration 0046)
 *   --discover         Inventory write vs projection counts
 *   --dry-run          Show backfill plan without writes
 *   --validate         Integrity audit (write model vs projections)
 *   --verify-telemetry List required ops events (taxonomy check)
 *
 * Mutating modes (require ORDER_READ_STAGING_CONFIRM=YES):
 *   --rollback-tenant  Clear projection rows for one restaurant
 *   --rebuild-tenant   Rollback + tenant backfill
 *
 * Backfill execution uses scripts/order-read-backfill-execute.ts with ORDER_READ_BACKFILL_CONFIRM=YES.
 *
 * Usage:
 *   DATABASE_URL='...' node scripts/order-read-projection-staging.mjs --verify-schema
 *   DATABASE_URL='...' node scripts/order-read-projection-staging.mjs --discover
 *   DATABASE_URL='...' node scripts/order-read-projection-staging.mjs --validate [--restaurant-id=123]
 *   DATABASE_URL='...' ORDER_READ_STAGING_CONFIRM=YES node scripts/order-read-projection-staging.mjs --rollback-tenant --restaurant-id=123
 *   DATABASE_URL='...' ORDER_READ_STAGING_CONFIRM=YES node scripts/order-read-projection-staging.mjs --rebuild-tenant --restaurant-id=123
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  ORDER_READ_PROJECTION_TABLES,
  ORDER_READ_TENANT_ROLLBACK_TABLES,
  ORDER_READ_BACKFILL_OPS_EVENTS,
  ORDER_READ_PROJECTION_OPS_EVENTS,
  parseCliFlag,
  requireDatabaseUrl,
  requireConfirm,
  assertPhase3AGuards,
  compareOrderCounts,
  compareOrderRow,
} from "./lib/order-read-staging-logic.mjs";
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODES = [
  "verify-schema",
  "discover",
  "dry-run",
  "validate",
  "verify-telemetry",
  "rollback-tenant",
  "rebuild-tenant",
];

function activeMode(argv) {
  return MODES.find((m) => argv.includes(`--${m}`));
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function verifySchema(conn) {
  const missing = [];
  for (const table of ORDER_READ_PROJECTION_TABLES) {
    if (!(await tableExists(conn, table))) missing.push(table);
  }
  if (missing.length > 0) {
    console.error("[order-read-staging] MISSING tables:", missing.join(", "));
    console.error("[order-read-staging] Apply: DATABASE_URL=... pnpm db:migrate");
    process.exit(1);
  }
  console.log("[order-read-staging] schema OK — all order_read_* tables present");
}

async function discover(conn) {
  const [[{ restaurantCount }]] = await conn.query(
    "SELECT COUNT(*) AS restaurantCount FROM restaurants"
  );
  const [[{ orderCount }]] = await conn.query("SELECT COUNT(*) AS orderCount FROM orders");
  const [[{ projectionOrderCount }]] = await conn.query(
    "SELECT COUNT(*) AS projectionOrderCount FROM order_read_orders"
  );
  const [backfillRuns] = await conn.query(
    "SELECT status, COUNT(*) AS c FROM order_read_backfill_runs GROUP BY status"
  );
  console.log("[order-read-staging] discover:");
  console.log(`  restaurants: ${restaurantCount}`);
  console.log(`  write orders: ${orderCount}`);
  console.log(`  projection orders: ${projectionOrderCount}`);
  console.log("  backfill runs:", backfillRuns);
}

async function dryRun(conn, restaurantId) {
  if (restaurantId) {
    const [[{ orderCount }]] = await conn.query(
      "SELECT COUNT(*) AS orderCount FROM orders WHERE restaurantId = ?",
      [restaurantId]
    );
    console.log(
      `[order-read-staging] dry-run tenant backfill: restaurantId=${restaurantId} orders=${orderCount}`
    );
    return;
  }
  const [rows] = await conn.query(
    `SELECT o.restaurantId, COUNT(*) AS orderCount
     FROM orders o GROUP BY o.restaurantId ORDER BY o.restaurantId`
  );
  console.log("[order-read-staging] dry-run full backfill plan:");
  for (const row of rows) {
    console.log(`  restaurantId=${row.restaurantId} orders=${row.orderCount}`);
  }
}

async function validateIntegrity(conn, restaurantId) {
  const params = [];
  let where = "";
  if (restaurantId) {
    where = "WHERE o.restaurantId = ?";
    params.push(restaurantId);
  }

  const [countRows] = await conn.query(
    `SELECT o.restaurantId,
            COUNT(*) AS writeCount,
            (SELECT COUNT(*) FROM order_read_orders p WHERE p.restaurantId = o.restaurantId) AS projectionCount
     FROM orders o
     ${where}
     GROUP BY o.restaurantId`,
    params
  );

  const mismatches = [];
  for (const row of countRows) {
    const countMismatch = compareOrderCounts(
      row.restaurantId,
      Number(row.writeCount),
      Number(row.projectionCount)
    );
    if (countMismatch) mismatches.push(countMismatch);
  }

  const [pairs] = await conn.query(
    `SELECT o.restaurantId, o.id AS orderId, o.orderNumber, o.status, o.totalAmount, o.tableNumber, o.trackingToken,
            p.orderId AS projectionOrderId, p.orderNumber AS pOrderNumber, p.status AS pStatus,
            p.totalAmount AS pTotalAmount, p.tableNumber AS pTableNumber, p.trackingToken AS pTrackingToken,
            p.restaurantId AS pRestaurantId
     FROM orders o
     LEFT JOIN order_read_orders p ON p.restaurantId = o.restaurantId AND p.orderId = o.id
     ${where}
     LIMIT 5000`,
    params
  );

  for (const row of pairs) {
    const write = {
      restaurantId: row.restaurantId,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      status: row.status,
      totalAmount: String(row.totalAmount),
      tableNumber: row.tableNumber,
      trackingToken: row.trackingToken,
    };
    const projection = row.projectionOrderId
      ? {
          restaurantId: row.pRestaurantId,
          orderId: row.projectionOrderId,
          orderNumber: row.pOrderNumber,
          status: row.pStatus,
          totalAmount: String(row.pTotalAmount),
          tableNumber: row.pTableNumber,
          trackingToken: row.pTrackingToken,
        }
      : null;
    mismatches.push(...compareOrderRow(write, projection));
  }

  if (mismatches.length === 0) {
    console.log("[order-read-staging] validate OK — no integrity mismatches in sample");
    return;
  }

  console.error(`[order-read-staging] validate FAILED — ${mismatches.length} mismatch(es):`);
  for (const m of mismatches.slice(0, 20)) {
    console.error(" ", JSON.stringify(m));
  }
  if (mismatches.length > 20) {
    console.error(`  ... and ${mismatches.length - 20} more`);
  }
  process.exit(1);
}

function verifyTelemetry() {
  console.log("[order-read-staging] required backfill ops events:");
  for (const e of ORDER_READ_BACKFILL_OPS_EVENTS) console.log(`  - ${e}`);
  console.log("[order-read-staging] required projection consumer ops events (inactive in Phase 3A):");
  for (const e of ORDER_READ_PROJECTION_OPS_EVENTS) console.log(`  - ${e}`);
  console.log("[order-read-staging] telemetry taxonomy OK (see server/_core/opsTaxonomy.ts)");
}

async function rollbackTenant(conn, restaurantId) {
  requireConfirm("ORDER_READ_STAGING_CONFIRM");
  assertPhase3AGuards();
  if (!restaurantId) throw new Error("--restaurant-id required for rollback-tenant");

  for (const table of ORDER_READ_TENANT_ROLLBACK_TABLES) {
    if (table === "order_read_public_order_status") {
      await conn.query("DELETE FROM order_read_public_order_status WHERE restaurantId = ?", [
        restaurantId,
      ]);
    } else {
      await conn.query(`DELETE FROM \`${table}\` WHERE restaurantId = ?`, [restaurantId]);
    }
  }
  console.log(`[order-read-staging] rollback-tenant complete for restaurantId=${restaurantId}`);
}

function runBackfillExecute(args) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "order-read-backfill-execute.ts");
    const child = spawn("npx", ["tsx", script, ...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        ORDER_READ_BACKFILL_CONFIRM: "YES",
      },
      shell: true,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`backfill execute exited ${code}`));
    });
  });
}

async function rebuildTenant(conn, restaurantId) {
  requireConfirm("ORDER_READ_STAGING_CONFIRM");
  assertPhase3AGuards();
  if (!restaurantId) throw new Error("--restaurant-id required for rebuild-tenant");

  await rollbackTenant(conn, restaurantId);
  await runBackfillExecute(["--scope", "tenant", "--restaurant-id", String(restaurantId)]);
  await validateIntegrity(conn, restaurantId);
  console.log(`[order-read-staging] rebuild-tenant complete for restaurantId=${restaurantId}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = activeMode(argv);
  if (!mode) {
    console.error(`[order-read-staging] mode required: ${MODES.map((m) => `--${m}`).join(" | ")}`);
    process.exit(1);
  }

  const restaurantIdRaw = parseCliFlag(argv, "--restaurant-id");
  const restaurantId = restaurantIdRaw ? Number(restaurantIdRaw) : undefined;

  if (mode === "verify-telemetry") {
    verifyTelemetry();
    return;
  }

  const url = requireDatabaseUrl();
  const conn = await createAuditReadonlyConnection(url);
  try {
    switch (mode) {
      case "verify-schema":
        await verifySchema(conn);
        break;
      case "discover":
        await verifySchema(conn);
        await discover(conn);
        break;
      case "dry-run":
        await verifySchema(conn);
        await dryRun(conn, restaurantId);
        break;
      case "validate":
        await verifySchema(conn);
        await validateIntegrity(conn, restaurantId);
        break;
      case "rollback-tenant":
        await verifySchema(conn);
        await rollbackTenant(conn, restaurantId);
        break;
      case "rebuild-tenant":
        await verifySchema(conn);
        await rebuildTenant(conn, restaurantId);
        break;
      default:
        throw new Error(`unsupported mode: ${mode}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error("[order-read-staging] error:", error.message ?? error);
  process.exit(1);
});
