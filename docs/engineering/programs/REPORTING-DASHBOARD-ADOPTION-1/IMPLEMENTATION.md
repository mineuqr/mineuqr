# REPORTING-DASHBOARD-ADOPTION-1 — Implementation

**Date:** 2026-07-16  

---

## 1. Consumer cutover

| Surface | Before | After |
|---------|--------|-------|
| Revenue Overview | `ops.getSettlementSummary` | `reporting.getBusinessMetricsSummary` |
| Revenue Trends | `ops.getSettlementTrend` | `reporting.getBusinessMetricsTrend` |
| Home Operational Snapshot | local status counts + `order.list` sales | `reporting.getOperationalMetricsSnapshot` + `getOrderSalesSummary` |
| Sessions KPIs | local today sales from orders | operational snapshot + today's business metrics |
| Reports catalog cards | restaurant stats / local | `reporting.getCatalogStatsSummary` |
| Reports order sales cards | `buildOrderStatistics` | `reporting.getOrderSalesSummary` |
| Monthly / yearly + Excel | client rollups over `order.list` | `reporting.getOrderSalesRollup` |

---

## 2. Files delivered / updated

### Presentation components

| Path | Role |
|------|------|
| `client/src/components/dashboard/SettlementOverviewSection.tsx` | Revenue DTO cards |
| `client/src/components/dashboard/SettlementTrendsSection.tsx` | Trend DTO charts |
| `client/src/components/dashboard/OperationalSnapshotSection.tsx` | Home operational + order sales |
| `client/src/components/dashboard/ReportsTab.tsx` | Reports page consumer |
| `client/src/components/dashboard/SessionsWorkspacePanel.tsx` | Sessions KPI consumer |

### Display helpers

| Path | Role |
|------|------|
| `client/src/lib/settlementOverviewDisplay.ts` | Format Business Metrics Summary DTO |
| `client/src/lib/settlementTrendDisplay.ts` | Map Trend DTO → chart rows (presentation) |

### Runtime query options

`client/src/lib/queryRuntime.ts` — `reportingBusinessSummaryQueryOptions`, `reportingBusinessTrendQueryOptions`, `reportingOperationalSnapshotQueryOptions`, `reportingOrderSalesQueryOptions` (deprecated settlement aliases retained).

### Shell wiring

`client/src/pages/Dashboard.tsx` — Home uses `OperationalSnapshotSection`; Reports tab uses extracted `ReportsTab` (no inline KPI builders).

---

## 3. Legacy removal

Removed from Dashboard KPI paths:

- `ops.getSettlement*`
- `buildOrderStatistics` / `buildMonthlyReport` / `buildYearlySummary`
- `computeTodayCompletedSales`
- Dead `RestaurantStatisticsSection` local catalog KPI block

`order.list` remains only for operational listing / workspace (orders, session boards) — not for KPI aggregation.

---

## 4. Explicit non-changes

- Reporting Platform contracts and services untouched
- Order Domain, Check Management, Operational Session, Order Read, Runtime, Business Identity untouched
- No migrations / schema changes
- Legacy `ops.getSettlement*` remains on server for transitional non-Dashboard clients

---

## 5. Guards

`client/src/lib/__tests__/reportingDashboardAdoption.architecture.guards.test.ts`
