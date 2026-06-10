# REBUILD-5CB — Reports Ownership Adoption

**Program:** ADMIN-DASHBOARD-REBUILD-5C  
**Phase:** 5CB — Reports Asset Consolidation

---

## Objective

Every reporting asset from REBUILD-5B assigned to **Reports** is registered in `REPORTS_ASSET_DEFINITIONS` with a single domain owner.

---

## KPI Ownership

| Asset | Registry id | Owner path | Query |
|-------|-------------|------------|-------|
| Overview home KPI strip (5 cards) | `home-kpi-strip` | `ReportsHomeKpiSection` | `getDashboardSummary` |
| Commercial executive KPIs (4 cards) | `commercial-executive-kpis` | `ReportsExecutiveSection` | `getCommercialOverview` |
| Analytics platform KPIs (5 cards) | `analytics-summary-panel` | `ReportsAnalyticsSection` | `getCommercialAnalytics` |
| Analytics subscription KPIs (4 cards) | `analytics-summary-panel` | `StatisticsPanel` (wrapped) | `getCommercialAnalytics` |
| Analytics status tiles (4) | `analytics-summary-panel` | `StatisticsPanel` (wrapped) | `getCommercialAnalytics` |
| `AdminStatCard` primitive | `stat-card-primitive` | `layout/AdminStatCard` | — |
| `AdminKPISection` (unused) | `kpi-section-primitive` | `layout/AdminKPISection` | — |

---

## Executive & Commercial Reporting

| Asset | Registry id | Owner path |
|-------|-------------|------------|
| Commercial metadata panel | `commercial-metadata-panel` | `ReportsMetadataSection` |
| Plan distribution table | `commercial-plan-distribution` | `ReportsPlanDistributionSection` |
| Overview status indicator | `home-status-indicator` | `ReportsStatusIndicator` |

---

## Analytics Summaries

| Asset | Registry id | Owner path |
|-------|-------------|------------|
| Full analytics dashboard | `analytics-summary-panel` | `ReportsAnalyticsSection` |
| Growth area chart | `analytics-summary-panel` | `StatisticsPanel` |
| Plan pie chart | `analytics-summary-panel` | `StatisticsPanel` |
| Subscriber table | `analytics-summary-panel` | `StatisticsPanel` |
| Revenue-by-month placeholder | `analytics-summary-panel` | `StatisticsPanel` |
| Renewal rate placeholder | `analytics-summary-panel` | `StatisticsPanel` |

---

## Export Workflows

| Asset | Registry id | Owner path | Query |
|-------|-------------|------------|-------|
| Commercial header export | `commercial-export-actions` | `ReportsExportActions` | `exportCommercialReport` |
| Analytics inline export | `analytics-export` | `StatisticsPanel` | `exportCommercialReport` |
| `CommercialExportButtons` | `commercial-export-actions` | `commercial/` (widget) | `exportCommercialReport` |
| `downloadReportFile` | `helper-download-report-file` | `lib/admin/` | — |
| Export package API | `api-get-commercial-export-package` | server | `getCommercialExportPackage` |

---

## API Ownership

| Procedure | Registry id |
|-----------|-------------|
| `admin.getDashboardSummary` | `api-get-dashboard-summary` |
| `admin.getCommercialOverview` | `api-get-commercial-overview` |
| `admin.getCommercialAnalytics` | `api-get-commercial-analytics` |
| `admin.exportCommercialReport` | `api-export-commercial-report` |
| `admin.getCommercialExportPackage` | `api-get-commercial-export-package` |
| `admin.getExtendedStats` | `api-get-extended-stats` |
| `admin.getUserInvoices` | `api-get-user-invoices` |
| `admin.generateInvoicePDF` | `api-generate-invoice-pdf` |

---

## Helper Ownership

| Module | Registry id |
|--------|-------------|
| `dashboardSummaryKpis.ts` | `helper-dashboard-summary-kpis` |
| `formatAdminCurrency.ts` | `helper-format-admin-currency` |
| `formatCommercialOverviewDisplay.ts` | `helper-format-commercial-overview` |
| `downloadReportFile.ts` | `helper-download-report-file` |

---

## Explicitly NOT Reports (REBUILD-5B)

These remain on `/admin/commercial` but are **Customer Success** owned — not registered in Reports domain:

| Asset | Owner |
|-------|-------|
| `CommercialOverviewSubscriptionHealth` | Customer Success |
| `CommercialOverviewNeedsAttention` | Customer Success |
| `CommercialCustomerSuccessSections` | Customer Success |

Reports domain provides the query hook; CS sections consume it as a **dependency** (not ownership).

---

## Compatibility Shims

Legacy import paths re-export Reports domain components:

| Shim | Re-exports |
|------|------------|
| `sections/overview/OverviewKpiSection` | `ReportsHomeKpiSection` |
| `sections/overview/OverviewStatusIndicator` | `ReportsStatusIndicator` |
| `sections/analytics/AnalyticsSummarySection` | `ReportsAnalyticsSection` |
| `sections/commercial/CommercialOverviewExportActions` | `ReportsExportActions` |
| `sections/commercial/useCommercialOverviewData` | `useReportsCommercialOverviewData` |
