# REPORTING-CANONICAL-API-SUNSET-1 — Repository Audit

Machine registry: `shared/reporting-platform/legacyReportingSurfaces.ts`

## Canonical surface (exclusive for restaurant business KPIs)

| Surface | Role |
|---------|------|
| `reporting.getBusinessMetricsSummary` | Revenue / tax / paid checks / average check |
| `reporting.getBusinessMetricsTrend` | Revenue trends |
| `reporting.getOrderSalesSummary` / `getOrderSalesRollup` | Order Read sales KPIs |
| `reporting.getOperationalMetricsSnapshot` | Operational KPIs |
| `reporting.getCatalogStatsSummary` | Catalog / visits |
| `reporting.getKpiCatalog` | KPI governance metadata |

---

## Legacy / non-canonical inventory

| Name | File | Owner | Consumers (verified) | Canonical replacement | Recommendation |
|------|------|-------|----------------------|----------------------|----------------|
| `ops.getSettlementSummary` | `opsRouter` → `settlementMetrics` | Ops legacy | **Tests only** | `reporting.getBusinessMetricsSummary` | Soft-sunset unused |
| `ops.getSettlementTrend` | same | Ops legacy | **Tests only** | `reporting.getBusinessMetricsTrend` | Soft-sunset unused |
| `ops.getSettlementBreakdown` | same | Ops legacy | **Tests only** | `reporting.getBusinessMetricsSummary` | Soft-sunset unused |
| `settlementMetrics` service | `server/analytics/settlementMetrics.ts` | Settlement | ops procedures only | Check Revenue via reporting.* | Soft-sunset unused |
| `opsSettlement*QueryOptions` | `queryRuntime.ts` | Client | **No importers** | `reportingBusiness*QueryOptions` | Soft-sunset alias |
| `admin.getRevenueByMonth` | `routers.ts` → `db.getRevenueByMonth` | Admin EXEC-6 | **Tests only** (no client useQuery) | *Gap* — not restaurant Check Revenue | Soft-sunset + gap program |
| `restaurant.stats` | `routers.ts` | Restaurant | Dashboard **invalidate only** (no useQuery) | `reporting.getCatalogStatsSummary` | Soft-sunset unused |
| `db.getRestaurantStats` | `db.ts` | DB | `CatalogStatsService` + `restaurant.stats` | Keep as **internal adapter** | adapter_internal |
| `ops.getRestaurantOverview` | ops | Ops | Boards + OperationalMetrics adapter | Operational (not Revenue) | **Keep** — not business KPI |
| `admin.getCommercialAnalytics` | admin | Commercial | StatisticsPanel / reports | Out of scope (SaaS MRR) | **Keep** — different domain |

---

## Consumer map (restaurant product)

| Consumer | Uses Reporting Platform? | Uses legacy settlement? |
|----------|--------------------------|-------------------------|
| SettlementOverviewSection | Yes — `getBusinessMetricsSummary` | No |
| SettlementTrendsSection | Yes — `getBusinessMetricsTrend` | No |
| OperationalSnapshotSection | Yes — ops snapshot + order sales | No |
| SessionsWorkspacePanel | Yes — ops snapshot + business summary | No |
| ReportsTab / Excel export | Yes — reporting.* DTOs only | No |
| PDF export | Suspended / DTO-based | No |
| Admin StatisticsPanel | Commercial analytics (not restaurant KPIs) | No |
| Ops boards (tables/feed/action) | Operational ops.* (not Revenue) | No |

---

## Architectural gaps (do not delete)

| Gap | Why |
|-----|-----|
| **ADMIN-REPORTING-PLATFORM-ADOPTION** | Admin needs a defined path for restaurant Check Revenue if required; `admin.getRevenueByMonth` is not that path |

---

## Evidence notes

- Grep across `client/**/*.ts(x)` found **zero** `ops.getSettlement*` / `admin.getRevenueByMonth` production calls.
- `opsSettlement*QueryOptions` defined only in `queryRuntime.ts`, unused elsewhere.
- `restaurant.stats` only appears as `utils.restaurant.stats.invalidate()` in Dashboard.
