# ADMIN DASHBOARD AUDIT — ADA-0 — Commercial Authority Discovery

**Program:** Admin Dashboard Audit (ADA)  
**Phase:** ADA-0 — Commercial authority discovery  
**Date:** 2026-06-08  
**Status:** Complete — read-only documentation  

**Mode:** Repository discovery only. No code, schema, database, migration, or cleanup execution.

**Context:** DATA-INTEGRITY-1 complete. Launch database (`gateway01` / `mineuqr`) structurally sound; Phase E identified **pre-ASN scoped subscription data** (4 scoped rows, 0 account-scoped). Suspected symptom: **admin dashboard authority drift** — different screens may read different commercial sources.

---

## 1. Executive Summary

### 1.1 Canonical answer (by design)

MineuQR’s **intended** commercial source of truth (post-ASN-5) is:

```text
Owner Account (users.id)
  → Account-scoped subscription row (user_subscriptions WHERE restaurantId = 0)
  → Plan catalog (subscription_plans via planId)
  → CommercialContext (buildCommercialContextFromDb)
  → resolveCommercialEntitlements (planFeatureMatrix)
  → Features + limits + ordering permission
```

**Canonical read chain (code):**

`getCommercialEntitlements(ownerId)` → `buildCommercialContextFromDb` → `pickUserLevelSubscription` → `resolveCommercialEntitlements`

**Canonical write chain (new registrations, ASN-5):**

`registerOwnerTransactional` → `buildTrialSubscriptionForUser(userId, 0)` → INSERT `user_subscriptions` with `restaurantId = 0`

### 1.2 Discovery finding

**Multiple commercial authority systems coexist in production code today.**

| Layer | Authority model | Still active? |
|-------|-----------------|---------------|
| ASN canonical entitlements | Account-scoped (`restaurantId = 0`) | **Yes** — guest ordering, owner UI visibility |
| Restaurant-scoped subscription reads | `restaurantId > 0` strict or scoped-first | **Yes** — admin restaurant UI, `getByRestaurant`, plan limits |
| Legacy “any row” entitlement | Any entitled row for user | **Yes** — `isSubscriptionActive`, trial status fallback |
| Raw table aggregation | All `user_subscriptions` rows | **Yes** — MRR, admin statistics |
| Non-deterministic user pick | `Array.find` first row | **Yes** — `getAllUsersWithSubscriptions` |

### 1.3 Launch database compatibility

| Expectation | Launch data (`mineuqr`) | Effect |
|-------------|-------------------------|--------|
| ASN reads `restaurantId = 0` | **0 account rows**, 4 scoped rows | `getCommercialEntitlements` → `plan: NONE` for `role = user` |
| Admin role bypass | User `1` is `admin` | `plan: ADMIN` without reading subscription rows |
| Scoped rows visible to legacy paths | 4 active scoped subs | Admin restaurant list, MRR, statistics **see** subscriptions |
| Owner entitlements UI | Account path only | Owner/test user sees **NONE** despite active scoped subs |

### 1.4 Output classification

## **RED**

Conflicting authority systems **actively coexist** and produce **different commercial states** on the same dataset. Dashboard authority drift is **real** (not only a UI symptom) — it originates from **multiple server-side resolvers** and **inconsistent client data sources**.

Bounded scope: only **2 users**, **4 subscriptions** on launch DB — impact is contained but architecturally significant.

---

## 2. Commercial Authority Inventory (ADA-0.1)

### 2.1 Search scope

Repository areas reviewed:

| Area | Path | Commercial relevance |
|------|------|----------------------|
| Canonical entitlements | `server/commercial/` | **Primary ASN chain** |
| Subscription resolver | `server/subscriptionResolver.ts` | Scope selection (`pickUserLevelSubscription`, `resolveOrderingSubscriptionRow`) |
| DB accessors | `server/db.ts` | Subscription lookups, admin statistics, restaurant-sub joins |
| Entitlement primitives | `server/subscriptionEntitlement.ts` | Period-valid entitled checks |
| Plan limits / quotas | `server/subscriptionPlanLimits.ts` | Restaurant create, menu limits |
| Trial status reads | `server/commercial/wave1ReadAuthority.ts` | Hybrid canonical + legacy |
| Guest ordering | `server/commercial/guestOrderingAuthority.ts` | ASN-5 canonical gate |
| tRPC routers | `server/routers.ts` | `subscription`, `admin`, `commercial` procedures |
| Pure entitlements lib | `src/lib/commercial/` | `resolveCommercialEntitlements`, `planFeatureMatrix` |
| Admin KPI client | `client/src/lib/admin/computeAdminKPIs.ts` | Derived dashboard metrics |
| Admin pages | `client/src/pages/AdminManagement.tsx`, `Statistics.tsx`, `Users.tsx` | Dashboard consumers |
| Owner dashboard | `client/src/pages/Dashboard.tsx` | `useCommercialFeatureVisibility` |

No separate `server/services` or `dashboard services` packages — authority lives in `server/db.ts`, `server/commercial/`, `server/routers.ts`, and `src/lib/commercial/`.

### 2.2 Authority entry points (grouped)

#### A — Canonical ASN chain

| Entry | File | Role |
|-------|------|------|
| `getCommercialEntitlements` | `server/commercial/getCommercialEntitlements.ts` | Server integration facade |
| `buildCommercialContextFromDb` | `server/commercial/buildCommercialContextFromDb.ts` | DB → CommercialContext adapter |
| `pickUserLevelSubscription` | `server/subscriptionResolver.ts` | **Filters `restaurantId === 0`** |
| `resolveCommercialEntitlements` | `src/lib/commercial/resolveCommercialEntitlements.ts` | Plan/features/limits output |
| `resolveGuestOrderingAllowed` | `server/commercial/guestOrderingAuthority.ts` | Ordering permission gate |
| `commercial.getEntitlements` | `server/commercial/router.ts` | tRPC read for owner UI |
| `useCommercialEntitlements` | `client/src/hooks/useCommercialEntitlements.ts` | Client consumer |

#### B — Restaurant-scoped authority

| Entry | File | Role |
|-------|------|------|
| `getSubscriptionForRestaurant` | `server/db.ts` | `WHERE restaurantId = ?` canonical pick |
| `subscription.getByRestaurant` | `server/routers.ts` | Owner per-venue subscription card |
| `getAllRestaurantsWithSubscriptions` | `server/db.ts` | Scoped row first, account fallback |
| `admin.createRestaurantSubscription` | `server/routers.ts` | Inserts **scoped** rows |
| `admin.listAllRestaurantsWithSubscriptions` | `server/routers.ts` | Admin restaurant dashboard feed |

#### C — Scoped-first / hybrid authority

| Entry | File | Role |
|-------|------|------|
| `resolveOrderingSubscriptionRow` | `server/subscriptionResolver.ts` | Scoped first → account fallback |
| `resolvePlanLimitsForUser` | `server/subscriptionPlanLimits.ts` | Uses ordering resolver when `restaurantId` set |
| `getCanonicalUserSubscription` | `server/db.ts` | Best row across **all scopes** |
| `subscription.getCurrentSubscription` | `server/routers.ts` | Account subscription API (any-scope canonical) |
| `resolveTrialStatusRead` | `server/commercial/wave1ReadAuthority.ts` | Entitlements + legacy `isSubscriptionActive` fallback |
| `isSubscriptionActive` / `getTrialEndDate` | `server/db.ts` | Any entitled row on user |

#### D — Legacy / deprecated

| Entry | File | Status |
|-------|------|--------|
| `restaurantAllowsTableOrdering` | `server/db.ts` | `@deprecated` ASN-5 — scoped-first ordering |
| `getOrderingSubscriptionForRestaurant` | `server/db.ts` | Used only by deprecated path |
| `getSubscriptionByRestaurantId` | `server/db.ts` | `@deprecated` alias |

#### E — Raw aggregation (metrics)

| Entry | File | Role |
|-------|------|------|
| `getAdminStatistics` | `server/db.ts` | Counts all subs; MRR via `computeAdminMrr` |
| `getRevenueByMonth` | `server/db.ts` | Revenue buckets by sub `createdAt` |
| `getSubscriptionDetails` | `server/db.ts` | Flat sub list for statistics page |
| `getExtendedAdminStats` | `server/db.ts` | Entity totals + growth buckets |
| `computeAdminMrr` | `server/adminKpiCalculations.ts` | Pure MRR from all `active` rows |

#### F — Admin mutation / protection

| Entry | File | Role |
|-------|------|------|
| `createUserSubscriptionByAdmin` | `server/routers.ts` | User-level sub create (often scoped via helper) |
| `updateUserSubscriptionByAdmin` | `server/routers.ts` | `resolveSubscriptionForActivation` target pick |
| `resolveSubscriptionRestaurantIdForUser` | `server/adminSubscriptionHelpers.ts` | Defaults to scoped when user has restaurants |
| `PROTECTED_USER_IDS` | `shared/const.ts` | Admin user `1` delete/role guard |
| `deleteUserCascade` / `deleteRestaurantCascade` | `server/db/cascadeDeletes.ts` | Deletes scoped subs with restaurant |

---

## 3. Authority Source Mapping (ADA-0.2)

| Domain | Function | Source Table | Service / Module | Notes |
|--------|----------|--------------|------------------|-------|
| **Subscription Status (canonical)** | `pickUserLevelSubscription` → `buildCommercialContextFromDb` | `user_subscriptions` (`restaurantId = 0` only) | `server/commercial/buildCommercialContextFromDb.ts` | No row → `plan: NONE` for users |
| **Subscription Status (admin bypass)** | `buildCommercialContext` (`role === admin`) | N/A (ignores subs) | `src/lib/commercial/commercialContext.ts` | Always `plan: ADMIN` |
| **Subscription Status (per restaurant)** | `getSubscriptionForRestaurant` | `user_subscriptions` (`restaurantId = venue`) | `server/db.ts` | Strict scoped; no account fallback |
| **Subscription Status (user API)** | `getCanonicalUserSubscription` | `user_subscriptions` (all scopes) | `server/db.ts` + `pickCanonicalSubscription` | May differ from account-only path |
| **Subscription Status (admin user list)** | `getAllUsersWithSubscriptions` → `allSubs.find(...)` | `user_subscriptions` | `server/db.ts` | **Non-deterministic** first match |
| **Plan Resolution (canonical)** | `mapPlanIdToCatalogPlan` → `resolveCommercialEntitlements` | `subscription_plans` via row `planId` | `src/lib/commercial/planIdMapping.ts` | Trial overrides to `plan: TRIAL` |
| **Plan Resolution (scoped display)** | `getSubscriptionPlanById(sub.planId)` | `subscription_plans` | `server/db.ts` | Used in admin/owner subscription cards |
| **Commercial Entitlements** | `getCommercialEntitlements` | `users` + account-scoped sub | `server/commercial/getCommercialEntitlements.ts` | **Authoritative for features/ordering (ASN)** |
| **Commercial Entitlements (legacy any-row)** | `userHasSubscriptionEntitlement` | Any entitled `user_subscriptions` row | `server/subscriptionEntitlement.ts` | Used by `isSubscriptionActive` fallback |
| **Restaurant Limits** | `resolvePlanLimitsForUser` | Sub row via `resolveOrderingSubscriptionRow` or `pickCanonicalSubscription` | `server/subscriptionPlanLimits.ts` | **Scoped-first** when `restaurantId` provided |
| **Restaurant Limits (fallback)** | `getFallbackBasicLimits` | `subscription_plans` (basic tier) | `server/subscriptionPlanLimits.ts` | When no entitled sub/plan |
| **Ordering Permissions (canonical)** | `resolveGuestOrderingAllowed` | Owner → `getCommercialEntitlements` | `server/commercial/guestOrderingAuthority.ts` | `features.ordering` only |
| **Ordering Permissions (legacy)** | `restaurantAllowsTableOrdering` | `resolveOrderingSubscriptionRow` + plan | `server/db.ts` | Deprecated; scoped-first |
| **Commercial Metrics (MRR)** | `computeAdminMrr` | All `user_subscriptions` where `status = active` | `server/adminKpiCalculations.ts` | Counts **every** active row (duplicate per user/venue) |
| **Commercial Metrics (dashboard KPIs)** | `computeAdminKPIs` | Mix: `listAllRestaurantsWithSubscriptions` + `getAdminStatistics` | `client/src/lib/admin/computeAdminKPIs.ts` | **Two authorities merged client-side** |
| **Commercial Metrics (subscription details)** | `getSubscriptionDetails` | All subs; restaurant = **first** user restaurant | `server/db.ts` | Can mislabel scoped sub venue |

---

## 4. Canonical vs Derived vs Legacy (ADA-0.3)

| Component | Classification | Reason |
|-----------|----------------|--------|
| `getCommercialEntitlements` | **CANONICAL** | ASN-5 designated read facade; feeds owner UI + guest ordering |
| `buildCommercialContextFromDb` | **CANONICAL** | Adapter; enforces account-scoped row pick |
| `pickUserLevelSubscription` | **CANONICAL** | Defines account-level subscription selection |
| `resolveCommercialEntitlements` | **CANONICAL** | Pure entitlement resolver from CommercialContext |
| `resolveGuestOrderingAllowed` | **CANONICAL** | ASN-5 guest ordering gate |
| `registerOwner` account trial (`restaurantId = 0`) | **CANONICAL** | ASN-5 write path for new owners |
| `planFeatureMatrix` / `planIdMapping` | **CANONICAL** | Static plan catalog semantics |
| `commercial.getEntitlements` tRPC | **DERIVED** | Transport wrapper over canonical read |
| `useCommercialEntitlements` / `useCommercialFeatureVisibility` | **DERIVED** | Client cache of canonical entitlements |
| `computeAdminKPIs` | **DERIVED** | Presentation aggregation; mixes sources |
| `getAdminStatistics` | **DERIVED** | Raw SQL counts → dashboard cards |
| `getRevenueByMonth` | **DERIVED** | Reporting projection from raw subs |
| `getExtendedAdminStats` | **DERIVED** | Growth charts; not entitlement authority |
| `getAllRestaurantsWithSubscriptions` | **LEGACY** (active) | Scoped-first display model; not account canonical |
| `getSubscriptionForRestaurant` | **LEGACY** (active) | Restaurant-scoped authority |
| `resolveOrderingSubscriptionRow` | **LEGACY** (active) | Pre-ASN ordering/limit preference |
| `resolvePlanLimitsForUser` (with `restaurantId`) | **LEGACY** (active) | Uses scoped-first resolver |
| `getCanonicalUserSubscription` | **LEGACY** (ambiguous) | Any-scope canonical; used as “account” API |
| `isSubscriptionActive` / `getTrialEndDate` | **LEGACY** (active) | Any-row entitlement; trial status fallback |
| `resolveTrialStatusRead` fallback branch | **LEGACY** (active) | Calls `isSubscriptionActive` when `plan === NONE` |
| `getAllUsersWithSubscriptions` | **LEGACY** (defect) | Non-canonical `find()` — order-dependent |
| `restaurantAllowsTableOrdering` | **LEGACY** (deprecated) | Marked for Wave E removal |
| `admin.createRestaurantSubscription` | **LEGACY** (active writer) | Creates scoped rows (ASN-4C C-05) |
| `admin.createUserSubscriptionByAdmin` | **LEGACY** (active writer) | Often scoped via `resolveSubscriptionRestaurantIdForUser` |
| `subscription.getByRestaurant` | **LEGACY** (active) | Scoped read for owner dashboard cards |
| `getSubscriptionDetails` restaurant join | **LEGACY** (defect) | Wrong restaurant attribution |

---

## 5. ASN Authority Review (ADA-0.4)

### 5.1 ASN components

| ASN Component | Expected Model | Current Data Compatibility (`mineuqr`) |
|---------------|----------------|----------------------------------------|
| `pickUserLevelSubscription` | Read only `user_subscriptions` where `restaurantId = 0`; pick best entitled row | **INCOMPATIBLE** — 0 account rows on launch DB |
| `buildCommercialContextFromDb` | User: account row → CommercialContext; Admin: skip subs → ADMIN | **PARTIAL** — admin OK; user `14760004` → empty context → NONE |
| `getCommercialEntitlements` | `resolveCommercialEntitlements(context)` → features/limits/plan | **PARTIAL** — admin = ADMIN entitlements; test user = NONE |
| `resolveGuestOrderingAllowed` | `restaurant.userId` → entitlements → `features.ordering` | **INCOMPATIBLE** for scoped-only owners — ordering denied despite scoped `active` rows |
| `registerOwner` (ASN-5) | Insert trial with `restaurantId = 0` | **Compatible for new registrations** — does not fix existing scoped rows |
| `resolveTrialStatusRead` | Primary: entitlements; Fallback: `isSubscriptionActive` (any row) | **HYBRID** — test user may show **active trial** via fallback while entitlements show NONE |

### 5.2 ASN expectation summary

1. **Authority model ASN expects:** Account-scoped subscription is the **sole** input to commercial entitlements for `role = user`. Restaurant-scoped rows are **not** authoritative for features, ordering, or account plan display.
2. **Subscription shape ASN reads:** `user_subscriptions` with `restaurantId = 0`, entitled `trial` or `active`, valid period timestamps, valid `planId`.
3. **Launch database match:** **No** for user accounts — 100% scoped legacy footprint (DATA-INTEGRITY-1 Phase E). Admin account bypasses via `role = admin`.

---

## 6. Legacy Authority Register (ADA-0.5)

| Procedure | Purpose | Active | Legacy Candidate |
|-----------|---------|:------:|:----------------:|
| `getSubscriptionForRestaurant` | Canonical scoped row for one venue | **Yes** | **Yes** — display/billing helper; not entitlement authority |
| `getAllRestaurantsWithSubscriptions` | Admin restaurant list + embedded sub | **Yes** | **Yes** — scoped-first semantics |
| `resolveOrderingSubscriptionRow` | Pick sub for ordering/limits | **Yes** | **Yes** — pre-ASN scoped preference |
| `restaurantAllowsTableOrdering` | Legacy ordering entitlement | **Yes** (deprecated) | **Yes** — remove per ASN-5 Wave E |
| `getOrderingSubscriptionForRestaurant` | Helper for deprecated ordering | **Yes** | **Yes** |
| `createRestaurantSubscription` | Admin creates scoped sub | **Yes** | **Yes** — contradicts R1 register model |
| `createUserSubscriptionByAdmin` | Admin creates user sub | **Yes** | **Yes** — uses scoped `restaurantId` when user has venues |
| `updateUserSubscriptionByAdmin` | Admin updates via `resolveSubscriptionForActivation` | **Yes** | **Partial** — activation resolver is scope-aware |
| `getCanonicalUserSubscription` | “Current” sub for owner billing UI | **Yes** | **Yes** — any-scope pick confuses account API |
| `subscription.getByRestaurant` | Per-venue subscription in owner UI | **Yes** | **Yes** |
| `isSubscriptionActive` | Any entitled row check | **Yes** | **Yes** — trial status fallback |
| `getAllUsersWithSubscriptions` | Admin user management list | **Yes** | **Yes** — `find()` not canonical |
| `getSubscriptionDetails` | Statistics table | **Yes** | **Yes** — wrong restaurant mapping |
| `getAdminStatistics` | Subscriber counts + MRR | **Yes** | **Partial** — raw aggregation (valid for ops if understood) |

### 6.1 Multiple systems coexist?

**Yes.** At minimum **four** distinct subscription selection strategies are in simultaneous use:

| Strategy | Selector | Used by |
|----------|----------|---------|
| **S1 — Account-only** | `pickUserLevelSubscription` | Entitlements, guest ordering |
| **S2 — Scoped-only** | `getSubscriptionForRestaurant` | `getByRestaurant`, admin create conflict check |
| **S3 — Scoped-first hybrid** | `resolveOrderingSubscriptionRow` | Plan limits, deprecated ordering |
| **S4 — Any-scope canonical** | `pickCanonicalSubscription(all rows)` | `getCurrentSubscription`, activation |
| **S5 — First row** | `Array.find` | `getAllUsersWithSubscriptions` |
| **S6 — Raw all rows** | No picker | MRR, admin statistics |

---

## 7. Dashboard Dependency Map (ADA-0.6)

| Dashboard Component | File | Data Source (tRPC) | Authority Source | Drift risk |
|--------------------|------|-------------------|------------------|------------|
| **Admin KPI overview** | `AdminManagement.tsx` | `admin.getStatistics` + `admin.getExtendedStats` + `admin.listAllRestaurantsWithSubscriptions` | **Mixed:** S6 MRR + S3/S1 restaurant subs + client `computeAdminKPIs` | **High** — `activeRestaurants` vs `activeSubscriptions` use different models |
| **Restaurant cards / status badge** | `AdminManagement.tsx` | `admin.listAllRestaurantsWithSubscriptions` | S3/S1 via `getAllRestaurantsWithSubscriptions` | Medium — shows scoped subs |
| **Restaurant subscription edit modal** | `AdminManagement.tsx` | `admin.updateRestaurantSubscription` / create/delete | Scoped row mutations | Medium |
| **Statistics page — MRR chart** | `Statistics.tsx` | `admin.getStatistics`, `admin.getRevenueByMonth` | S6 raw all `active` subs | Medium — counts duplicate scoped rows |
| **Statistics — subscription table** | `Statistics.tsx` | `admin.getSubscriptionDetails` | S6 + **wrong restaurant** join | **High** |
| **Users list (simple)** | `Users.tsx` | `admin.listAllUsers` | No subscription authority | Low |
| **Users + subscriptions panel** | `AdminManagement.tsx` (users tab) | `admin.listAllUsersWithSubscriptions` | **S5 `find()`** | **High** — wrong sub when user has multiple rows |
| **Super admin dashboard** | `SuperAdminDashboard.tsx` | `admin.listAllUsers`, `admin.getExtendedStats` | Entity counts only | Low |
| **Owner dashboard — feature gates** | `Dashboard.tsx` | `commercial.getEntitlements` | **S1 canonical** | **High** vs scoped subs on same user |
| **Owner dashboard — upgrade banner** | `Dashboard.tsx` | `useCommercialFeatureVisibility` | S1 canonical | **High** on launch DB test user |
| **Owner subscription management** | `SubscriptionManagement.tsx` | `subscription.getCurrentSubscription` | **S4 any-scope** | Medium — may show sub while entitlements NONE |
| **Owner per-restaurant sub** | Legacy/dashboard paths | `subscription.getByRestaurant` | **S2 scoped-only** | **High** vs S1 on same session |
| **Pricing / checkout** | `Pricing.tsx` | `commercial.getEntitlements` + `subscription.createCheckout` | S1 read; S4 for Tap metadata | Medium |
| **Trial status** | `subscription.checkTrialStatus` | `resolveTrialStatusRead` | S1 + **legacy S4/any-row fallback** | **High** — can show active when entitlements NONE |

### 7.1 Observed symptom → root cause mapping

| Reported symptom | Likely authority cause |
|------------------|------------------------|
| Different screens show different subscription states | S1 (NONE) vs S2/S3 (scoped active) vs S4 (canonical scoped) vs S5 (random row) |
| MRR values appear inconsistent | `computeAdminMrr` counts all active rows; KPI `activeRestaurants` counts venue-level status from different join |
| Restaurant deletion affects dashboard projections | `deleteRestaurantCascade` removes scoped subs; MRR/statistics drop row counts; account entitlements unchanged (no account row) |
| Admin protection inconsistent | `PROTECTED_USER_IDS` guards mutations only — not subscription display logic |
| Multiple subscription management flows | `createRestaurantSubscription` vs `createUserSubscriptionByAdmin` vs owner register — different scope defaults |

---

## 8. Commercial Authority Diagram (ADA-0.7)

### 8.1 Intended canonical chain (ASN-5)

```text
                    ┌─────────────────────┐
                    │   users (owner)     │
                    │   role: user|admin  │
                    └──────────┬──────────┘
                               │
              admin bypass     │     account-scoped read
                    ┌──────────┴──────────┐
                    ▼                     ▼
           role === "admin"     user_subscriptions
           (no sub read)         WHERE restaurantId = 0
                    │                     │
                    │                     ▼
                    │           pickUserLevelSubscription
                    │                     │
                    └──────────┬──────────┘
                               ▼
                    buildCommercialContextFromDb
                               │
                               ▼
                    resolveCommercialEntitlements
                     (planFeatureMatrix)
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
          features.*      limits.*      features.ordering
               │               │               │
               ▼               ▼               ▼
      Owner UI visibility  Quota asserts   resolveGuestOrderingAllowed
      (useCommercial...)   (partial)       (order.canOrder / create)
```

### 8.2 Actual coexistence (simplified)

```text
user_subscriptions (ALL rows — launch DB: 4 scoped, 0 account)
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
 pickUserLevelSubscription (S1)          pickCanonicalSubscription (S4)
 restaurantId === 0 ONLY                  ANY scope — best row
        │                                          │
        ▼                                          ▼
 getCommercialEntitlements               getCurrentSubscription
 plan: NONE (launch users)              may show scoped active row
        │                                          │
        ▼                                          ▼
 Owner entitlements UI                   SubscriptionManagement page
        │
        │         ┌────────────────────────────────┘
        │         │
        ▼         ▼
 resolveGuestOrderingAllowed          resolveTrialStatusRead
 ordering: false                       fallback → isSubscriptionActive (any row)
                                                  may show active: true

 Parallel branch (admin / legacy):

 user_subscriptions
        │
        ├─ filter restaurantId = venue ──► getSubscriptionForRestaurant (S2)
        │                                      subscription.getByRestaurant
        │
        ├─ resolveOrderingSubscriptionRow (S3) ──► resolvePlanLimitsForUser
        │
        ├─ scoped || account fallback ──► getAllRestaurantsWithSubscriptions
        │                                      AdminManagement restaurant cards
        │
        ├─ Array.find first ──► getAllUsersWithSubscriptions (S5)
        │
        └─ COUNT all rows ──► getAdminStatistics / computeAdminMrr (S6)
                               Statistics.tsx MRR + subscriber counts
```

---

## 9. Canonical Source of Truth Determination (Deliverable 8)

### 9.1 Success criteria answers

| # | Question | Answer |
|---|----------|--------|
| **1** | Single commercial source of truth? | **Defined:** `getCommercialEntitlements` → account-scoped `user_subscriptions` (`restaurantId = 0`) → `resolveCommercialEntitlements`. **Not universally enforced** across admin/owner/metrics paths. |
| **2** | Services defining subscription state? | **Canonical:** `pickUserLevelSubscription`, `buildCommercialContextFromDb`. **Legacy active:** `getSubscriptionForRestaurant`, `getCanonicalUserSubscription`, `getAllUsersWithSubscriptions`, raw `getAdminStatistics`. |
| **3** | Services defining plan entitlements? | **`resolveCommercialEntitlements`** (`src/lib/commercial/resolveCommercialEntitlements.ts`) fed by CommercialContext. Plan catalog: `subscription_plans` + `planFeatureMatrix`. |
| **4** | Services defining restaurant limits? | **`resolvePlanLimitsForUser`** (`server/subscriptionPlanLimits.ts`) — uses **scoped-first** `resolveOrderingSubscriptionRow` when `restaurantId` provided; falls back to basic plan limits. **Not fully aligned** with canonical entitlements limits. |
| **5** | Services defining ordering permissions? | **Canonical:** `resolveGuestOrderingAllowed` → `getCommercialEntitlements.features.ordering`. **Legacy (deprecated):** `restaurantAllowsTableOrdering`. |
| **6** | Dashboard components consuming authority? | See §7 — `AdminManagement`, `Statistics`, `Users`, `Dashboard`, `SubscriptionManagement`, `Pricing`. |
| **7** | Multiple authority systems coexist? | **Yes** — six selection strategies (S1–S6) in parallel. |
| **8** | Dashboard authority drift real? | **Yes** — drift is a **symptom** of unresolved multi-authority architecture plus **launch DB scoped-only data** incompatible with ASN canonical reads. |

### 9.2 Single source of truth (normative)

For ADA follow-on phases, treat this as the **normative** authority stack:

| Concern | Authoritative procedure | Authoritative table(s) |
|---------|-------------------------|------------------------|
| Subscription state (account) | `pickUserLevelSubscription` | `user_subscriptions` (`restaurantId = 0`) |
| Plan + entitlements | `getCommercialEntitlements` | `user_subscriptions` + `subscription_plans` (via resolver) |
| Ordering permission | `resolveGuestOrderingAllowed` | Derived from entitlements (not scoped sub row) |
| Admin operator identity | `users.role === 'admin'` | `users` (bypass in CommercialContext) |

All other paths in §6 should be treated as **legacy**, **derived**, or **defect** until aligned or removed.

### 9.3 Recommended ADA follow-on (documentation only — not executed)

| Priority | Investigation |
|----------|---------------|
| P1 | Map each admin screen field to S1–S6 strategy (ADA-1 screen audit) |
| P2 | Document expected post-ASN-4C backfill behavior for launch DB |
| P3 | Trace restaurant delete → KPI delta with scoped subs |
| P4 | Audit `getAllUsersWithSubscriptions` / `getSubscriptionDetails` defects |

---

## 10. Related documents

| Document | Relationship |
|----------|--------------|
| `ASN-FINAL-EXECUTIVE-REPORT.md` | ASN canonical model definition |
| `ASN-5-AUTHORITY-NORMALIZATION-EXECUTION.md` | Code changes (R1, guest ordering) |
| `DATA-INTEGRITY-1-AUDIT.md` Phase E / E1 | Launch DB scoped-only data |
| `SUBSCRIPTION-SCOPE-AUDIT.md` | `restaurantId` scope semantics |
| `COMMERCIAL-AUTHORITY-SPEC.md` | PG-1C target spec |

---

*End of ADA-0. Read-only commercial authority discovery. No remediation.*
