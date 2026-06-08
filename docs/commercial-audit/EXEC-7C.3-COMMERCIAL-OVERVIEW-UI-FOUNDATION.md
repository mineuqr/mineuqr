# EXEC-7C.3 — Commercial Overview UI Foundation

**Program:** Commercial Authority Program — Execution  
**Phase:** EXEC-7C.3 — First real `/admin/commercial` page  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** UI foundation only. No subscription health, needs attention, plan distribution, or recent activity.

**Prerequisites:** EXEC-7C.2 `admin.getCommercialOverview`.

---

## 1. Executive Summary

Replaced the Commercial placeholder with a real overview page powered by **one** tRPC query:

```typescript
trpc.admin.getCommercialOverview.useQuery()
```

All KPI values and metadata are read directly from `CommercialOverviewSnapshot`. No client-side commercial derivation.

---

## 2. Deliverables

| Deliverable | Location |
|-------------|----------|
| Page | `client/src/pages/admin/AdminCommercialPage.tsx` |
| Executive KPI row | `CommercialOverviewExecutiveKpis.tsx` |
| Metadata panel | `CommercialOverviewMetadataPanel.tsx` |
| Timestamp display helper | `formatCommercialOverviewDisplay.ts` |
| Locales | `admin.commercial.*` in `en.json` / `ar.json` |

### Executive cards (4)

- Commercial Subscribers — `snapshot.executive.commercialSubscribers`
- Active Restaurants — `snapshot.executive.activeRestaurants`
- MRR — `snapshot.executive.mrr` (USD via `formatAdminRevenueUSD`)
- ARR — `snapshot.executive.arr` (USD via `formatAdminRevenueUSD`)

### Metadata panel

- Authority — `snapshot.metadata.authorityVersion`
- As Of — `snapshot.metadata.asOf`
- Generated At — `snapshot.metadata.generatedAt`

### States

- **Loading:** skeleton KPI cards + metadata skeleton (layout preserved)
- **Error:** `AdminEmptyState` inside `AdminOperationsShell`

---

## 3. Architecture

```
admin.getCommercialOverview
        ↓
CommercialOverviewSnapshot
        ↓
Presentation components (format only)
        ↓
Operator UI
```

**Forbidden on this page:** `getMRR`, `getARR`, `getSubscriberCounts`, `getDashboardSummary`, client aggregation.

---

## 4. Out of Scope (later EXEC-7C phases)

- Subscription Health
- Needs Attention
- Plan Distribution
- Recent Activity
- Charts, trends, growth

---

## 5. Validation

```bash
pnpm exec vitest run client/src/lib/admin/formatCommercialOverviewDisplay.test.ts
pnpm run check
```

Manual: open `/admin/commercial` as admin — verify 4 KPIs, metadata panel, loading skeletons, error state on API failure.

---

*Stop boundary: EXEC-7C.3 complete.*
