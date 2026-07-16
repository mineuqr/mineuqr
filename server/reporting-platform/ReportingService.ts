/**
 * REPORTING-PLATFORM-ARCHITECTURE-1 — façade for reporting contracts.
 * Presentation consumes these DTOs only — no KPI math in UI.
 */

export {
  getBusinessMetricsSummary,
  getBusinessMetricsTrend,
  ReportingValidationError,
} from "./BusinessMetricsService";
export { getOperationalMetricsSnapshot } from "./OperationalMetricsService";
export {
  getOrderSalesSummary,
  getOrderSalesRollup,
} from "./OrderSalesMetricsService";
export { getCatalogStatsSummary } from "./CatalogStatsService";
