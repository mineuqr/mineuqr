# EXEC-3 — Dashboard API Layer

**Program:** Admin Dashboard Remediation — Execution  
**Phase:** EXEC-3 — Dashboard API layer  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** Additive API implementation only. No consumer migration, no dashboard UI changes, no backfill, no legacy retirement, no schema changes.

**Prerequisites:** EXEC-1 (`CommercialReadService`), EXEC-2 (authority parity validation), AR-4 (server read / metrics API specification).

---

## 1. Executive Summary

EXEC-3 implements the **canonical Dashboard API layer** defined by AR-4. All new read procedures resolve commercial truth exclusively through `CommercialReadService` (S1 chain). Legacy dashboard consumers, UI bindings, and S2–S6 authority paths remain **unchanged**.

| Outcome | Status |
|---------|--------|
| Category A — `commercial.*` admin read APIs | **Implemented** |
| Category B — `admin.*` dashboard read APIs | **Implemented** |
| Category C — `analytics.*` canonical metrics APIs | **Implemented** |
| `CommercialReadService` as sole commercial authority | **Enforced** |
| Legacy `commercial.getEntitlements` response shape | **Preserved** |
| Dashboard UI / legacy procedure consumers | **Unchanged** |
| API-level tests | **8/8 passed** |
| Regression (CRS + parity + metrics unit) | **25/25 passed** |

**Conclusion:** A complete canonical read API surface exists for EXEC-4 consumer migration. No production behavior has changed because no existing consumer calls the new procedures.

---

## 2. APIs Added

### 2.1 Category A — Commercial truth (`commercial.*`)

| Procedure | Input | Output | Access |
|-----------|-------|--------|--------|
| `commercial.getEntitlements` | — (self) | `CommercialEntitlementsResult` (legacy shape) | `verifiedProcedure` — **unchanged** |
| `commercial.getOwnerCommercialState` | `{ ownerId }` | `OwnerCommercialState` | Admin (`assertAdminAccess`) |
| `commercial.getOwnerCommercialStates` | `{ ownerIds: number[] }` | `OwnerCommercialState[]` | Admin |
| `commercial.getOwnerPlan` | `{ ownerId }` | `PlanSlice` | Admin |
| `commercial.getOwnerEntitlements` | `{ ownerId }` | `EntitlementsSlice` | Admin |
| `commercial.getOwnerTrialStatus` | `{ ownerId }` | `TrialSlice` | Admin |
| `commercial.getOwnerSubscription` | `{ ownerId }` | `SubscriptionSlice` | Admin |

**Router:** `server/commercial/router.ts`

### 2.2 Category B — Dashboard reads (`admin.*`)

| Procedure | Input | Output | Access |
|-----------|-------|--------|--------|
| `admin.getOwnerOverview` | `{ ownerId }` | `AdminOwnerOverview` | Admin |
| `admin.getOwnerOverviewList` | `{ limit?, roleFilter? }` | `{ items, nextCursor? }` | Admin |
| `admin.getSubscriptionOverview` | `{ statusFilter?, planFilter? }` | `{ owners: OwnerCommercialState[] }` | Admin |
| `admin.getDashboardSummary` | `{ now? }` | `DashboardSummaryResult` | Admin |
| `admin.listRestaurants` | — | `{ items: AdminRestaurantListItem[] }` | Admin |

**Router:** `server/commercial/adminDashboardRouter.ts` (merged into `admin` namespace via `mergeRouters`)

**Note:** Legacy `admin.listAllRestaurantsWithSubscriptions` remains active. `admin.listRestaurants` is the AR-4 canonical replacement semantics — not yet wired to UI.

### 2.3 Category C — Analytics (`analytics.*`)

| Procedure | Input | Output | Access |
|-----------|-------|--------|--------|
| `analytics.getMRR` | `{ now? }` | `{ mrr, metricsSource }` | Admin |
| `analytics.getARR` | `{ now? }` | `{ arr, mrr, arrMethod, metricsSource }` | Admin |
| `analytics.getPlanDistribution` | `{ now? }` | `{ distribution, metricsSource }` | Admin |
| `analytics.getSubscriberCounts` | `{ now? }` | `SubscriberCountsResult` | Admin |
| `analytics.getExpiringAccounts` | `{ now? }` | `ExpiringAccountsResult` | Admin |

**Router:** `server/commercial/analyticsRouter.ts` (registered as `analytics` on `appRouter`)

### 2.4 Intentionally deferred (per AR-4)

| Procedure | Reason |
|-----------|--------|
| `analytics.getRevenueByMonth` | Canonical billing events not defined — deferred to billing alignment |
| `analytics.getRawSubscriptionRowStats` | Infrastructure-only; not required for product dashboard |

---

## 3. API Contracts

### 3.1 `OwnerCommercialState`

Canonical DTO returned by Category A and embedded in Category B responses. Alias of EXEC-1 `CommercialAuthority`:

```typescript
type OwnerCommercialState = {
  ownerId: number;
  subscriptionId: number | null;
  subscriptionStatus: "trial" | "active" | "canceled" | "expired" | null;
  planId: number | null;
  planCode: CommercialPlan;
  planName: string | null;
  trialStatus: { isTrial: boolean; trialEndsAt: string | null; daysRemaining: number | null };
  maxRestaurants: number | null;
  features: CommercialFeatures;
  entitlements: CommercialEntitlements;
  commercialStatus: {
    accountType: AccountType;
    isPaid: boolean;
    isEntitled: boolean;
    countsInMrr: boolean;
    countsInRevenue: boolean;
    invoiceEligible: boolean;
  };
  currentPeriodEnd: string | null;
  billingCycle: "monthly" | "yearly" | null;
  authoritySource: "S1_CANONICAL";
  resolvedAt: string;
};
```

### 3.2 `AdminOwnerOverview`

```typescript
type AdminOwnerOverview = {
  owner: { id, name, email, role, createdAt };
  commercial: OwnerCommercialState;
};
```

### 3.3 `DashboardSummaryResult`

```typescript
type DashboardSummaryResult = {
  activeOwners: number;
  activeSubscriptions: number;
  activeTrials: number;
  expiringAccounts: number;
  mrr: number;
  arr: number;
  totalUsers: number;           // operational — getExtendedAdminStats
  totalRestaurants: number;     // operational
  activeRestaurants: number;  // operational — venues isActive=1
  metricsSource: "CANONICAL_OWNER";
};
```

**Decoupling:** `activeRestaurants` is operational venue count. `activeSubscriptions` is canonical owner count. They are never derived from the same query.

### 3.4 Metrics contracts

| Metric | Definition |
|--------|------------|
| MRR | Sum `monthlyEquivalent(planId, billingCycle)` for owners where `commercialStatus.countsInMrr` |
| ARR | `MRR × 12` (`arrMethod: "MRR_X12"`) |
| Plan distribution | `GROUP BY planCode` over owners |
| Subscriber counts | Owner counts by `subscriptionStatus` / `isEntitled` |
| Expiring accounts | Entitled owners with period end within 30 days |

All metrics responses include `metricsSource: "CANONICAL_OWNER"`.

---

## 4. Authorization Model

| Layer | Pattern |
|-------|---------|
| Self-read | `commercial.getEntitlements` — `verifiedProcedure` (existing) |
| Admin commercial reads | `protectedProcedure` + `assertAdminAccess(ctx, "<procedure>")` |
| Admin dashboard reads | Same — `assertAdminAccess` per AR-1 hard admin boundary |
| Analytics | Same — admin-only via `assertAdminAccess` |

**Non-admin denial:** Regular users calling `commercial.getOwnerCommercialState` receive `FORBIDDEN` with auth audit logging (`unauthorized_admin_access`).

**AR-1 alignment:** Platform admin accounts resolve as `planCode: ADMIN` with `countsInMrr: false`. Metrics count all users returned by `getAllUsers` (launch DB: 2 owners). `includeOperators` flag deferred to EXEC-4 if needed.

---

## 5. CRS Usage

### 5.1 Authority chain (unchanged from EXEC-1)

```text
CommercialReadService.getOwnerCommercialState(ownerId)
  → getCommercialEntitlements(ownerId)
  → buildCommercialContextFromDb
  → pickUserLevelSubscription (restaurantId = 0)
  → mapToCommercialAuthority
```

### 5.2 Service extensions (EXEC-3)

| Method | Purpose |
|--------|---------|
| `getOwnerCommercialState` | Single owner — Category A |
| `getOwnerCommercialStates` | Batch — Category A + list performance |
| `getAllOwnerCommercialStates` | All users — Category B/C metrics input |

### 5.3 Metrics derivation

```text
CanonicalMetricsService
  → CommercialReadService.getAllOwnerCommercialStates()
  → in-memory aggregation (launch scale)
```

**Forbidden:** `getAdminStatistics`, `getAllUsersWithSubscriptions`, `getSubscriptionForRestaurant`, raw `user_subscriptions` row scans for product MRR/subscriber truth.

### 5.4 Router registration

```text
appRouter
  commercial: commercialRouter          (Category A — extended)
  admin: mergeRouters(adminCoreRouter, adminDashboardReadRouter)  (Category B — additive)
  analytics: analyticsRouter            (Category C — new namespace)
```

Legacy `adminCoreRouter` mutations and legacy read procedures are untouched.

---

## 6. Tests Added

| File | Tests | Scope |
|------|-------|-------|
| `server/commercial/exec3DashboardApi.test.ts` | 8 | API-level: authority, plan, admin overview, dashboard summary, MRR, subscriber counts, permission denial, legacy `getEntitlements` |
| `server/commercial/metrics/CanonicalMetricsService.test.ts` | 3 | MRR, subscriber counts, expiring accounts unit logic |

### 6.1 Test command

```bash
npx vitest run server/commercial/exec3DashboardApi.test.ts server/commercial/metrics/CanonicalMetricsService.test.ts server/commercial/CommercialReadService.test.ts server/commercial/CommercialReadService.parity.test.ts
```

### 6.2 Results (2026-06-08)

| Suite | Result |
|-------|--------|
| `exec3DashboardApi.test.ts` | **8/8 passed** |
| `CanonicalMetricsService.test.ts` | **3/3 passed** |
| `CommercialReadService.test.ts` | **4/4 passed** |
| `CommercialReadService.parity.test.ts` | **10/10 passed** |
| **Total** | **25/25 passed** |

Read-only tests only. No database writes.

---

## 7. Known Differences From Legacy Metrics

Per EXEC-2, legacy S5/S6 metrics **do not** match canonical owner accounting. EXEC-3 **intentionally** exposes CRS metrics — no parity preservation.

| Scenario | Legacy (S6) | Canonical (`analytics.*`) |
|----------|-------------|---------------------------|
| Scoped-only subs (no account row) | May count rows / show entitled | `planCode: NONE`, MRR = 0 |
| User `14760004` (launch DB) | Active scoped subs visible | CRS returns `NONE` until AR-6 backfill |
| MRR unit | Per subscription row | Per owner (`countsInMrr`) |
| `activeSubscriptions` | Row count | Owner count with `status = active` |
| `subscriptionsByPlan` | Row `GROUP BY planId` | Owner `GROUP BY planCode` |

**API signal:** All canonical metrics return `metricsSource: "CANONICAL_OWNER"` so EXEC-4 consumers can distinguish from legacy responses.

**Legacy procedures still active:** `admin.getStatistics`, `admin.getSubscriptionDetails`, `admin.getRevenueByMonth`, `admin.listAllUsersWithSubscriptions`, client `computeAdminKPIs` — unchanged.

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual authority during transition | Medium | New APIs labeled `CANONICAL_OWNER`; legacy untouched until EXEC-4 |
| `getAllOwnerCommercialStates` N+1 at scale | Low (launch) | Batch optimization deferred; launch DB has 2 owners |
| `mergeRouters` tRPC v11 import | Low | Exported from `server/_core/trpc.ts` (`t.mergeRouters`) |
| Admin sees different numbers pre-backfill | Expected | Documented in EXEC-2; AR-6 backfill is separate phase |
| `admin.listRestaurants` vs legacy restaurant list | Low | New procedure only; no UI wiring yet |

---

## 9. Readiness For EXEC-4

| Criterion | Status |
|-----------|--------|
| Category A/B/C APIs implemented per AR-4 | ✅ |
| CRS sole commercial authority in new APIs | ✅ |
| Authorization matches AR-1 | ✅ |
| API tests green | ✅ |
| Legacy consumers unchanged | ✅ |
| AR-5 consumer migration spec available | ✅ (upstream) |
| Known metric deltas documented | ✅ |

**EXEC-4 may proceed** with dashboard consumer migration (`/admin` panels, statistics page, restaurant list) binding to new procedures per AR-5. No EXEC-3 blockers remain.

**Not started (by design):** EXEC-4 consumer migration, EXEC-5 UI cutover, EXEC-6 backfill, EXEC-7 legacy retirement.

---

## Appendix A — Files Created

| File | Purpose |
|------|---------|
| `server/commercial/commercialReadSlices.ts` | DTO slices + `OwnerCommercialState` alias |
| `server/commercial/adminDashboardRouter.ts` | Category B dashboard read router |
| `server/commercial/analyticsRouter.ts` | Category C analytics router |
| `server/commercial/metrics/CanonicalMetricsService.ts` | Owner-based metrics aggregator |
| `server/commercial/metrics/CanonicalMetricsService.test.ts` | Metrics unit tests |
| `server/commercial/exec3DashboardApi.test.ts` | API-level integration tests |
| `docs/commercial-audit/EXEC-3-DASHBOARD-API-LAYER.md` | This document |

## Appendix B — Files Modified

| File | Change |
|------|--------|
| `server/commercial/CommercialReadService.ts` | Added batch/all-owner read methods |
| `server/commercial/router.ts` | Category A admin read procedures |
| `server/routers.ts` | `mergeRouters` admin merge; `analytics` namespace |
| `server/_core/trpc.ts` | Export `mergeRouters` from tRPC instance |
