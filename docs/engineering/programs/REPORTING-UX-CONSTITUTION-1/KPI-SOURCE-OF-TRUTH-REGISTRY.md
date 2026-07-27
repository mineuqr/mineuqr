# KPI Source of Truth Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Constitution** | KPI-02, KPI-03, KPI-05 |
| **Code SSOT** | `shared/reporting-platform/kpiDictionary.ts` |
| **Date** | 2026-07-27 |

## Canonical sources

| Business Name | KPI id | Canonical source of truth | Service / DTO | Mixing prohibited |
|---------------|--------|---------------------------|---------------|-------------------|
| Total Sales | `revenue` | `settlement_records` paid gen=1 grandTotal (excl. refund kind) | `getBusinessMetricsSummary` → `BusinessMetricsSummary.revenue` | Order totals, Session totals, live Order Aggregate |
| Sales Orders | `orderSales` | `order_read_analytics_daily.completedSales` | `getOrderSalesSummary` / rollup → `orderSales` | Settlement Record grand totals |
| Orders | `orderCount` | `order_read_analytics_daily.orderCount` | Order Sales summary / rollup | Paid check counts |
| Refund Amount | `refundPublishedTotal` | `settlement_records` where `recordKind=refund` → SUM(grandTotal) | `BusinessMetricsSummary.refundPublishedTotal` | Total Sales mutation, register cash |
| Tax Collected | `taxCollected` | Settlement Record published `taxAmount` snapshot | `BusinessMetricsSummary.taxCollected` | Live `restaurants.tax*` settings |
| Net Sales | `netRevenue` | Derived: Total Sales − Refund Amount | `BusinessMetricsSummary.netRevenue` | Independent third money source |
| Refund Rate | `refundRate` | Derived: Refund Amount / Total Sales | `BusinessMetricsSummary.refundRate` | Complimentary / void rates |
| Payment Overview | `paymentOverview` | Payment Method Analytics from Settlement Record payment snapshots (tender monetary total) | Payment analytics DTOs | Inventing tender totals from Order payments alone |

## Traceability rule

Derived KPIs (`netRevenue`, `refundRate`, averages) MUST declare `dependsOn` in the KPI Dictionary and remain mathematically reducible to canonical owners above.

## Cross-surface identity (KPI-05)

Dashboard, Excel, PDF, and APIs MUST resolve the same KPI id to the same definition and source. Layout may differ; meaning must not.
