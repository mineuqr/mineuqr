# REPORTING-PRODUCT-SEMANTICS-1 — KPI Inventory & Semantic Audit

## Inventory (user-facing)

| Display (before) | KPI ID | Definition | Owner | API | DTO field | Screens |
|------------------|--------|------------|-------|-----|-----------|---------|
| Revenue | `revenue` | Paid Check grandTotal sum | check | `getBusinessMetricsSummary` | `revenue` | Dashboard overview, Excel Executive/Financial, PDF |
| Order Sales / Order Sales (Period) | `orderSales` | P-10 completedSales | order_read | `getOrderSalesRollup` / Summary | `orderSales` | Dashboard, Excel, PDF |
| Average Check | `averageCheck` | revenue / paidCheckCount | check | summary | `averageCheck` | Dashboard, Excel |
| Average Order | `averageOrder` | orderSales / completed | order_read | summary/rollup | `averageOrder` | Excel |
| Paid Checks | `paidCheckCount` | paid check count | check | summary | `paidCheckCount` | Dashboard, Excel |
| Tax Collected | `taxCollected` | paid taxAmount | check | summary | `taxCollected` | Dashboard, Excel |
| Daily Sales (Revenue) | `dailySales` | Check revenue by day | check | `getBusinessMetricsTrend` | `points[].revenue` | Trends (via series) |
| Complimentary / Voided | counts/amounts | Check outcomes | check | summary | * | Dashboard, Excel |
| Active Sessions / Occupied Tables / Pending Orders | ops KPIs | snapshots | session/order | `getOperationalMetricsSnapshot` | * | Dashboard ops |
| Categories / Items / Visits | catalog | counts | catalog | `getCatalogStatsSummary` | * | Reports catalog cards |
| Admin SaaS revenue / userGrowth | n/a (admin) | subscription / registrations | admin | non-restaurant | * | Admin Statistics (out of restaurant semantics) |

## Semantic findings

| Label | Ambiguous? | Resolution |
|-------|------------|------------|
| Revenue (bare) | **Yes** — confused with Order Sales | → **Check Revenue** |
| Daily Sales (Revenue) | **Yes** — “Sales” | → **Daily Check Revenue** |
| Order Sales | No | Keep |
| Average Check / Average Order | Mild — already paired | Keep; clarify in Reporting Basis |
| Settlement* (component names) | Internal only | Leave code identifiers; UI copy updated |
| Gross Sales / Paid Revenue | Not primary labels today | Listed as deprecated |

## Conclusion

Mapping was correct; ambiguity was **terminology**. Product semantics adoption addresses presentation only.
