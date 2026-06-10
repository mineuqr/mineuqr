/** REBUILD-5C — Reports platform domain type contracts. */

export type ReportsDomainId = "reports";

export type ReportsAssetCategory =
  | "kpi"
  | "executive"
  | "analytics"
  | "revenue"
  | "growth"
  | "usage"
  | "export"
  | "metadata"
  | "widget"
  | "api"
  | "helper";

export type ReportsAssetId =
  | "home-kpi-strip"
  | "home-status-indicator"
  | "commercial-executive-kpis"
  | "commercial-metadata-panel"
  | "commercial-plan-distribution"
  | "commercial-export-actions"
  | "analytics-summary-panel"
  | "analytics-export"
  | "stat-card-primitive"
  | "kpi-section-primitive"
  | "api-get-dashboard-summary"
  | "api-get-commercial-overview"
  | "api-get-commercial-analytics"
  | "api-export-commercial-report"
  | "api-get-commercial-export-package"
  | "api-get-extended-stats"
  | "api-get-user-invoices"
  | "api-generate-invoice-pdf"
  | "helper-dashboard-summary-kpis"
  | "helper-format-admin-currency"
  | "helper-format-commercial-overview"
  | "helper-download-report-file";

export type ReportsSurfaceId = "overview" | "commercial" | "analytics";

export type ReportsAssetDefinition = {
  id: ReportsAssetId;
  category: ReportsAssetCategory;
  /** Primary component or module path. */
  ownerPath: string;
  /** tRPC procedure when applicable. */
  queryKey?: string;
  /** Admin routes where this asset is rendered today. */
  surfaces: ReportsSurfaceId[];
};
