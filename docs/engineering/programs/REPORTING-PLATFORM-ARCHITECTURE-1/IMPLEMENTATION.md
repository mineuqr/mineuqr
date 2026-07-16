# REPORTING-PLATFORM-ARCHITECTURE-1 — Implementation

**Date:** 2026-07-16  

---

## 1. Delivered surface

### Shared contracts

| Path | Role |
|------|------|
| `shared/reporting-platform/kpiDictionary.ts` | Official KPI ownership registry |
| `shared/reporting-platform/reportingContracts.ts` | Reporting DTOs |
| `shared/reporting-platform/reportingMoney.ts` | Pure amount helpers |
| `shared/reporting-platform/index.ts` | Barrel |

### Server platform

| Path | Role |
|------|------|
| `server/reporting-platform/checkReportingRepository.ts` | Read-only Check facts |
| `server/reporting-platform/businessMetricsAggregator.ts` | Pure Revenue / trend aggregation |
| `server/reporting-platform/BusinessMetricsService.ts` | Business KPI service |
| `server/reporting-platform/OperationalMetricsService.ts` | Operational KPI service |
| `server/reporting-platform/OrderSalesMetricsService.ts` | Order Sales via P-10 |
| `server/reporting-platform/CatalogStatsService.ts` | Catalog / visits |
| `server/reporting-platform/orderReadReportingAdapter.ts` | MySQL SELECT for P-06 / P-10 |
| `server/reporting-platform/reportingRouter.ts` | tRPC `reporting.*` |
| `server/reporting-platform/ReportingService.ts` | Façade exports |

### App wiring

`server/routers.ts` → `reporting: reportingRouter`

---

## 2. tRPC contracts (Dashboard-ready)

| Procedure | DTO |
|-----------|-----|
| `reporting.getBusinessMetricsSummary` | `BusinessMetricsSummaryDto` |
| `reporting.getBusinessMetricsTrend` | `BusinessMetricsTrendDto` |
| `reporting.getOperationalMetricsSnapshot` | `OperationalMetricsSnapshotDto` |
| `reporting.getOrderSalesSummary` | `OrderSalesSummaryDto` |
| `reporting.getOrderSalesRollup` | `OrderSalesRollupDto` |
| `reporting.getCatalogStatsSummary` | `CatalogStatsSummaryDto` |

---

## 3. Explicit non-changes

- No Order Domain / Session / Check / Runtime / Business Identity redesign  
- No Dashboard UI cutover in this program (contracts ready for adoption)  
- Legacy `ops.getSettlement*` left mounted (transitional)  
- No new Analytics Projection table (P-10 + Check reads sufficient; see ARCHITECTURE.md)

---

## 4. Adoption guidance (future)

Replace client builders and `ops.getSettlement*` UI bindings with:

```ts
trpc.reporting.getBusinessMetricsSummary.useQuery({ restaurantId, from, to })
trpc.reporting.getOrderSalesSummary.useQuery({ restaurantId })
trpc.reporting.getOperationalMetricsSnapshot.useQuery({ restaurantId })
```

Never reintroduce `buildOrderStatistics` as authority.
