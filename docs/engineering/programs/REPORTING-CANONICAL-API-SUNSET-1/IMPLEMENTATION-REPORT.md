# REPORTING-CANONICAL-API-SUNSET-1 — Implementation Report

## 1. Repository audit results

Complete inventory in [`AUDIT.md`](./AUDIT.md) and machine registry  
`shared/reporting-platform/legacyReportingSurfaces.ts`.

**Finding:** Restaurant Dashboard / Reports / Excel already consume `reporting.*` exclusively for business KPIs. Legacy `ops.getSettlement*` and `admin.getRevenueByMonth` have **no production client consumers** (tests only).

---

## 2. Complete list of legacy reporting APIs

| API | Status |
|-----|--------|
| `ops.getSettlementSummary` | soft_sunset_unused |
| `ops.getSettlementTrend` | soft_sunset_unused |
| `ops.getSettlementBreakdown` | soft_sunset_unused |
| `settlementMetrics` service | soft_sunset_unused |
| `opsSettlementSummaryQueryOptions` | soft_sunset_alias |
| `opsSettlementTrendQueryOptions` | soft_sunset_alias |
| `admin.getRevenueByMonth` / `db.getRevenueByMonth` | soft_sunset_unused (+ gap) |
| `restaurant.stats` | soft_sunset_unused (catalog) |
| `db.getRestaurantStats` | adapter_internal (keep) |
| `ops.getRestaurantOverview` | operational_not_business_kpi (keep) |
| `admin.getCommercialAnalytics` | out_of_scope_admin_commercial (keep) |

---

## 3. Consumer trace (summary)

| API | Production consumers |
|-----|----------------------|
| ops.getSettlement* | **None** (unit tests only) |
| admin.getRevenueByMonth | **None** (unit tests only; Statistics uses commercial analytics) |
| restaurant.stats | Dashboard **invalidate only** |
| opsSettlement*QueryOptions | **None** |
| reporting.* | Dashboard, Reports, Excel (canonical) |

---

## 4. Canonical replacements

| Legacy | Canonical |
|--------|-----------|
| Settlement summary / breakdown | `reporting.getBusinessMetricsSummary` |
| Settlement trend | `reporting.getBusinessMetricsTrend` |
| restaurant.stats (display) | `reporting.getCatalogStatsSummary` |
| Query option aliases | `reportingBusinessSummary/TrendQueryOptions` |
| admin.getRevenueByMonth | **Gap** — ADMIN-REPORTING-PLATFORM-ADOPTION |

---

## 5. Soft sunset actions performed

- `@deprecated REPORTING-CANONICAL-API-SUNSET-1` on ops settlement procedures
- `@deprecated` on `settlementMetrics.ts`, `db.getRevenueByMonth`, `admin.getRevenueByMonth`, `restaurant.stats`
- Strengthened deprecation on `opsSettlement*QueryOptions`
- Reporting router comment: exclusive canonical surface
- **No APIs deleted** (backward compatibility)

---

## 6. Governance guards introduced

`shared/reporting-platform/__tests__/reportingCanonicalApiSunset.architecture.guards.test.ts`

- Soft-sunset registry present
- Deprecated markers on ops settlement
- Dashboard / Reports / exports forbid `FORBIDDEN_RESTAURANT_KPI_CLIENT_APIS`
- Client must not call `admin.getRevenueByMonth`
- Client must not import `opsSettlement*QueryOptions` (except definition site)
- Dashboard still wired to `reporting.*`

---

## 7. Documentation updates

- `AUDIT.md` — discovery + consumer map
- `ARCHITECTURE.md` — migration + ownership rules
- `VALIDATION.md` — checklist
- `IMPLEMENTATION-REPORT.md` — this report
- Shared registry exported from `@shared/reporting-platform`

---

## 8. Risks discovered

1. **External/unknown clients** could still call soft-sunset tRPC procedures — retained for compatibility; guards cover in-repo UI only.
2. **Dashboard still invalidates `restaurant.stats`** after catalog edits — harmless; migrate invalidation when hard-deleting.
3. **Admin restaurant KPI path undefined** — `admin.getRevenueByMonth` is not Check Revenue; gap program required if admin needs it.

---

## 9. Recommendations

1. Open **ADMIN-REPORTING-PLATFORM-ADOPTION** if admin needs restaurant Check KPIs.
2. After API freeze period, hard-delete `ops.getSettlement*` + unused aliases + `admin.getRevenueByMonth`.
3. Migrate Dashboard invalidations from `restaurant.stats` → `reporting.getCatalogStatsSummary`.
4. Keep `getRestaurantStats` as private adapter for CatalogStatsService.

---

## 10. Production certification decision

**REPORTING-CANONICAL-API-SUNSET-1 — PRODUCTION CERTIFIED**

Blocking issues: **none**.

Business formulas and KPI definitions unchanged. Soft-sunset complete with evidence-backed consumer map and CI architecture guards.
