# REPORTING-PLATFORM-ARCHITECTURE-1 — KPI Dictionary

Canonical machine registry: `shared/reporting-platform/kpiDictionary.ts` (`KPI_DICTIONARY`).

Governance extension (formulas, versions, catalog API): **REPORTING-KPI-GOVERNANCE-1** — see `docs/engineering/programs/REPORTING-KPI-GOVERNANCE-1/`.

---

## Business metrics

| KPI | Owner | Source of Truth | Contract |
|-----|-------|-----------------|----------|
| **Revenue** | Check | Paid Checks → `SUM(grandTotal)` | `BusinessMetricsSummary` |
| **Tax Collected** | Check | Paid Checks → `SUM(taxAmount)` via Tax Policy Snapshot path | `BusinessMetricsSummary` |
| **Average Check** | Check | Revenue / paidCheckCount | `BusinessMetricsSummary` |
| **Complimentary Count** | Check | `outcome = complimentary` | `BusinessMetricsSummary` |
| **Complimentary Amount** | Check | Complimentary → `SUM(grandTotal)` (not Revenue) | `BusinessMetricsSummary` |
| **Voided Checks** | Check | `outcome = voided` | `BusinessMetricsSummary` |
| **Daily Sales (Revenue)** | Check | Paid Check grand totals by `settledAt` day | `BusinessMetricsTrend` |

### Revenue — explicit non-definitions

- Served order totals  
- Closed session totals  
- Order Domain `totalAmount`  
- Live Business Settings tax configuration  

---

## Order sales metrics (≠ Revenue)

| KPI | Owner | Source of Truth | Contract |
|-----|-------|-----------------|----------|
| **Order Sales** | Order Read | P-10 `completedSales` | `OrderSalesSummary` |
| **Average Order** | Order Read | Order Sales / completedOrderCount | `OrderSalesSummary` |
| **Order Count** | Order Read | P-10 `orderCount` | `OrderSalesSummary` |
| **Top Selling Items** | Order Read | Line-item projections (future rollup) | `OrderSalesRollup` |

---

## Operational metrics

| KPI | Owner | Source of Truth | Contract |
|-----|-------|-----------------|----------|
| **Active Sessions** | Operational Session | Open dining sessions | `OperationalMetricsSnapshot` |
| **Occupied Tables** | Operational Session | Distinct active `tableId` | `OperationalMetricsSnapshot` |
| **Pending Orders** | Order Domain (via overview) | Active fulfilment COUNT | `OperationalMetricsSnapshot` |
| **Active Orders** | Order Read | P-06 `activeOrders` | `OperationalMetricsSnapshot` |
| **Kitchen Load** | Order Read | P-06 pending+preparing+ready (fallback: overview pending) | `OperationalMetricsSnapshot` |

---

## Catalog / customer

| KPI | Owner | Source of Truth | Contract |
|-----|-------|-----------------|----------|
| **Categories** | Catalog | `categories` COUNT | `CatalogStatsSummary` |
| **Items** | Catalog | `menu_items` COUNT | `CatalogStatsSummary` |
| **Menu Visits** | Business Settings / profile | `restaurants.viewCount` | `CatalogStatsSummary` |

---

## Governance rule

Any new KPI **must** be added to `KPI_DICTIONARY` before UI/PDF/AI exposure.
