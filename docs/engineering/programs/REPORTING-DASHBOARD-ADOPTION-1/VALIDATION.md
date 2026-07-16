# REPORTING-DASHBOARD-ADOPTION-1 — Validation

**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## Commands

```bash
pnpm exec vitest run \
  client/src/lib/settlementOverviewDisplay.test.ts \
  client/src/lib/settlementTrendDisplay.test.ts \
  client/src/lib/__tests__/reportingDashboardAdoption.architecture.guards.test.ts

pnpm db:governance-check
pnpm build
```

---

## Results

| Gate | Result |
|------|--------|
| Display + architecture guards | **16 passed** |
| Migration governance | **PASS** — terminus `0069_check_management` (no new migrations) |
| `pnpm build` | **PASS** |

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Dashboard consumes `reporting.*` only for KPIs | **PASS** |
| No Dashboard KPI calculations remain (`buildOrderStatistics`, client rollups) | **PASS** |
| No `ops.getSettlement*` dependency on Dashboard KPI paths | **PASS** |
| Dashboard is Presentation layer (layout / format / visualize) | **PASS** |
| Reporting Platform is single source for Dashboard KPIs | **PASS** |
| No Runtime / Order / Check / DB changes | **PASS** |
| Charts consume Reporting Trend DTOs | **PASS** |
| Reports page compatibility (catalog, order sales, rollups, Excel rows) | **PASS** |
| Revenue from Paid Check grand totals via Reporting DTO | **PASS** |
| Currency / tax via Reporting snapshots (not live settings) | **PASS** |

---

## Regression notes

- Home Operational Snapshot, Sessions KPIs, Revenue Overview/Trends, and Reports tab all render from Reporting DTOs.
- `order.list` remains for operational order/session listing only — not KPI aggregation.
- Legacy `ops.getSettlement*` remains server-side for transitional clients; Dashboard consumers do not call it.

---

## Final certification

**REPORTING-DASHBOARD-ADOPTION-1 — PRODUCTION CERTIFIED**

Dashboard is a presentation consumer of the Reporting Platform. Reporting Platform is the single source of Dashboard KPIs.
