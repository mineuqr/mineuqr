# EXEC-5 — Dashboard Consumer Migration

**Program:** Admin Dashboard Remediation — Execution  
**Phase:** EXEC-5 — Dashboard consumer migration (AR-5)  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** Consumer migration only. No legacy retirement, no UI redesign, no schema changes.

**Prerequisites:** EXEC-1–4, AR-5 consumer migration spec, canonical APIs (EXEC-3), backfilled authority (EXEC-4).

---

## 1. Executive Summary

EXEC-5 migrates **Category A/B** admin dashboard consumers from legacy S2–S6 authority paths to the **EXEC-3 canonical API layer** (`commercial.*` / `admin.*` / `analytics.*`).

| Outcome | Status |
|---------|--------|
| `/admin` KPI strip | **Migrated** → `admin.getDashboardSummary` |
| `/admin` Users panel | **Migrated** → `admin.getOwnerOverviewList` + `admin.listRestaurants` |
| `/admin` Restaurant cards | **Migrated** → `admin.listRestaurants` (`ownerCommercial`) |
| `/statistics` commercial metrics | **Migrated** → `analytics.*` + `admin.getSubscriptionOverview` |
| Legacy server procedures | **Retained** (not deleted) |
| Dashboard UI layout | **Unchanged** |

**Authority source:** `CommercialReadService` via EXEC-3 APIs only for commercial **display**. Legacy mutations (scoped subscription writes) remain for admin operations.

---

## 2. Consumers Migrated

| Surface | Route | Before (Strategy) | After (API) |
|---------|-------|-------------------|-------------|
| KPI strip | `/admin` | S3+S6 `computeAdminKPIs` | `admin.getDashboardSummary` |
| Users list | `/admin` | S5 `listAllUsersWithSubscriptions` | `admin.getOwnerOverviewList` |
| User restaurants (dialog) | `/admin` | Embedded in S5 | `admin.listRestaurants` (join by `userId`) |
| Restaurant list/cards | `/admin` | S3 `listAllRestaurantsWithSubscriptions` | `admin.listRestaurants` |
| Restaurant status filter | `/admin` | Scoped `subscription.status` | `ownerCommercial` (CRS) |
| MRR headline | `/statistics` | S6 `getStatistics.totalRevenue` | `analytics.getMRR` |
| ARR | `/statistics` | Not shown | `analytics.getARR` |
| Plan pie chart | `/statistics` | S6 `subscriptionsByPlan` (rows) | `analytics.getPlanDistribution` (owners) |
| Subscriber grid (active/trial) | `/statistics` | S6 row counts | `analytics.getSubscriberCounts` |
| Subscription table | `/statistics` | S6 `getSubscriptionDetails` (per row) | `admin.getSubscriptionOverview` (per owner) |
| Platform entity counts | `/statistics` | `getExtendedStats` | **Unchanged** (operational) |
| User growth chart | `/statistics` | `getExtendedStats.userGrowth` | **Unchanged** (operational) |

**Not migrated (Category C — by design):**

| Surface | API | Reason |
|---------|-----|--------|
| `/users` governance | `admin.listAllUsers` | No commercial columns (AR-5) |
| `/super-admin` | `admin.listAllUsers`, `getExtendedStats` | Entity counts only |

---

## 3. Legacy Paths Replaced (client)

| Legacy client usage | Replacement |
|---------------------|-------------|
| `trpc.admin.listAllUsersWithSubscriptions` | `trpc.admin.getOwnerOverviewList` |
| `trpc.admin.listAllRestaurantsWithSubscriptions` | `trpc.admin.listRestaurants` |
| `trpc.admin.getStatistics` (KPI/MRR on `/admin`) | `trpc.admin.getDashboardSummary` |
| `computeAdminKPIs()` commercial merge | `mapDashboardSummaryToKPIs()` |
| `getSubscriptionForRestaurant()` helper | `restaurant.ownerCommercial` |
| `trpc.admin.getSubscriptionDetails` | `trpc.admin.getSubscriptionOverview` |
| S6 MRR/plan/subscriber bindings on `/statistics` | `analytics.*` |

**Server legacy procedures remain registered** — no deletions in EXEC-5.

---

## 4. Remaining Legacy Consumers

| Consumer | Location | Strategy | EXEC-6 action |
|----------|----------|----------|---------------|
| `admin.getStatistics` | `/statistics` renewal + expired/canceled counts | S6 dual-read | Retire when canonical churn metrics exist |
| `admin.getRevenueByMonth` | `/statistics` revenue chart | S6 dual-read | Retire when `analytics.getRevenueByMonth` ships |
| `admin.createRestaurantSubscription` | `/admin` mutations | Scoped write | Retain until admin write path normalized |
| `admin.updateRestaurantSubscription` | `/admin` mutations | Scoped write | Retain |
| `admin.createUserSubscriptionByAdmin` | `/admin` users | Legacy write | Retain |
| `subscription.listPlans` | Dialog pickers | Catalog only | Retain (not authority) |

---

## 5. Validation Results

### 5.1 Automated tests

```bash
npx vitest run client/src/lib/admin/dashboardSummaryKpis.test.ts server/commercial/exec3DashboardApi.test.ts server/commercial/exec4PostBackfill.parity.test.ts
```

| Suite | Result |
|-------|--------|
| `dashboardSummaryKpis.test.ts` | 2/2 |
| `exec3DashboardApi.test.ts` | 8/8 |
| `exec4PostBackfill.parity.test.ts` | 3/3 |

### 5.2 Before / after comparison (expected post EXEC-4)

| Metric | Legacy (S6) | Canonical (EXEC-5) |
|--------|---------------|---------------------|
| User 14760004 plan | Scoped row display | **PROFESSIONAL** (CRS) |
| Active subscriptions count | 4 rows | **2 owners** (or 1 paying user) |
| MRR | Sum of scoped rows | Owner-based canonical MRR |
| Statistics table rows | Per restaurant/sub row | **Per owner** |
| User 1 plan display | BASIC (scoped) | **ADMIN** (role bypass) |

These deltas are **expected** and documented in EXEC-2 — not regressions.

### 5.3 Manual validation checklist

| Check | Expected |
|-------|----------|
| `/admin` loads KPI strip | Values from `getDashboardSummary` |
| `/admin` users panel | Plan/status from `commercial` block |
| `/admin` restaurant cards | Same `ownerCommercial` for all venues per owner |
| `/statistics` loads | MRR/ARR/plan chart from `analytics.*` |
| `/statistics` table | One row per owner |
| `/users` unchanged | Role-only governance |

---

## 6. Dual-Read Exceptions

| Surface | Legacy API retained | Reason | Removal target |
|---------|---------------------|--------|----------------|
| Revenue by month chart | `admin.getRevenueByMonth` | `analytics.getRevenueByMonth` deferred (EXEC-3) | Future analytics API |
| Renewal rate card | `admin.getStatistics.renewalRate` | No canonical churn metric | EXEC-6+ |
| Expired/canceled counts | `admin.getStatistics` (partial) | `getSubscriberCounts` lacks churn breakdown | EXEC-6+ |

**No dual-read on `/admin` commercial display** — fully canonical after EXEC-5.

---

## 7. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Metric delta vs operator memory | Medium | Documented; `metricsSource: CANONICAL_OWNER` on server |
| Restaurant mutation uses account `subscriptionId` | Low | Post-backfill account row id; refetch canonical reads on success |
| Legacy APIs still callable | Low | Intentional until EXEC-6 retirement |
| Revenue chart still legacy | Low | Labeled in UI + documented dual-read |

---

## 8. Readiness For EXEC-6

| Criterion | Status |
|-----------|--------|
| Dashboard consumers on EXEC-3 APIs | ✅ |
| CRS practical authority for display | ✅ |
| Legacy procedures still exist | ✅ |
| Dual-read exceptions documented | ✅ |
| No UI redesign | ✅ |

**EXEC-6 may proceed** with legacy procedure retirement per AR-3 M6/M7 after operator sign-off.

---

## Appendix A — Files Modified

| File | Change |
|------|--------|
| `client/src/pages/AdminManagement.tsx` | Canonical queries; remove S3/S5/S6 client helpers |
| `client/src/pages/Statistics.tsx` | Canonical analytics + overview; dual-read chart |
| `client/src/lib/admin/dashboardSummaryKpis.ts` | **New** — KPI mapper |
| `client/src/lib/admin/ownerCommercialDisplay.ts` | **New** — display helpers |
| `client/src/lib/admin/computeAdminKPIs.ts` | Re-export only (deprecated derivation) |
| `client/src/lib/admin/dashboardSummaryKpis.test.ts` | **New** — unit tests |
| `client/src/components/admin/layout/AdminKPISection.tsx` | Import path update |
| `server/commercial/adminDashboardRouter.ts` | Extend `listRestaurants`, `getSubscriptionOverview` for EXEC-5 display |

## Appendix B — Files Created

| File |
|------|
| `client/src/lib/admin/dashboardSummaryKpis.ts` |
| `client/src/lib/admin/ownerCommercialDisplay.ts` |
| `client/src/lib/admin/dashboardSummaryKpis.test.ts` |
| `docs/commercial-audit/EXEC-5-DASHBOARD-CONSUMER-MIGRATION.md` |
