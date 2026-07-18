# REPORTING-KPI-GOVERNANCE-1 — Canonical KPI Registry

Machine source: `shared/reporting-platform/kpiDictionary.ts`  
Baseline `calculationVersion`: **1** for all GA KPIs at certification.

---

## Check Management (Revenue SSOT)

| Id | Name | Formula | Service | DTO field | Unit | Agg |
|----|------|---------|---------|-----------|------|-----|
| `revenue` | Revenue | `SUM(grandTotal WHERE paid)` | `getBusinessMetricsSummary` | `revenue` | money | sum |
| `paidCheckCount` | Paid Checks | `COUNT(paid checks)` | `getBusinessMetricsSummary` | `paidCheckCount` | count | count |
| `taxCollected` | Tax Collected | `SUM(taxAmount WHERE paid)` snapshot path | `getBusinessMetricsSummary` | `taxCollected` | money | sum |
| `averageCheck` | Average Check | `Revenue / paidCheckCount` | `getBusinessMetricsSummary` | `averageCheck` | money | derived |
| `complimentaryCount` | Complimentary Checks | `COUNT(complimentary)` | `getBusinessMetricsSummary` | `complimentaryCount` | count | count |
| `complimentaryAmount` | Complimentary Amount | `SUM(grandTotal WHERE complimentary)` | `getBusinessMetricsSummary` | `complimentaryAmount` | money | sum |
| `voidedCount` | Voided Checks | `COUNT(voided)` | `getBusinessMetricsSummary` | `voidedCount` | count | count |
| `dailySales` | Daily Sales (Revenue) | Revenue by `settledAt` day | `getBusinessMetricsTrend` | `points[].revenue` | money | sum |

**Dependencies:** `averageCheck` → `revenue`, `paidCheckCount`; `dailySales` → `revenue`

---

## Order Read (≠ Revenue)

| Id | Name | Formula | Service | DTO field | Unit | Agg |
|----|------|---------|---------|-----------|------|-----|
| `orderSales` | Order Sales | `SUM(completedSales)` P-10 | `getOrderSalesSummary` / Rollup | `orderSales` | money | sum |
| `completedOrders` | Completed Orders | `SUM(completedOrderCount)` | Summary / Rollup | `completedOrders` | count | count |
| `averageOrder` | Average Order | `Order Sales / completedOrders` | Summary / Rollup | `averageOrder` | money | derived |
| `orderCount` | Order Count | `SUM(orderCount)` | Summary / Rollup | `orderCount` / `totalOrders` | count | count |
| `topSellingItems` | Top Selling Items | Line rollup (planned) | Rollup | `(future)` | count | sum |

---

## Operational

| Id | Name | Owner | Service | DTO field |
|----|------|-------|---------|-----------|
| `activeSessions` | Active Sessions | Operational Session | `getOperationalMetricsSnapshot` | `activeSessions` |
| `occupiedTables` | Occupied Tables | Operational Session | same | `occupiedTables` |
| `pendingOrders` | Pending Orders | Order Domain | same | `pendingOrders` |
| `activeOrders` | Active Orders | Order Read | same | `activeOrders` |
| `kitchenLoad` | Kitchen Load | Order Read | same | `kitchenLoad` |

---

## Catalog / Customer

| Id | Name | Owner | Service | DTO field |
|----|------|-------|---------|-----------|
| `catalogCategoryCount` | Categories | Catalog | `getCatalogStatsSummary` | `categoryCount` |
| `catalogItemCount` | Items | Catalog | same | `itemCount` |
| `menuVisits` | Menu Visits | Business Settings | same | `menuVisits` |

---

## Presentation-only (not registry KPIs)

| Display | Notes |
|---------|-------|
| Complimentary Rate | UI ratio from DTO counts — not a registered formula authority |
| Today's … prefixes | Contextual labels over registered KPI values |

---

## Non-canonical (must not be used as Revenue)

- `ops.getSettlementSummary` / `Trend` / `Breakdown`
- `server/analytics/settlementMetrics.ts` (Session `totalAmount`)
