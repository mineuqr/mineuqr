import type { ReportsAssetDefinition } from "./reportsTypes";

export const REPORTS_DOMAIN_ID = "reports" as const;

/** REBUILD-5C — canonical Reports domain asset registry (ownership metadata). */
export const REPORTS_ASSET_DEFINITIONS: ReportsAssetDefinition[] = [
  // ── Overview / home KPIs ──
  {
    id: "home-kpi-strip",
    category: "kpi",
    ownerPath: "components/admin/domains/reports/ReportsHomeKpiSection",
    queryKey: "admin.getDashboardSummary",
    surfaces: ["overview"],
  },
  {
    id: "home-status-indicator",
    category: "metadata",
    ownerPath: "components/admin/domains/reports/ReportsStatusIndicator",
    surfaces: ["overview"],
  },
  {
    id: "api-get-dashboard-summary",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getDashboardSummary",
    surfaces: ["overview"],
  },
  {
    id: "helper-dashboard-summary-kpis",
    category: "helper",
    ownerPath: "lib/admin/dashboardSummaryKpis.ts",
    surfaces: ["overview"],
  },

  // ── Commercial executive reporting ──
  {
    id: "commercial-executive-kpis",
    category: "executive",
    ownerPath: "components/admin/domains/reports/ReportsExecutiveSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["commercial"],
  },
  {
    id: "commercial-metadata-panel",
    category: "metadata",
    ownerPath: "components/admin/domains/reports/ReportsMetadataSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["commercial"],
  },
  {
    id: "commercial-plan-distribution",
    category: "usage",
    ownerPath: "components/admin/domains/reports/ReportsPlanDistributionSection",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["commercial"],
  },
  {
    id: "commercial-export-actions",
    category: "export",
    ownerPath: "components/admin/domains/reports/ReportsExportActions",
    queryKey: "admin.exportCommercialReport",
    surfaces: ["commercial"],
  },
  {
    id: "api-get-commercial-overview",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getCommercialOverview",
    surfaces: ["commercial"],
  },

  // ── Analytics / growth / revenue ──
  {
    id: "analytics-summary-panel",
    category: "analytics",
    ownerPath: "components/admin/domains/reports/ReportsAnalyticsSection",
    queryKey: "admin.getCommercialAnalytics",
    surfaces: ["analytics"],
  },
  {
    id: "analytics-export",
    category: "export",
    ownerPath: "pages/admin/StatisticsPanel.tsx",
    queryKey: "admin.exportCommercialReport",
    surfaces: ["analytics"],
  },
  {
    id: "api-get-commercial-analytics",
    category: "api",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getCommercialAnalytics",
    surfaces: ["analytics"],
  },
  {
    id: "api-get-extended-stats",
    category: "growth",
    ownerPath: "server/routers.ts",
    queryKey: "admin.getExtendedStats",
    surfaces: ["analytics"],
  },

  // ── Export pipeline ──
  {
    id: "api-export-commercial-report",
    category: "export",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.exportCommercialReport",
    surfaces: ["commercial", "analytics"],
  },
  {
    id: "api-get-commercial-export-package",
    category: "export",
    ownerPath: "server/commercial/adminDashboardRouter.ts",
    queryKey: "admin.getCommercialExportPackage",
    surfaces: ["commercial", "analytics"],
  },
  {
    id: "helper-download-report-file",
    category: "export",
    ownerPath: "lib/admin/downloadReportFile.ts",
    surfaces: ["commercial", "analytics"],
  },

  // ── Revenue / billing artifacts ──
  {
    id: "api-get-user-invoices",
    category: "revenue",
    ownerPath: "server/routers.ts",
    queryKey: "admin.getUserInvoices",
    surfaces: [],
  },
  {
    id: "api-generate-invoice-pdf",
    category: "revenue",
    ownerPath: "server/routers.ts",
    queryKey: "admin.generateInvoicePDF",
    surfaces: [],
  },

  // ── Presentation primitives ──
  {
    id: "stat-card-primitive",
    category: "widget",
    ownerPath: "components/admin/layout/AdminStatCard.tsx",
    surfaces: ["overview", "commercial", "analytics"],
  },
  {
    id: "kpi-section-primitive",
    category: "widget",
    ownerPath: "components/admin/layout/AdminKPISection.tsx",
    surfaces: [],
  },
  {
    id: "helper-format-admin-currency",
    category: "helper",
    ownerPath: "lib/admin/formatAdminCurrency.ts",
    surfaces: ["overview", "commercial", "analytics"],
  },
  {
    id: "helper-format-commercial-overview",
    category: "helper",
    ownerPath: "lib/admin/formatCommercialOverviewDisplay.ts",
    surfaces: ["commercial"],
  },
];

/** Composition section ids exposed by the Reports domain layer. */
export const REPORTS_COMPOSITION_SECTIONS = [
  "ReportsHomeKpiSection",
  "ReportsStatusIndicator",
  "ReportsExecutiveSection",
  "ReportsMetadataSection",
  "ReportsPlanDistributionSection",
  "ReportsCommercialBody",
  "ReportsCommercialPageContent",
  "ReportsExportActions",
  "ReportsAnalyticsSection",
] as const;
