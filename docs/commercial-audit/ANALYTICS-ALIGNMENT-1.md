# ANALYTICS-ALIGNMENT-1 — Commercial Analytics Source Alignment

**Date:** 2026-06-09  
**Status:** Complete  

**Related:** [ANALYTICS-ALIGNMENT-1-KPI-MAPPING.md](./ANALYTICS-ALIGNMENT-1-KPI-MAPPING.md), [ADMIN-UX-1E-IMPLEMENTATION.md](./ADMIN-UX-1E-IMPLEMENTATION.md)

---

## Objective

Eliminate divergence between Commercial Overview, Commercial Reporting, Commercial Exports, and Analytics display surfaces.

---

## Final architecture (implemented)

```text
getCommercialOverviewSnapshot()
        ↓
CommercialReportService.buildCommercialExportPackage()
        ↓
CommercialExportPackage
        ↓
projectCommercialAnalytics()     ← Analytics Projection Layer
        ↓
admin.getCommercialAnalytics
        ↓
StatisticsPanel (/admin/analytics)
```

Parallel consumers of the same package:

```text
CommercialExportPackage
        ├── Commercial Overview (getCommercialOverview)
        ├── Analytics (getCommercialAnalytics)
        ├── CSV / Excel / PDF (exportCommercialReport)
        └── getCommercialExportPackage (debug/tests)
```

---

## Phase A — Analytics surface audit (summary)

**Page:** `/admin/analytics` → `StatisticsPanel.tsx`

**Pre-alignment:** 9 parallel queries mixing CRS, DB entity, and S6 legacy paths.

**Post-alignment:** 1 query (`admin.getCommercialAnalytics`) + export mutation on demand.

See [KPI mapping](./ANALYTICS-ALIGNMENT-1-KPI-MAPPING.md) for full inventory.

---

## Phase C — Authority audit

| Forbidden path | Pre-alignment | Post-alignment |
|----------------|---------------|----------------|
| `getStatistics()` | Used for renewal, expired, canceled | **Removed** from analytics UI |
| `computeAdminMrr` | Not on analytics client | **Not used** |
| `getRevenueByMonth` | Revenue chart | **Removed** |
| Restaurant-scoped subscription APIs | Not on analytics | **Not used** |
| Parallel `analytics.*` KPI queries | 4 separate CRS loads | **Collapsed** into export package |

**Authority model preserved:** Owner Account → Subscription → Commercial State (CRS / S1_CANONICAL).

---

## Phase D — Alignment architecture

**Analytics Projection Layer:** `server/commercial/reporting/analyticsProjection.ts`

- Input: `CommercialExportPackage` + optional `userGrowth` series (operational DB extension)
- Output: `CommercialAnalyticsProjection`
- Rules: field selection and table row shaping only; **no KPI derivation**

---

## Phase E — Implementation

| File | Change |
|------|--------|
| `server/commercial/reporting/analyticsProjection.ts` | New projection layer |
| `server/commercial/adminDashboardRouter.ts` | `admin.getCommercialAnalytics` endpoint |
| `client/src/pages/admin/StatisticsPanel.tsx` | Single-query refactor |

---

## Phase F — Reconciliation validation

Shared KPIs verified at identical `asOf`:

| KPI | Analytics | Commercial Overview | Export package |
|-----|-----------|---------------------|----------------|
| MRR | ✅ | ✅ | ✅ |
| ARR | ✅ | ✅ | ✅ |
| Subscribers | ✅ | ✅ | ✅ |
| Trials | ✅ | ✅ | ✅ |
| Plan distribution | ✅ | ✅ | ✅ |
| Health buckets | ✅ | ✅ | ✅ |
| Attention (expiring) | ✅ (in projection) | ✅ | ✅ |
| Operational counts | ✅ | Partial (executive) | ✅ |

---

## Phase G — Regression protection

**Test file:** `server/commercial/reporting/analyticsAlignment.test.ts`

- Projection matches `getCommercialOverview` at fixed `asOf`
- Projection matches `CommercialExportPackage` overview + operational sections
- Legacy renewal/revenue extensions marked unavailable

**Run:**

```bash
npm run check
pnpm exec vitest run server/commercial/reporting/analyticsAlignment.test.ts
pnpm exec vitest run server/commercial/reporting/CommercialReportService.test.ts
npm test
```

---

## Exit criteria

| Criterion | Status |
|-----------|--------|
| Analytics no longer maintains independent commercial calculations | ✅ |
| Shared KPIs from certified reporting data | ✅ |
| Commercial Overview and Analytics agree on shared metrics | ✅ (tested) |
| Exports, reports, analytics share authority path | ✅ |
| No active commercial KPI drift | ✅ |
