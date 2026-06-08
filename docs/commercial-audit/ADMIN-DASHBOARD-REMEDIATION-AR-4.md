# ADMIN DASHBOARD REMEDIATION — AR-4 — Server Read / Metrics API Implementation Specification

**Program:** Admin Dashboard Remediation (AR)  
**Phase:** AR-4 — Server read / metrics API implementation specification  
**Date:** 2026-06-08  
**Status:** Complete — implementation design only  

**Mode:** Implementation specification only. No code changes, schema execution, migrations, or backfill execution.

**Upstream:**

| Document | Role |
|----------|------|
| ADA-0 / ADA-1 | Legacy consumer inventory (S2–S6) |
| AR-2 | Canonical commercial authority |
| AR-3 | Migration phases M1–M7 |
| AR-1 | Platform governance (orthogonal; metrics policy) |

**Approved canonical resolver:**

```text
getCommercialEntitlements(ownerId)
  → buildCommercialContextFromDb
  → pickUserLevelSubscription
  → resolveCommercialEntitlements
```

**Problem statement:** Admin dashboard procedures today resolve commercial state via S2–S6. AR-4 defines the **replacement server read architecture** where only S1-derived paths define product truth.

---

## 1. Executive Recommendation

Implement a dedicated **Commercial Read Layer** (`CommercialReadService`) and require all dashboard, metrics, subscription display, and entitlement consumers to read through it.

| Principle | Rule |
|-----------|------|
| Commercial truth exists in **one place** | `CommercialReadService` → `getCommercialEntitlements` |
| Dashboards **visualize** truth | Category B APIs compose Category A |
| Dashboards **never define** truth | No direct `user_subscriptions` picks in admin procedures |
| Metrics **derive** from owner truth | Category C — one owner = one unit |

**Classification:**

```text
IMPLEMENTATION READY
SERVER ARCHITECTURE APPROVED
```

**Answer to “What APIs are allowed to define commercial truth?”**

| Allowed | Not allowed |
|---------|-------------|
| `CommercialReadService.*` (Category A) | `getAdminStatistics` raw row scan as product truth |
| `getCommercialEntitlements` (internal) | `getAllUsersWithSubscriptions` + `find()` |
| Category B/C **only if** they call Category A | `getSubscriptionForRestaurant` for commercial columns |
| | Client `computeAdminKPIs` merging S3+S6 |

---

## 2. Deliverable 1 — Canonical Read Layer (AR-4.1)

### 2.1 Module placement (proposed)

```text
server/commercial/
  getCommercialEntitlements.ts          ← existing canonical integration
  buildCommercialContextFromDb.ts         ← existing DB adapter
  CommercialReadService.ts                ← NEW facade (AR-4)
  dto/
    OwnerCommercialState.ts               ← NEW standardized DTO
  router.ts                               ← extend Category A procedures
  metrics/
    CanonicalMetricsService.ts            ← NEW Category C aggregator
```

**Dependency rule:** `CommercialReadService` may import `getCommercialEntitlements`, `buildCommercialContextFromDb`, and pure `@commercial/*` types. It **must not** import `getSubscriptionForRestaurant`, `getAllUsersWithSubscriptions`, `getAdminStatistics`, or `resolveOrderingSubscriptionRow`.

### 2.2 CommercialReadService responsibilities

| Responsibility | Source | Notes |
|----------------|--------|-------|
| Resolve subscription | `getCommercialEntitlements` → `context.subscriptionRow` | Account-scoped only |
| Resolve plan | `entitlements.plan` + catalog join | From canonical context |
| Resolve entitlements | `entitlements.features`, `limits`, `commercial` | Full `CommercialEntitlements` |
| Resolve limits | `entitlements.limits` | `maxRestaurants` = `limits.restaurants` |
| Resolve trial state | `entitlements.status === 'trial'` + period fields | No legacy fallback |
| Resolve commercial status | `entitlements.accountType`, `commercial.*` | Includes MRR eligibility flags |

### 2.3 Service interface (normative)

```typescript
// Design-only — not implemented in AR-4

interface CommercialReadService {
  /** Single owner — authoritative commercial state */
  getOwnerCommercialState(ownerId: number, now?: Date): Promise<OwnerCommercialState>;

  /** Batch — admin list performance; same semantics as single */
  getOwnerCommercialStates(ownerIds: number[], now?: Date): Promise<OwnerCommercialState[]>;

  /** All owners with role=user (excludes platform-only metrics policy — see §7.3) */
  getAllOwnerCommercialStates(options?: { now?: Date }): Promise<OwnerCommercialState[]>;

  /** Thin delegates — all route through getOwnerCommercialState */
  getOwnerPlan(ownerId: number): Promise<PlanSlice>;
  getOwnerEntitlements(ownerId: number): Promise<EntitlementsSlice>;
  getOwnerTrialStatus(ownerId: number): Promise<TrialSlice>;
  getOwnerSubscription(ownerId: number): Promise<SubscriptionSlice>;
}
```

**Invariant:** Every public method ultimately calls `getCommercialEntitlements(ownerId)` exactly once per owner per request (batch may dedupe DB reads internally via shared `buildCommercialContextFromDb` batching — optimization allowed, semantics not).

### 2.4 Existing procedure alignment

| Current | Future |
|---------|--------|
| `commercial.getEntitlements` | **Retain** — authenticated owner self-read; wraps `CommercialReadService.getOwnerCommercialState(ctx.user.id)` |
| `getCommercialEntitlements` (direct import) | **Internal only** — called by `CommercialReadService`, guest ordering, restaurant limit gates |

---

## 3. Deliverable 2 — Read API Categories (AR-4.2)

### 3.1 Category A — Commercial Truth APIs (authoritative)

**Router namespace:** `commercial.*` (owner + admin read)

**Rule:** Must call `CommercialReadService` only. **No** direct subscription table queries for truth fields.

| Procedure | Input | Output | Access |
|-----------|-------|--------|--------|
| `commercial.getEntitlements` | — (self) | `OwnerCommercialState` | `verifiedProcedure` — existing, DTO upgrade |
| `commercial.getOwnerCommercialState` | `{ ownerId }` | `OwnerCommercialState` | `adminProcedure` |
| `commercial.getOwnerPlan` | `{ ownerId }` | `PlanSlice` | `adminProcedure` |
| `commercial.getOwnerEntitlements` | `{ ownerId }` | `EntitlementsSlice` | `adminProcedure` |
| `commercial.getOwnerTrialStatus` | `{ ownerId }` | `TrialSlice` | `adminProcedure` |
| `commercial.getOwnerSubscription` | `{ ownerId }` | `SubscriptionSlice` | `adminProcedure` |
| `commercial.getOwnerCommercialStates` | `{ ownerIds: number[] }` | `OwnerCommercialState[]` | `adminProcedure` — batch |

**Forbidden in Category A:** `getCanonicalUserSubscription`, `pickCanonicalSubscription(all scopes)`, `isSubscriptionActive`.

---

### 3.2 Category B — Dashboard Read APIs (derived)

**Router namespace:** `admin.*` (read procedures)

**Rule:** May **not** resolve subscriptions directly. Must compose Category A (+ non-commercial entity reads).

| Procedure | Replaces (legacy) | Composes |
|-----------|-------------------|----------|
| `admin.getOwnerOverview` | `listAllUsersWithSubscriptions` (S5) | User row + `CommercialReadService.getOwnerCommercialState` |
| `admin.getOwnerOverviewList` | Users panel on `/admin` | `listAllUsers` + batch Category A |
| `admin.getSubscriptionOverview` | `getSubscriptionDetails` (S6) | All owners → `getAllOwnerCommercialStates` |
| `admin.getDashboardSummary` | `getStatistics` + `getExtendedStats` + client `computeAdminKPIs` (S3+S6) | `CanonicalMetricsService` + entity counts |
| `admin.listAllRestaurantsWithSubscriptions` | **Deprecated** → rename behavior | `listRestaurants` + owner commercial state per `restaurant.userId` |

**`admin.getOwnerOverview(ownerId)` contract (AR-4.5):**

```typescript
type AdminOwnerOverview = {
  owner: {
    id: number;
    name: string | null;
    email: string | null;
    role: "user" | "admin";
    createdAt: string;
  };
  commercial: OwnerCommercialState;  // Category A — sole commercial block
};
```

**Non-commercial fields** (role, email, restaurant count) may come from `users` / `restaurants` tables. **Commercial fields** must come from Category A only.

---

### 3.3 Category C — Analytics APIs (metrics only)

**Router namespace:** `analytics.*` (new) **or** `admin.*` prefixed analytics procedures during transition.

**Rule:** Derive from canonical owner states. **Never** scan raw `user_subscriptions` for product MRR/subscriber truth.

| Procedure | Replaces | Derivation |
|-----------|----------|------------|
| `analytics.getMRR` | `getAdminStatistics.totalRevenue` / `computeAdminMrr` (S6) | Sum `monthlyEquivalent` for owners where `commercial.countsInMrr` |
| `analytics.getARR` | — (new) | `MRR × 12` or annual plan sum |
| `analytics.getPlanDistribution` | `subscriptionsByPlan` (S6) | `GROUP BY commercial.planCode` over owners |
| `analytics.getSubscriberCounts` | `activeSubscribers` / `trialSubscribers` (S6) | Count owners by `commercialStatus` |
| `analytics.getExpiringAccounts` | KPI `expiringSoon` (S3 client filter) | Owners where canonical period end within window |
| `analytics.getRevenueByMonth` | `getRevenueByMonth` (S6) | **Infra variant** or canonical billing events — see §7.4 |

**Infrastructure-only (S6 labeled):**

| Procedure | Label |
|-----------|-------|
| `analytics.getRawSubscriptionRowStats` | `infrastructureOnly: true` — not for product dashboard |

---

## 4. Deliverable 3 — Commercial State DTO (AR-4.4)

### 4.1 OwnerCommercialState (normative shape)

Every commercial consumer receives this structure. **No screen invents missing fields.**

```typescript
type OwnerCommercialState = {
  ownerId: number;

  // Subscription (account-scoped canonical row)
  subscriptionId: number | null;
  subscriptionStatus: "trial" | "active" | "canceled" | "expired" | null;

  // Plan (resolved)
  planId: number | null;
  planCode: CommercialPlan;       // NONE | TRIAL | BASIC | PROFESSIONAL | ENTERPRISE | ADMIN
  planName: string | null;        // catalog display name

  // Trial
  trialStatus: {
    isTrial: boolean;
    trialEndsAt: string | null;   // ISO UTC
    daysRemaining: number | null;
  };

  // Limits
  maxRestaurants: number | null;  // null = unlimited

  // Features (full matrix)
  features: CommercialFeatures;

  // Commercial status (aggregated)
  commercialStatus: {
    accountType: AccountType;     // NONE | TRIAL | PAYING | ADMIN
    isPaid: boolean;
    isEntitled: boolean;          // trial or active with valid period
    countsInMrr: boolean;
    countsInRevenue: boolean;
    invoiceEligible: boolean;
  };

  // Period (billing display)
  currentPeriodEnd: string | null;
  billingCycle: "monthly" | "yearly" | null;

  // Provenance (debug / migration)
  authoritySource: "S1_CANONICAL";
  resolvedAt: string;             // ISO UTC
};
```

### 4.2 Mapping from existing `CommercialEntitlementsResult`

| DTO field | Source |
|-----------|--------|
| `planCode` | `entitlements.plan` |
| `subscriptionStatus` | `entitlements.status` |
| `subscriptionId` | `context.subscriptionRow?.id ?? null` |
| `planId` | `context.subscriptionRow?.planId ?? null` |
| `planName` | Catalog lookup via `planId` |
| `trialStatus.isTrial` | `entitlements.commercial.isTrial` |
| `trialEndsAt` | `context.subscriptionRow?.trialEndsAt` |
| `maxRestaurants` | `entitlements.limits.restaurants` |
| `features` | `entitlements.features` |
| `commercialStatus.*` | `entitlements.commercial` + `accountType` |
| `countsInMrr` | `entitlements.commercial.countsInMrr` (existing flag) |

### 4.3 DTO builder location

```text
CommercialReadService
  → getCommercialEntitlements(ownerId)
  → mapToOwnerCommercialState(result, catalogPlan?)
```

**Single mapper** — prevents per-procedure field drift.

---

## 5. Deliverable 4 — Dashboard API Contracts (AR-4.5, AR-4.6)

### 5.1 `admin.getOwnerOverview`

| Attribute | Value |
|-----------|-------|
| **Input** | `{ ownerId: number }` |
| **Auth** | `assertAdminAccess` |
| **Commercial source** | `CommercialReadService.getOwnerCommercialState(ownerId)` only |
| **Returns** | `AdminOwnerOverview` (§3.2) |

**Replaces:** S5 display in `admin.listAllUsersWithSubscriptions`.

---

### 5.2 `admin.getOwnerOverviewList`

| Attribute | Value |
|-----------|-------|
| **Input** | `{ cursor?, limit?, roleFilter? }` |
| **Auth** | `assertAdminAccess` |
| **Pattern** | `users` query → `ownerIds[]` → `getOwnerCommercialStates(ownerIds)` |
| **Returns** | `{ items: AdminOwnerOverview[]; nextCursor? }` |

**Client rule:** Users panel on `/admin` binds **only** to this procedure for commercial columns.

---

### 5.3 `admin.getDashboardSummary`

Replaces fragmented KPI sourcing (`getStatistics` + `getExtendedStats` + `listAllRestaurantsWithSubscriptions` + `computeAdminKPIs`).

| Attribute | Value |
|-----------|-------|
| **Input** | `{ now?: string }` optional |
| **Auth** | `assertAdminAccess` |

**Response:**

```typescript
type DashboardSummary = {
  // Commercial — Category C via CanonicalMetricsService
  activeOwners: number;           // owners with isEntitled
  activeSubscriptions: number;    // owners with status=active (canonical)
  activeTrials: number;           // owners with status=trial
  expiringAccounts: number;       // canonical period end within 30d
  mrr: number;
  arr: number;

  // Operational — non-commercial entity counts (unchanged semantics)
  totalUsers: number;
  totalRestaurants: number;
  activeRestaurants: number;      // venues isActive=1 — NOT subscription truth

  // Meta
  metricsSource: "CANONICAL_OWNER";
  legacyRowCount?: number;        // optional infra compare during AR-3 M3 only
};
```

**Critical decoupling:** `activeRestaurants` is **operational** (venue count). `activeSubscriptions` is **commercial** (owner count). They **must not** be derived from the same query.

---

### 5.4 `admin.getSubscriptionOverview`

| Attribute | Value |
|-----------|-------|
| **Input** | `{ statusFilter?, planFilter? }` |
| **Returns** | `{ owners: OwnerCommercialState[] }` sorted by owner |
| **Replaces** | `getSubscriptionDetails` (S6 flat row list + wrong restaurant join) |

Statistics page subscription table binds to this — **one row per owner**, not per subscription row.

---

### 5.5 Legacy procedure disposition

| Legacy procedure | Strategy | Replacement |
|------------------|----------|-------------|
| `admin.getStatistics` | **Deprecate** → redirect | `admin.getDashboardSummary` + `analytics.*` |
| `admin.listAllUsersWithSubscriptions` | **Deprecate** | `admin.getOwnerOverviewList` |
| `admin.getSubscriptionDetails` | **Deprecate** | `admin.getSubscriptionOverview` |
| `admin.getRevenueByMonth` | **Deprecate or infra-relabel** | `analytics.getRevenueByMonth` |
| `admin.listAllRestaurantsWithSubscriptions` | **Replace read semantics** | Restaurants + `commercial.getOwnerCommercialStates` |
| `admin.getExtendedStats` | **Retain** partial | Entity/growth counts only — no subscription fields |

---

## 6. Deliverable 5 — Metrics API Contracts (AR-4.7)

### 6.1 CanonicalMetricsService (internal)

```text
CanonicalMetricsService
  → CommercialReadService.getAllOwnerCommercialStates()
  → aggregate in memory (launch DB: 2 owners — scale later with SQL batch)
```

### 6.2 MRR specification

```text
FOR EACH owner O:
  state = getOwnerCommercialState(O)
  IF state.commercialStatus.countsInMrr:
    MRR += monthlyEquivalent(state.planId, state.billingCycle)

NEVER:
  FOR EACH row IN user_subscriptions WHERE status=active:
    MRR += price   // S6 — forbidden for product
```

| Rule | Value |
|------|-------|
| Unit | **1 owner = 1 contribution** |
| Include | `status = active` + valid period + `countsInMrr = true` |
| Exclude | `trial`, `canceled`, `expired`, `plan = NONE` |
| Billing cycle | Yearly → `priceYearly / 12` (reuse `monthlyEquivalentPlanPrice` logic on canonical plan) |

### 6.3 ARR specification

```text
ARR = MRR × 12
```

For owners on yearly billing, ARR may alternatively use `priceYearly` directly — **implementation choice**; must document in API response `arrMethod: "MRR_X12" | "ANNUAL_SUM"`.

### 6.4 Plan distribution

```text
GROUP owners BY planCode
COUNT owners per plan
```

**Never:** `GROUP BY planId` on raw subscription rows.

### 6.5 Subscriber counts

| Metric | Definition |
|--------|------------|
| `activeSubscriptions` | `COUNT(O where subscriptionStatus = 'active' AND isEntitled)` |
| `activeTrials` | `COUNT(O where subscriptionStatus = 'trial' AND isEntitled)` |
| `churned` | `COUNT(O where subscriptionStatus IN ('canceled','expired'))` |

### 6.6 Platform admin handling (AR-1 alignment)

| Policy | Recommendation |
|--------|----------------|
| `role = admin` owners | `planCode = ADMIN`; `countsInMrr = false` by default |
| MRR / subscriber metrics | Count **`role = user`** owners only unless explicit `includeOperators` flag |
| Display | Admin accounts show `ADMIN` plan in overview — not mixed into paying MRR |

### 6.7 Revenue-by-month (transitional)

| Variant | Use |
|---------|-----|
| **Canonical** (target) | Recognized revenue events / canonical period starts — design in AR-5 billing alignment |
| **Infra (S6)** | `analytics.getRawSubscriptionRowStats` — labeled, not on dashboard |

During AR-3 M3, dashboard may expose `legacyMrr` alongside `mrr` for parity comparison — **remove before launch-complete gate**.

---

## 7. Deliverable 6 — Trial API Specification (AR-4.8)

### 7.1 Authoritative trial procedures

| Procedure | Source |
|-----------|--------|
| `commercial.getOwnerTrialStatus` | `CommercialReadService` → S1 |
| `subscription.checkTrialStatus` (owner) | **Migrate** to Category A — remove fallback |

### 7.2 TrialSlice shape

```typescript
type TrialSlice = {
  ownerId: number;
  isTrial: boolean;
  subscriptionStatus: "trial" | null;
  trialEndsAt: string | null;
  daysRemaining: number | null;
  isEntitled: boolean;
  authoritySource: "S1_CANONICAL";
};
```

### 7.3 Forbidden paths

| Path | Action |
|------|--------|
| `resolveTrialStatusRead` → `isSubscriptionActive` when `plan === NONE` | **Remove** (AR-3 M6) |
| Scoped row `status = trial` | **Ignore** for trial API |
| `getTrialEndDate` any-scope | **Deprecate** → Category A |

---

## 8. Deliverable 7 — Restaurant API Rules (AR-4.9, AR-4.10)

### 8.1 Restaurant read rules

Restaurant APIs may **consume** (from owner's `OwnerCommercialState`):

| Allowed consumption | Field |
|--------------------|-------|
| Limits | `maxRestaurants`, menu limits via `features` |
| Features | `features.ordering`, template gates |
| Ordering | `resolveGuestOrderingAllowed` (existing — already S1) |

Restaurant APIs may **not**:

| Forbidden | Reason |
|-----------|--------|
| `getSubscriptionForRestaurant` for commercial status | S2 |
| `subscription.getByRestaurant` for plan badge | S2 |
| Infer plan from `restaurants` row | AR-2 inversion rule |
| Resolve `subscriptionStatus` per venue | Subscription is account-level |

### 8.2 Restaurant list contract (admin)

**Future `admin.listRestaurants` (read):**

```typescript
type RestaurantListItem = {
  restaurant: { id; name; slug; userId; isActive; ... };
  ownerCommercial: Pick<OwnerCommercialState,
    "planCode" | "subscriptionStatus" | "commercialStatus" | "trialStatus"
  >;
  // NO per-restaurant subscriptionId as authority
  legacyScopedSubscriptionId?: number | null;  // migration-only, remove M7
};
```

`ownerCommercial` loaded via `getOwnerCommercialState(restaurant.userId)` — **same truth** as Users panel.

### 8.3 Delete restaurant contract (AR-4.10)

| Requirement | Specification |
|-------------|---------------|
| Pre-delete | `truth(ownerId)` snapshot logged (optional audit) |
| Cascade | May delete scoped legacy rows — **must not** mutate account subscription |
| Post-delete response | `{ restaurantId, ownerCommercial: OwnerCommercialState }` — proves invariant |
| Client invalidation | Invalidate `getDashboardSummary`, `getOwnerOverviewList`, `getSubscriptionOverview`, `listRestaurants` |

**Forbidden post-delete behavior:**

- Recompute MRR from remaining scoped rows (S6)
- Show changed `planCode` for owner unless account row actually changed

---

## 9. Deliverable 8 — Resolver Deprecation Plan (AR-4.3)

### 9.1 Strategy matrix

| Strategy | Server read future | AR-4 action |
|----------|-------------------|-------------|
| **S1** | **KEEP** | `CommercialReadService` sole truth |
| **S2** | **REMOVE** | No Category A/B/C caller |
| **S3** | **REMOVE** | Restaurant list uses owner commercial |
| **S4** | **MIGRATE** | Invoice/activation → account row id from Category A |
| **S5** | **REMOVE** | `getOwnerOverviewList` replaces `find()` |
| **S6** | **ANALYTICS ONLY** | `getRawSubscriptionRowStats` infra label |

### 9.2 Function → replacement map

| Legacy function | Used by (today) | Replacement |
|-----------------|-----------------|-------------|
| `getAdminStatistics` | `/admin`, `/statistics` KPI | `admin.getDashboardSummary` |
| `computeAdminMrr` | S6 path | `CanonicalMetricsService.computeMrr` |
| `getAllUsersWithSubscriptions` | Users panel S5 | `admin.getOwnerOverviewList` |
| `getSubscriptionDetails` | Statistics table S6 | `admin.getSubscriptionOverview` |
| `getAllRestaurantsWithSubscriptions` | Restaurant cards S3 | `admin.listRestaurants` + owner commercial |
| `getCanonicalUserSubscription` | Invoice S4 | `commercial.getOwnerSubscription` |
| `getSubscriptionForRestaurant` | Scoped display S2 | **Remove** from read paths |
| `resolveTrialStatusRead` | Trial API | `commercial.getOwnerTrialStatus` |
| `computeAdminKPIs` (client) | KPI strip merge | **Delete** — server `getDashboardSummary` |

### 9.3 Mutation procedures (out of AR-4 read scope — noted)

Write paths (`createRestaurantSubscription`, etc.) are **AR-3 M4/M5** — AR-4 specifies reads only. Mutations must eventually target account-scoped rows; read layer assumes M4 backfill complete for parity.

---

## 10. Deliverable 9 — API Migration Order (AR-4.11)

Aligned with AR-3 phases:

| Phase | AR-4 deliverable | Procedures / modules |
|-------|------------------|----------------------|
| **Phase 1** | Commercial Read Layer | `CommercialReadService`, `OwnerCommercialState` mapper, extend `commercial.getEntitlements` |
| **Phase 2** | Owner Overview APIs | `commercial.getOwnerCommercialState(s)`, `admin.getOwnerOverview`, `admin.getOwnerOverviewList` |
| **Phase 3** | Dashboard Summary APIs | `admin.getDashboardSummary` |
| **Phase 4** | Metrics APIs | `analytics.getMRR`, `getARR`, `getPlanDistribution`, `getSubscriberCounts`, `getExpiringAccounts` |
| **Phase 5** | Restaurant Consumers | `admin.listRestaurants` contract; guest ordering unchanged (already S1) |
| **Phase 6** | Legacy Resolver Removal | Deprecate `getStatistics`, `listAllUsersWithSubscriptions`, `getSubscriptionDetails`; remove S2/S3/S5 callers |

**Dual-read window (AR-3 M2–M3):** Legacy procedures remain callable but return `deprecated: true` header or parallel `legacy*` fields on summary — **max one release**.

---

## 11. Deliverable 10 — Acceptance Criteria (AR-4.12)

Implementation complete when:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Dashboard uses canonical read layer | All admin commercial columns from Category A/B |
| 2 | MRR uses owner-based accounting | Unit test: 3 scoped rows / 1 owner → 1 MRR unit |
| 3 | Trial uses canonical authority | No `isSubscriptionActive` in trial path |
| 4 | Restaurants consume authority only | No `getSubscriptionForRestaurant` in admin restaurant read |
| 5 | No dashboard resolver uses S2 | Static analysis / grep gate |
| 6 | No dashboard resolver uses S3 | Static analysis / grep gate |
| 7 | No dashboard resolver uses S5 | No `find()` subscription pick |
| 8 | S4 retired | Invoice uses `commercial.getOwnerSubscription` |
| 9 | S6 analytics-only | Product dashboard uses `analytics.*` canonical only |
| 10 | Identical commercial state per owner | `getOwnerOverview` === restaurant card owner block === statistics row |

---

## 12. Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         tRPC Routers                                     │
│  commercial.* (A)    admin.* (B)    analytics.* (C)                   │
└───────┬─────────────────────┬──────────────────────┬────────────────────┘
        │                     │                      │
        ▼                     ▼                      ▼
┌───────────────┐    ┌────────────────┐    ┌─────────────────────────┐
│ Commercial    │    │ AdminDashboard │    │ CanonicalMetricsService │
│ ReadService   │◄───│ ReadService    │───►│ (owner aggregation)     │
│ (TRUTH)       │    │ (compose)      │    │                         │
└───────┬───────┘    └────────────────┘    └─────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ getCommercialEntitlements(ownerId)    │  ← S1 ONLY
│ buildCommercialContextFromDb          │
│ pickUserLevelSubscription             │
│ resolveCommercialEntitlements         │
└───────────────────────────────────────┘

        ╳ blocked ╳
┌───────────────────────────────────────┐
│ S2 getSubscriptionForRestaurant       │
│ S3 resolveOrderingSubscriptionRow     │
│ S5 getAllUsersWithSubscriptions find  │
│ S6 getAdminStatistics raw scan          │  → infra-only tombstone
└───────────────────────────────────────┘
```

---

## 13. Client consumption map (reference for AR-5)

| UI surface | Current procedure | Target procedure |
|------------|-------------------|------------------|
| `/admin` KPI strip | `getStatistics` + `computeAdminKPIs` | `admin.getDashboardSummary` |
| `/admin` Users columns | `listAllUsersWithSubscriptions` | `admin.getOwnerOverviewList` |
| `/admin` Restaurant badges | `listAllRestaurantsWithSubscriptions` | `admin.listRestaurants` |
| `/statistics` MRR | `getStatistics` | `analytics.getMRR` or summary |
| `/statistics` table | `getSubscriptionDetails` | `admin.getSubscriptionOverview` |
| Owner `/dashboard` | `commercial.getEntitlements` | Same (DTO upgrade) |
| Trial banner | `checkTrialStatus` | `commercial.getOwnerTrialStatus` |

*AR-5 will specify client rebuild; AR-4 defines server contracts only.*

---

## 14. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Canonical Read Layer Specification | §2 |
| 2 | Dashboard API Contracts | §5 |
| 3 | Metrics API Contracts | §6 |
| 4 | DTO Specification | §4 |
| 5 | Resolver Deprecation Plan | §9 |
| 6 | Migration Order | §10 |
| 7 | Acceptance Criteria | §11 |
| 8 | Executive Recommendation | §1 |

---

## 15. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-REMEDIATION-AR-2.md` | Canonical authority rules |
| `ADMIN-DASHBOARD-REMEDIATION-AR-3.md` | Migration phases M1–M7 |
| `ADMIN-DASHBOARD-AUDIT-ADA-1.md` | Legacy procedure inventory |
| `ADMIN-DASHBOARD-REMEDIATION-AR-1.md` | Platform admin metrics policy |

---

```text
IMPLEMENTATION READY
SERVER ARCHITECTURE APPROVED
```

*End of AR-4. Implementation design only. No code, schema execution, migrations, or backfill.*
