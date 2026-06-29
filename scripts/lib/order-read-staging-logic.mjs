/**
 * ORDERS-READ-MODEL-1 Phase 3A — shared staging validation logic.
 */
export const ORDER_READ_PROJECTION_TABLES = [
  "order_read_orders",
  "order_read_order_line_items",
  "order_read_order_timeline",
  "order_read_operational_kpi_daily",
  "order_read_analytics_daily",
  "order_read_public_order_status",
  "order_read_backfill_runs",
];

export const ORDER_READ_TENANT_ROLLBACK_TABLES = [
  "order_read_orders",
  "order_read_order_line_items",
  "order_read_order_timeline",
  "order_read_operational_kpi_daily",
  "order_read_analytics_daily",
  "order_read_public_order_status",
];

export const ORDER_READ_BACKFILL_OPS_EVENTS = [
  "order_read_backfill_started",
  "order_read_backfill_completed",
  "order_read_backfill_failed",
];

export const ORDER_READ_PROJECTION_OPS_EVENTS = [
  "order_projection_consumer_executed",
  "order_projection_consumer_failed",
  "order_projection_consumer_skipped",
];

export function parseCliFlag(argv, name) {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split("=")[1];
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function requireConfirm(envName) {
  if (process.env[envName] !== "YES") {
    throw new Error(`Refusing to mutate: set ${envName}=YES`);
  }
}

export function assertPhase3AGuards() {
  if (process.env.ORDER_READ_PROJECTIONS_ENABLED === "true") {
    throw new Error("ORDER_READ_PROJECTIONS_ENABLED must remain false in Phase 3A");
  }
}

export function compareOrderCounts(restaurantId, writeCount, projectionCount) {
  if (writeCount === projectionCount) return null;
  return { type: "count_mismatch", restaurantId, writeCount, projectionCount };
}

export function compareOrderRow(write, projection) {
  const mismatches = [];
  if (!projection) {
    mismatches.push({
      type: "missing_projection",
      restaurantId: write.restaurantId,
      orderId: write.orderId,
    });
    return mismatches;
  }
  if (projection.restaurantId !== write.restaurantId) {
    mismatches.push({
      type: "tenant_leak",
      restaurantId: projection.restaurantId,
      orderId: projection.orderId,
      expectedRestaurantId: write.restaurantId,
    });
  }
  for (const field of ["orderNumber", "status", "tableNumber", "trackingToken"]) {
    const w = String(write[field] ?? "");
    const p = String(projection[field] ?? "");
    if (w !== p) {
      mismatches.push({
        type: "field_mismatch",
        restaurantId: write.restaurantId,
        orderId: write.orderId,
        field,
        writeValue: w,
        projectionValue: p,
      });
    }
  }
  const wAmt = Number(write.totalAmount).toFixed(2);
  const pAmt = Number(projection.totalAmount).toFixed(2);
  if (wAmt !== pAmt) {
    mismatches.push({
      type: "field_mismatch",
      restaurantId: write.restaurantId,
      orderId: write.orderId,
      field: "totalAmount",
      writeValue: wAmt,
      projectionValue: pAmt,
    });
  }
  return mismatches;
}
