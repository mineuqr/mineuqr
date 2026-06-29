/**
 * Canonical projection store table names for Phase 3A staging ops.
 */
export const ORDER_READ_PROJECTION_TABLES = [
  "order_read_orders",
  "order_read_order_line_items",
  "order_read_order_timeline",
  "order_read_operational_kpi_daily",
  "order_read_analytics_daily",
  "order_read_public_order_status",
  "order_read_backfill_runs",
] as const;

export type OrderReadProjectionTable = (typeof ORDER_READ_PROJECTION_TABLES)[number];

/** Tables cleared by tenant-scoped rollback (preserves backfill run audit). */
export const ORDER_READ_TENANT_ROLLBACK_TABLES = [
  "order_read_orders",
  "order_read_order_line_items",
  "order_read_order_timeline",
  "order_read_operational_kpi_daily",
  "order_read_analytics_daily",
  "order_read_public_order_status",
] as const;
