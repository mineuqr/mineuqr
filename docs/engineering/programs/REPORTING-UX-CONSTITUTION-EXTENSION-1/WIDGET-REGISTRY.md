# Widget Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Constitution** | OBJ-02 |
| **Date** | 2026-07-27 |

Widgets present KPIs; they never own data or formulas.

| Widget id | Business label | Presents | Location | Implementation notes |
|-----------|----------------|----------|----------|----------------------|
| `executive-kpi-grid` | Executive KPI grid | `revenue`, `orderSales`, `orderCount`, `refundPublishedTotal`, `taxCollected`, + Payment Overview | Overview | `buildExecutiveSummaryViewModel` → `RestaurantKpiCard` |
| `payment-overview` | Payment Overview | Monetary tender total from Payment Method Analytics | Overview | Card id `paymentOverview`; not a `KpiId` |
| `sales-orders-today-card` | Today's Sales Orders | `orderSales` (business day) | Sales Analytics | ReportsTab Sales area |
| `completed-orders-period-card` | Completed Orders | `completedOrders` / related order counts | Sales Analytics | Period-scoped |
| `order-sales-period-detail` | Sales Orders period detail | `orderSales`, completed order counts by period | Sales Analytics | Rollup list |
| `settlement-trends` | Sales / settlement trends | Trend points from business metrics / trends | Sales Analytics | `SettlementTrendsSection` |
| `settlement-overview` | Financial performance overview | Financial KPIs from business metrics | Financial Analytics | `SettlementOverviewSection` |
| `refund-analytics` | Refund Analytics | `refundPublishedTotal`, refund detail | Financial Analytics | `RefundAnalyticsSection` |
| `payment-method-analysis` | Payment Analytics | Tender mix, monetary / refund tender totals | Financial Analytics | `PaymentMethodAnalysisSection` |
| `advanced-financial` | Advanced Financial | `averageCheck`, `refundRate`, `netRevenue`, paid checks, etc. | Financial Analytics (secondary) | Progressive disclosure |

## Rules

- Widget chrome/layout changes do **not** require KPI ownership ADR.  
- Changing which KPI a Widget displays **does** require Business Question + KPI Dictionary review.  
- Widgets MUST NOT compute money from raw events or reinvent Settlement / Order formulas.
