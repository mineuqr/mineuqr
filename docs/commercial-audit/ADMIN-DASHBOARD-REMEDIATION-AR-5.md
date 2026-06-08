# ADMIN DASHBOARD REMEDIATION — AR-5 — Dashboard Consumer Migration Specification

**Program:** Admin Dashboard Remediation (AR)  
**Phase:** AR-5 — Dashboard consumer migration specification  
**Date:** 2026-06-08  
**Status:** Complete — consumer migration design only  

**Mode:** Implementation design only. No code changes, schema changes, migrations, or backfill execution.

**Upstream:**

| Document | Role |
|----------|------|
| ADA-1 | Per-screen legacy strategy mapping (S2–S6) |
| AR-4 | Server read / metrics API contracts |
| AR-3 | Migration phases and dual-read window |
| AR-1 | Governance screens (`platform_authority`) |

**Approved architecture:**

```text
CommercialReadService
  ↓
commercial.*     (Category A — truth)
  ↓
admin.*          (Category B — dashboard compose)
  ↓
analytics.*      (Category C — metrics)
  ↓
Dashboard Consumers (visualization only)
```

**Objective answer:** *Which screen consumes which API?* — §5–§6.

---

## 1. Executive Recommendation

Move **all** admin dashboard commercial consumers behind the AR-4 server read layer. The dashboard becomes a **visualization layer only**; commercial authority remains in `CommercialReadService` only.

| Layer | Responsibility |
|-------|----------------|
| Server (`CommercialReadService`) | Define commercial truth |
| Client (admin pages) | Display truth — **never derive truth** |

**Classification:**

```text
IMPLEMENTATION READY
DASHBOARD MIGRATION APPROVED
```

**ADMIN-UX-1** (dashboard UX rebuild) may begin only after AR-4 Phase 1–4 server APIs exist (§9).

---

## 2. Deliverable 1 — Dashboard Inventory (AR-5.1)

### 2.1 Actual route map (codebase truth)

MineuQR admin surfaces are **consolidated** — not one route per nav item. AR-5 maps **surfaces** (UI sections), not hypothetical routes.

| Surface | Route / file | Category | Commercial truth required? |
|---------|--------------|----------|----------------------------|
| **Dashboard Home — KPI strip** | `/admin` → `AdminManagement.tsx` | **A** | **Yes** |
| **Dashboard Home — Restaurants** | `/admin` → `AdminManagement.tsx` | **B** | Read-only owner context |
| **Dashboard Home — Users panel** | `/admin` → `AdminUsersSection` (embedded) | **A** | **Yes** |
| **Dashboard Home — Notifications** | `/admin` (embedded) | **B** | No |
| **Dashboard Home — Invoice action** | `/admin` user row | **A** | **Yes** (eligibility display) |
| **Statistics / Revenue** | `/statistics` → `Statistics.tsx` | **A** | **Yes** |
| **Users (governance)** | `/users` → `Users.tsx` | **C** | No — role only |
| **Super Admin** | `/super-admin` → `SuperAdminDashboard.tsx` | **C** | No — entity counts |
| **Owner dashboard** (boundary) | `/dashboard` → `Dashboard.tsx` | **A** (owner) | Already S1 — out of AR-5 scope |
| **Commercial diagnostics** (boundary) | `/commercial/diagnostics` | **A** | S1 debug — align DTO with AR-4 |

**Not implemented as dedicated admin routes:**

| Brief nav item | Actual location | AR-5 treatment |
|----------------|-----------------|----------------|
| Plans | `subscription.listPlans` in modals only | Catalog picker — not commercial truth |
| Subscriptions | `/statistics` + `/admin` users | Migrate both to overview APIs |
| Trials | Columns/badges across A surfaces | `commercial.getOwnerTrialStatus` / DTO slice |
| Billing | Invoice PDF button | `commercial.getOwnerSubscription` for eligibility |
| Settings | Not found | N/A |

### 2.2 Category definitions

#### Category A — Commercial screens

Commercial truth **required**. Must consume **only** `commercial.*`, `admin.*` (read), `analytics.*`.

| Examples in codebase | Current violation |
|---------------------|-------------------|
| KPI strip | S3 + S6 via `computeAdminKPIs` |
| Users commercial columns | S5 `listAllUsersWithSubscriptions` |
| Statistics MRR / charts / table | S6 procedures |
| Restaurant commercial badges | S3 scoped `subscription` on card |
| Subscription edit modal (read pre-fill) | S5 picked sub |

#### Category B — Operational screens

Commercial truth **optional** as read-only **owner context** — not per-venue subscription authority.

| Examples | Rule |
|----------|------|
| Restaurant list/cards | Show `ownerCommercial.planCode` — same for all venues of owner |
| Restaurant search/filter by status | Filter by **owner** commercial status, not scoped row |
| Notifications | No subscription resolver |
| Orders / QR / printing | Not in admin dashboard today |

#### Category C — Governance screens

**Platform authority** — not subscription authority (AR-1).

| Examples | Current API | Future |
|----------|-------------|--------|
| `/users` role edit | `admin.listAllUsers` | Unchanged + `platform_authority` when AR-1 ships |
| `/super-admin` | `listAllUsers`, `getExtendedStats` | Entity counts only |
| Protected user guard | `isProtectedUserId` client | Server-side AR-1 registry |

---

## 3. Deliverable 2 — Consumer Mapping (AR-5.2–AR-5.8)

### 3.1 Users screen migration (AR-5.2)

#### Surface A — `/admin` embedded Users panel

| Attribute | Current | Future |
|-----------|---------|--------|
| **File** | `AdminManagement.tsx` (`AdminUsersSection`) | Same file or extracted `AdminUsersPanel.tsx` |
| **Query** | `trpc.admin.listAllUsersWithSubscriptions` | `trpc.admin.getOwnerOverviewList` |
| **Strategy** | **S5** — server `find()` | **S1** — `CommercialReadService` per owner |
| **Columns** | `u.subscription`, `u.plan` from picked row | `item.commercial.*` from `OwnerCommercialState` |

**Bindings (normative):**

| UI field | DTO path |
|----------|----------|
| Status badge | `commercial.subscriptionStatus` |
| Plan name | `commercial.planName` (or i18n from `planCode`) |
| Period end | `commercial.currentPeriodEnd` |
| Trial badge | `commercial.trialStatus.isTrial` |
| Invoice eligibility | `commercial.commercialStatus.invoiceEligible` |

**Mutations (writes — unchanged in AR-5, refresh spec):**

| Mutation | Post-success invalidation |
|----------|---------------------------|
| `updateUserRole` | `getOwnerOverviewList` |
| `createUserSubscriptionByAdmin` | `getOwnerOverviewList`, `getDashboardSummary`, `getSubscriptionOverview` |
| `updateUserSubscriptionByAdmin` | Same |
| `deleteUserSubscriptionByAdmin` | Same |
| `generateInvoicePDF` | No commercial invalidation (PDF only) |

**Remove from client:** Reading `u.subscription`, `u.plan` from legacy list shape.

#### Surface B — `/users` standalone (governance)

| Attribute | Current | Future |
|-----------|---------|--------|
| **Query** | `admin.listAllUsers` | **Unchanged** — Category C |
| **Commercial columns** | None | **None** — role/governance only |

---

### 3.2 Subscription screen migration (AR-5.3)

There is **no** dedicated `/subscriptions` route. Subscription **display** spans two surfaces:

| Surface | Current | Future |
|---------|---------|--------|
| **`/statistics` subscription table** | `admin.getSubscriptionDetails` (S6) | `admin.getSubscriptionOverview` |
| **`/admin` user subscription modal (read)** | Pre-fill from S5 row | Pre-fill from `admin.getOwnerOverview({ ownerId })` |

**`admin.getSubscriptionOverview` display contract:**

| Column | Source | Forbidden |
|--------|--------|-----------|
| Owner email | User join | — |
| Plan | `commercial.planName` | Raw `planId` lookup in client |
| Status | `commercial.subscriptionStatus` | Per-row scoped status |
| Billing cycle | `commercial.billingCycle` | — |
| Period end | `commercial.currentPeriodEnd` | — |
| MRR contribution | `commercial.commercialStatus.countsInMrr` + server price | Client price calc |

**Rule:** One table row per **owner**, not per subscription row.

---

### 3.3 Dashboard KPI migration (AR-5.4)

| Attribute | Current | Future |
|-----------|---------|--------|
| **File** | `AdminManagement.tsx` + `AdminKpiOverview` component | Same |
| **Queries** | `getStatistics` + `getExtendedStats` + `listAllRestaurantsWithSubscriptions` | **`admin.getDashboardSummary` only** |
| **Client derivation** | `computeAdminKPIs()` — S3+S6 merge | **Delete commercial logic** from client |

**KPI field mapping:**

| KPI label | Current source | Future `DashboardSummary` field |
|-----------|----------------|--------------------------------|
| Active restaurants | S3 — venues with scoped sub active/trial | `activeRestaurants` (operational `isActive`) |
| Active subscriptions | S6 — `activeSubscribers` row count | `activeSubscriptions` (owner count) |
| Expiring soon | S3 — client filter on scoped `currentPeriodEnd` | `expiringAccounts` (canonical) |
| Estimated MRR | S6 — `totalRevenue` | `mrr` |
| Total users | `getExtendedStats.totalUsers` | `totalUsers` |

**New optional KPIs (server-provided):**

| Field | Use |
|-------|-----|
| `activeTrials` | Trial owner count |
| `arr` | ARR card (Statistics parity) |

**File disposition:**

| File | Action |
|------|--------|
| `client/src/lib/admin/computeAdminKPIs.ts` | **Remove** or reduce to pure formatting — **no** subscription filtering |

---

### 3.4 Restaurant screen migration (AR-5.5)

| Attribute | Current | Future |
|-----------|---------|--------|
| **Query** | `admin.listAllRestaurantsWithSubscriptions` | `admin.listRestaurants` (AR-4 §8.2) |
| **Card status badge** | `getSubscriptionForRestaurant()` — S3 scoped row | `restaurant.ownerCommercial.subscriptionStatus` |
| **Plan / billing on card** | Scoped `subscription.planId` + `listPlans` client find | `ownerCommercial.planName`, `ownerCommercial.billingCycle` |
| **Status filter** | Client filters by scoped `subscription.status` | Filter by `ownerCommercial.subscriptionStatus` |

**Remove from client (`AdminManagement.tsx` L971–978):**

```text
getSubscriptionForRestaurant(restaurantId)  // S3 client helper — DELETE
getSubscriptionStatus(subscription)         // scoped status — DELETE
```

**Rules:**

| Rule | Statement |
|------|-----------|
| R-01 | Restaurants **never** determine plans |
| R-02 | Restaurants **never** determine subscriptions |
| R-03 | All venues under same `userId` show **identical** `ownerCommercial` block |
| R-04 | `subscription.listPlans` remains for **create/edit dialog** catalog pickers only |

**Restaurant subscription mutations** (create/edit scoped sub) remain during AR-3 transition; **display** must not use mutation target row as truth — refetch owner commercial after mutation.

**Delete restaurant invalidation (AR-4 §8.3):**

```text
restaurant.delete onSuccess
  → invalidate: getDashboardSummary, getOwnerOverviewList,
                getSubscriptionOverview, listRestaurants
```

---

### 3.5 Revenue screen migration (AR-5.6)

**Surface:** `/statistics` → `Statistics.tsx`

| Component | Current | Future |
|-----------|---------|--------|
| MRR headline card | `stats.totalRevenue` (S6) | `analytics.getMRR` or `getDashboardSummary.mrr` |
| ARR | Not shown | `analytics.getARR` |
| Revenue line chart | `getRevenueByMonth` (S6) | `analytics.getRevenueByMonth` (canonical) **or** infra-labeled legacy chart during M3 dual-read |
| Plan pie chart | `stats.subscriptionsByPlan` (S6 rows) | `analytics.getPlanDistribution` (owners) |
| Subscriber status cards | S6 counts | `analytics.getSubscriberCounts` |

**Rule:**

```text
1 owner = 1 contribution
```

**Remove:** Binding charts directly to raw `getStatistics` subscription row counts.

---

### 3.6 Trial screen migration (AR-5.7)

No dedicated Trials route. Trial state appears as **badges/columns** on Category A surfaces.

| Surface | Current | Future |
|---------|---------|--------|
| Users panel trial badge | `subscription.status === 'trial'` (S5) | `commercial.trialStatus.isTrial` |
| Restaurant card | Scoped trial badge (S3) | `ownerCommercial.trialStatus` |
| Statistics trial count | S6 `trialSubscribers` | `getDashboardSummary.activeTrials` or `analytics.getSubscriberCounts.trials` |
| Owner dashboard (boundary) | `checkTrialStatus` + fallback | `commercial.getEntitlements` DTO (already S1) |

**Forbidden:** Client calls to legacy trial helpers; `resolveTrialStatusRead` fallback assumptions in UI.

**Detail drill-down (optional):** `commercial.getOwnerTrialStatus({ ownerId })` on user row expand.

---

### 3.7 Plan screen migration (AR-5.8)

| Context | Current | Future |
|---------|---------|--------|
| **Display** (user/restaurant columns) | `u.plan` / scoped plan join | `commercial.planCode`, `commercial.planName` |
| **Picker** (create sub dialog) | `subscription.listPlans` | **Retain** — catalog reference, not truth |
| **Admin plan CRUD page** | Not implemented | Future — server plan catalog API, not `user_subscriptions` |

**Rule:** `subscription.listPlans` is allowed **only** for form dropdowns. Displayed plan on any commercial screen must come from `commercial.getOwnerPlan` or `OwnerCommercialState` embedded in overview APIs.

---

### 3.8 Governance screen migration (AR-5.1 Category C)

| Surface | APIs | Commercial? |
|---------|------|-------------|
| `/users` | `listAllUsers`, `updateUserRole`, `deleteUser` | **No** subscription fields |
| `/super-admin` | `listAllUsers`, `getExtendedStats`, `deleteUser` | **No** — entity totals |
| Admin access gate | `user.role === 'admin'` | **AR-1** — future `platform_authority` |

---

## 4. Deliverable 3 — Screen Dependency Matrix (AR-5.9)

### 4.1 Primary matrix

| Screen / Surface | Route | Category | Future API(s) | Legacy to remove |
|------------------|-------|----------|---------------|------------------|
| Dashboard Home — KPIs | `/admin` | A | `admin.getDashboardSummary` | `getStatistics`, `computeAdminKPIs` |
| Dashboard Home — Users | `/admin` | A | `admin.getOwnerOverviewList` | `listAllUsersWithSubscriptions` |
| User detail (modal) | `/admin` | A | `admin.getOwnerOverview` | S5 pre-fill fields |
| Subscriptions table | `/statistics` | A | `admin.getSubscriptionOverview` | `getSubscriptionDetails` |
| Revenue / MRR | `/statistics` | A | `analytics.getMRR`, `analytics.getARR` | `stats.totalRevenue` |
| Revenue chart | `/statistics` | A | `analytics.getRevenueByMonth` | `getRevenueByMonth` |
| Plan distribution | `/statistics` | A | `analytics.getPlanDistribution` | `subscriptionsByPlan` |
| Subscriber counts | `/statistics` | A | `analytics.getSubscriberCounts` | S6 status grid |
| Trials (counts/badges) | `/admin`, `/statistics` | A | `DashboardSummary.activeTrials`, DTO `trialStatus` | S3/S5/S6 trial counts |
| Plans (display) | `/admin` columns | A | `OwnerCommercialState.planName` | `u.plan`, scoped plan join |
| Plans (picker) | `/admin` dialogs | — | `subscription.listPlans` | — (catalog only) |
| Restaurants list | `/admin` | B | `admin.listRestaurants` | `listAllRestaurantsWithSubscriptions` |
| Restaurant commercial badge | `/admin` | B | `ownerCommercial` on list item | `getSubscriptionForRestaurant` |
| Notifications | `/admin` | B | `sendCustomNotification` (mutation) | — |
| Invoice PDF | `/admin` | A | `generateInvoicePDF` + `commercial.invoiceEligible` display | S4 implicit |
| Users governance | `/users` | C | `listAllUsers` | — |
| Super Admin | `/super-admin` | C | `listAllUsers`, `getExtendedStats` | — |
| Entity growth charts | `/statistics` | B | `getExtendedStats` | — (non-commercial) |

### 4.2 Cross-screen consistency rule

For owner `O`, these surfaces **must show identical** `planCode`, `subscriptionStatus`, and `trialStatus`:

```text
/admin Users row
/admin Restaurant card (owner block)
/statistics subscription row
admin.getOwnerOverview(O)
```

**Single refetch target:** `commercial` block from `getOwnerOverview(O)` is the comparison golden master.

---

## 5. Deliverable 4 — Client Rules (AR-5.10)

### 5.1 Allowed

```text
Display Truth   — bind UI to server DTO fields
Format Truth    — dates, currency, i18n labels
Filter/Search   — on DTO fields returned by server (not re-derived)
```

### 5.2 Forbidden

```text
Derive Truth
```

Client code **must not:**

| Forbidden action | Example today |
|------------------|---------------|
| Select subscriptions | `getSubscriptionForRestaurant`, `restaurantsWithSubs.find` |
| Calculate plans | `plans.find(p => p.id === sub.planId)` for **display** |
| Calculate entitlements | Client feature gates from sub status |
| Calculate trial state | `status === 'trial'` on scoped row |
| Merge KPI sources | `computeAdminKPIs` S3+S6 |
| Aggregate MRR | Sum subscription rows in client |
| Pick first subscription | Any `find()` on subscription arrays |

### 5.3 Proposed client hooks (design only)

| Hook | Wraps | Used by |
|------|-------|---------|
| `useDashboardSummary()` | `admin.getDashboardSummary` | `AdminManagement` KPI, `Statistics` headline |
| `useOwnerOverviewList()` | `admin.getOwnerOverviewList` | Users panel |
| `useOwnerOverview(id)` | `admin.getOwnerOverview` | User modal |
| `useSubscriptionOverview()` | `admin.getSubscriptionOverview` | Statistics table |
| `useRestaurantList()` | `admin.listRestaurants` | Restaurant section |
| `useCanonicalMrr()` | `analytics.getMRR` | Statistics revenue block |

**No hook** may call legacy `getStatistics` or `listAllUsersWithSubscriptions` after migration complete.

### 5.4 Query runtime

| Rule | Detail |
|------|--------|
| `adminQueriesEnabled` | Retain — gates queries on `role === admin` until AR-1 `platform_authority` |
| Invalidation groups | Define `commercialQueryKeys` — invalidate as a set on subscription mutations |
| Dual-read window | Optional `useDashboardSummary({ includeLegacyCompare: true })` during AR-3 M3 only |

### 5.5 Files to modify (implementation checklist — not executed in AR-5)

| File | Change |
|------|--------|
| `client/src/pages/AdminManagement.tsx` | Replace queries; remove `getSubscriptionForRestaurant`; users panel API |
| `client/src/pages/Statistics.tsx` | Replace S6 queries with analytics + overview |
| `client/src/lib/admin/computeAdminKPIs.ts` | Delete or strip to non-commercial |
| `client/src/components/admin/AdminKpiOverview.tsx` | Bind to `DashboardSummary` props only |
| `client/src/pages/Users.tsx` | No commercial change |
| `client/src/pages/SuperAdminDashboard.tsx` | No commercial change |

---

## 6. Deliverable 5 — Component-Level Consumer Map

### 6.1 `AdminManagement.tsx` internal sections

| Section | Component area | Future data hook |
|---------|----------------|------------------|
| KPI Overview | `AdminKpiOverview` | `useDashboardSummary` |
| Restaurants | `AdminOperationsSection` cards | `useRestaurantList` |
| Users | `AdminUsersSection` table | `useOwnerOverviewList` |
| Create restaurant dialog | Form + `listPlans` picker | Mutation only; refetch summary |
| Edit restaurant subscription | Modal mutations | Post-mutation invalidate commercial keys |
| Create subscriber account | `createSubscriberAccount` | Governance — no commercial read |

### 6.2 `Statistics.tsx` blocks

| Block | Future API |
|-------|------------|
| Top KPI cards | `getDashboardSummary` or `analytics.getSubscriberCounts` + `getMRR` |
| Revenue area chart | `analytics.getRevenueByMonth` |
| Plan pie | `analytics.getPlanDistribution` |
| Subscription details table | `getSubscriptionOverview` |
| Entity totals (users/restaurants/menu) | `getExtendedStats` — non-commercial |

---

## 7. Deliverable 6 — Dashboard Readiness Gate (AR-5.11)

**ADMIN-UX-1** and client migration may begin **only when:**

| # | Prerequisite | Owner |
|---|--------------|-------|
| 1 | `CommercialReadService` implemented | AR-4 Phase 1 |
| 2 | `admin.getDashboardSummary` exists | AR-4 Phase 3 |
| 3 | `admin.getOwnerOverviewList` / `getOwnerOverview` exist | AR-4 Phase 2 |
| 4 | `admin.getSubscriptionOverview` exists | AR-4 Phase 2 |
| 5 | `analytics.getMRR` / `getARR` / `getPlanDistribution` exist | AR-4 Phase 4 |
| 6 | `admin.listRestaurants` with `ownerCommercial` exists | AR-4 Phase 5 |
| 7 | Screen dependency matrix (§4) APIs available | AR-5 + AR-4 |
| 8 | AR-3 M4 backfill complete **or** dual-read parity mode accepted | Data |

**Recommended sequence:**

```text
AR-4 server Phases 1–4
  → AR-3 M4 backfill (launch DB)
  → AR-5 client migration (this spec)
  → ADMIN-UX-1 visual rebuild (optional parallel after step 2)
  → AR-4 Phase 6 legacy procedure removal
```

---

## 8. Deliverable 7 — Acceptance Criteria (AR-5.12)

Migration complete when:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Users screen no longer uses S5 | No `listAllUsersWithSubscriptions` in client |
| 2 | KPI strip no longer uses S3/S6 | No `computeAdminKPIs` commercial merge; no `getStatistics` for MRR |
| 3 | Subscription screens use canonical authority | `getSubscriptionOverview` only on statistics table |
| 4 | Restaurant screens consume authority only | No `getSubscriptionForRestaurant`; `ownerCommercial` only |
| 5 | Trial displays use canonical trial state | DTO `trialStatus` only |
| 6 | Revenue uses owner-based metrics | `analytics.getMRR` — 3 scoped / 1 owner → 1 unit |
| 7 | Client derives no commercial truth | Lint/grep ban on client subscription pickers |
| 8 | All screens show identical state per owner | Cross-surface test for users 1 and 14760004 |
| 9 | Restaurant delete invalidates commercial queries | Integration test — MRR unchanged |
| 10 | Legacy queries removed from `adminQueriesEnabled` surfaces | Static analysis clean |

---

## 9. Migration Phasing (client-side)

Aligned with AR-3 / AR-4:

| Client phase | Scope | Legacy coexistence |
|--------------|-------|-------------------|
| **C1** | Add hooks calling new APIs alongside old | Dual columns optional |
| **C2** | KPI strip → `getDashboardSummary` | Deprecate `computeAdminKPIs` |
| **C3** | Users panel → `getOwnerOverviewList` | Remove `listAllUsersWithSubscriptions` |
| **C4** | Statistics → analytics + overview | Remove S6 bindings |
| **C5** | Restaurants → `listRestaurants` | Remove scoped helpers |
| **C6** | Delete legacy queries + dead code | Single authority UI |

---

## 10. Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD (CLIENT)                      │
│  Visualization Layer — Display Truth Only                        │
├─────────────┬─────────────┬──────────────┬──────────────────────┤
│ AdminMgmt   │ Statistics  │ Users        │ SuperAdmin           │
│ KPI/Users/  │ Revenue/    │ (governance) │ (governance)         │
│ Restaurants │ Subs table  │              │                      │
└──────┬──────┴──────┬──────┴──────┬───────┴──────────┬─────────┘
       │             │             │                  │
       ▼             ▼             ▼                  ▼
  getDashboard  getSubscription  listAllUsers    getExtendedStats
  Summary       Overview +       (no commercial)  (entity only)
                analytics.*
       │             │
       └──────┬──────┘
              ▼
┌─────────────────────────────────────────────────────────────────┐
│              commercial.* / admin.* / analytics.*              │
│                    (AR-4 Server Layer)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
                   CommercialReadService
                              ▼
                   getCommercialEntitlements (S1)
```

---

## 11. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Dashboard Inventory | §2 |
| 2 | Consumer Mapping | §3 |
| 3 | Screen Dependency Matrix | §4 |
| 4 | Client Rules | §5 |
| 5 | Dashboard Readiness Gate | §7 |
| 6 | Acceptance Criteria | §8 |
| 7 | Executive Recommendation | §1 |

---

## 12. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-REMEDIATION-AR-4.md` | Server API contracts |
| `ADMIN-DASHBOARD-REMEDIATION-AR-3.md` | Backfill + dual-read window |
| `ADMIN-DASHBOARD-AUDIT-ADA-1.md` | Current consumer evidence |
| `ADMIN-DASHBOARD-REMEDIATION-AR-1.md` | Governance screens |

---

```text
IMPLEMENTATION READY
DASHBOARD MIGRATION APPROVED
```

*End of AR-5. Consumer migration design only. No code, schema, migrations, or backfill.*
