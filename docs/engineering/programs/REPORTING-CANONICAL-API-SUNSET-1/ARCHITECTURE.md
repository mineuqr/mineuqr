# REPORTING-CANONICAL-API-SUNSET-1 — Architecture Governance

## End state

**Reporting Platform (`reporting.*`) = exclusive canonical restaurant business KPI surface.**

## Rules for new code

1. Restaurant Dashboard, Reports, Excel, PDF, widgets **must** consume `reporting.*` DTOs only.
2. Do **not** call `ops.getSettlement*`, `admin.getRevenueByMonth`, or deprecated query aliases.
3. Do **not** invent KPI formulas in presentation.
4. Operational boards may use `ops.getActiveTablesBoard` / feed / action center — these are **not** Revenue APIs.
5. Admin commercial MRR/ARR stays on admin commercial APIs (different domain).

## Soft sunset vs hard delete

| Phase | Action |
|-------|--------|
| This program | Annotate `@deprecated`, document, architecture guards |
| Future | Hard-delete unused procedures after API freeze + consumer confirmation |

## Migration

| Legacy | Migrate to |
|--------|------------|
| `ops.getSettlementSummary` | `reporting.getBusinessMetricsSummary` |
| `ops.getSettlementTrend` | `reporting.getBusinessMetricsTrend` |
| `ops.getSettlementBreakdown` | `reporting.getBusinessMetricsSummary` |
| `opsSettlement*QueryOptions` | `reportingBusiness*QueryOptions` |
| `restaurant.stats` (display) | `reporting.getCatalogStatsSummary` |
| `admin.getRevenueByMonth` | Gap: ADMIN-REPORTING-PLATFORM-ADOPTION |

## Ownership boundaries

| Domain | Owns |
|--------|------|
| Reporting Platform | Restaurant business KPI contracts |
| Check Management | Revenue write SSOT (Paid Check grandTotal) |
| Order Read | Order Sales projection SSOT |
| Ops | Live operational boards (not business Revenue) |
| Admin Commercial | Platform SaaS metrics |

See also: REPORTING-KPI-GOVERNANCE-1, REPORTING-DASHBOARD-ADOPTION-1.
