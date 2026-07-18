# REPORTING-TIME-SERIES-ARCHITECTURE-1 — Repository Audit

## Verdict

Restaurant business time-series were created in a small set of engines. Canonical Check / Order Sales paths now route period math through Reporting Platform Business Calendar. Legacy Session / admin SaaS month series remain soft-sunset / out-of-domain.

## A. Sites that create time-bucketed series

| ID | File | Purpose | Granularity | Time handling (before → after) | Canonical status |
|----|------|---------|-------------|-------------------------------|------------------|
| A1 | `server/reporting-platform/businessMetricsAggregator.ts` | Check Revenue trend | day / week / month | UTC period keys → **Business Calendar (APP_TIMEZONE)** | **Canonical** |
| A2 | `server/reporting-platform/OrderSalesMetricsService.ts` | Order Sales rollup | day / month | UTC today/month → **Business Calendar selection**; dayKeys still Order Read | **Canonical** (Order Sales) |
| A3 | `server/order/read/.../projectionStatus.ts` `dayKeyFromTimestamp` | P-10 day materialization | day | UTC date prefix of stored timestamp | Upstream fact (Order Read ownership) |
| A4 | `server/analytics/settlementMetrics.ts` `resolvePeriodKey` | Session settlement trend | day / week / month | UTC (unchanged) | **Legacy / soft-sunset** |
| A5 | `server/db.ts` `getRevenueByMonth` | Admin SaaS plan revenue | month | APP_TIMEZONE business months | Admin domain (not restaurant Reporting) |
| A6 | `server/db.ts` `userGrowth` | Admin registration growth | month | APP_TIMEZONE | Admin / commercial |

## B. Presentation consumers (do not create period keys)

| File | Role |
|------|------|
| `SettlementTrendsSection.tsx` | Dashboard charts via `reporting.getBusinessMetricsTrend` |
| `ReportsTab.tsx` | Export bundle (trend + rollup) |
| `periodRange.ts` | Delegates to `businessCalendar*ReportingBounds` |
| `scopeTotals.ts` | Display re-sum of DTO points |
| `buildReportingExportWorkbook.ts` / PDF / `renderTrendChartPng.ts` | Presentation of DTO series |
| `settlementTrendDisplay.ts` | Chart row mapping + labels |

## C. Comparison / growth (before)

No restaurant previous-period / MoM / YoY / growth% / trend-direction framework existed. Peak-period insights on the Dashboard are absolute max in series, not comparisons.

## D. Duplicate aggregation sites

| Site | Status |
|------|--------|
| `buildBusinessMetricsTrend` | Canonical Check Revenue |
| `buildSettlementTrend` | Soft-sunset Session money (non-Revenue) |
| `getOrderSalesRollup` | Canonical Order Sales (≠ Revenue) |
| `getRevenueByMonth` / `userGrowth` | Admin domain |
| `scopedRevenueFromTrend` / `scopedOrderSalesFromRollup` | Presentation re-sum only |

## E. Critical pre-program inconsistencies

1. Check trends used UTC calendar; Sessions “today” and admin months used APP_TIMEZONE.
2. Canonical aggregator imported period helpers from soft-sunset `settlementMetrics.ts`.
3. Export `periodRange` used UTC civil month/year strings.
4. Hour / quarter / year granularities and comparison DTOs were absent.
