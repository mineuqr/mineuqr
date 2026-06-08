# EXEC-2 — Authority Parity Validation

**Program:** Admin Dashboard Remediation — Execution  
**Phase:** EXEC-2 — Authority parity validation  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** Validation and evidence only. No production behavior changes, no consumer migration, no backfill, no legacy retirement.

**Prerequisite:** EXEC-1 `CommercialReadService` foundation.

---

## 1. Executive Summary

EXEC-2 proves **CommercialReadService is not globally equivalent** to all existing commercial authority consumers — and documents **exactly where** parity holds vs fails.

| Outcome | Result |
|---------|--------|
| Success criterion | **B** — All mismatches identified, documented, and understood |
| S1-aligned consumers | **MATCH** with `CommercialReadService` |
| Legacy consumers (S2–S6) | **DOCUMENTED MISMATCH** — expected per ADA-0/ADA-1 |
| Automated parity tests | **10/10 passed** (`CommercialReadService.parity.test.ts`) |
| Production / DB changes | **None** |

**Conclusion:** `CommercialReadService` correctly implements the **approved S1 canonical chain**. Divergence from legacy consumers is **known architectural debt**, not a defect in EXEC-1. EXEC-3 may proceed with explicit migration targets.

**Launch DB implication:** With 0 account-scoped rows and 4 scoped rows, **most runtime consumers show entitled state while CommercialReadService returns `plan: NONE`** for user `14760004` — the primary pre-backfill mismatch.

---

## 2. Validation Methodology

### 2.1 Approach

| Step | Action |
|------|--------|
| 1 | Repository audit — enumerate all commercial authority consumers (server + client) |
| 2 | Classify each consumer by strategy (S1–S6) per ADA-0 |
| 3 | Define comparable fields: plan, status, entitlements, limits, ordering, trial, MRR |
| 4 | Automated parity tests — mocked DB, read-only, no writes |
| 5 | Document MATCH / MISMATCH with root cause and severity |
| 6 | No fixes applied |

### 2.2 Comparison baseline

**Reference authority:** `commercialReadService.getAuthorityForOwner(ownerId)`

**Equivalent core:** `getCommercialEntitlements(ownerId)` — EXEC-1 mapper adds DTO metadata only.

### 2.3 Test harness

| File | Purpose |
|------|---------|
| `server/commercial/CommercialReadService.parity.test.ts` | EXEC-2 automated parity suite |
| `server/commercial/wave1ReadAuthority.parity.test.ts` | Pre-existing ASN-5 integration (referenced) |
| `server/commercial/getCommercialEntitlements.test.ts` | S1 chain regression |

```bash
npx vitest run server/commercial/CommercialReadService.parity.test.ts
```

---

## 3. Authority Consumers Inventory

### 3.1 Server — S1-aligned (canonical)

| # | Consumer | Location | Authority source | Strategy |
|---|----------|----------|------------------|----------|
| S1-01 | `getCommercialEntitlements` | `server/commercial/getCommercialEntitlements.ts` | `pickUserLevelSubscription` → resolver | **S1** |
| S1-02 | `CommercialReadService` | `server/commercial/CommercialReadService.ts` | Same as S1-01 | **S1** |
| S1-03 | `commercial.getEntitlements` | `server/commercial/router.ts` | `getCommercialEntitlements` | **S1** |
| S1-04 | `resolveGuestOrderingAllowed` | `server/commercial/guestOrderingAuthority.ts` | `getCommercialEntitlements` → `features.ordering` | **S1** |
| S1-05 | `buildCommercialContextFromDb` | `server/commercial/buildCommercialContextFromDb.ts` | Account-scoped pick | **S1** |

### 3.2 Server — hybrid / transitional

| # | Consumer | Location | Authority source | Strategy |
|---|----------|----------|------------------|----------|
| H-01 | `resolveTrialStatusRead` | `server/commercial/wave1ReadAuthority.ts` | S1 primary; `isSubscriptionActive` fallback when `plan === NONE` | **S1 + legacy** |
| H-02 | `getCanonicalUserSubscription` | `server/db.ts` | `pickCanonicalSubscription(all rows)` | **S4** |
| H-03 | `subscription.getCurrentSubscription` | `server/routers.ts` L636 | `getCanonicalUserSubscription` | **S4** |
| H-04 | `admin.generateInvoicePDF` | `server/routers.ts` L1205 | `getCanonicalUserSubscription` | **S4** |
| H-05 | `admin.createUserSubscriptionByAdmin` conflict | `server/routers.ts` L1036 | `getCanonicalUserSubscription` | **S4** |

### 3.3 Server — legacy scoped / aggregation

| # | Consumer | Location | Authority source | Strategy |
|---|----------|----------|------------------|----------|
| L-01 | `getSubscriptionForRestaurant` | `server/db.ts` | Scoped row only | **S2** |
| L-02 | `subscription.getByRestaurant` | `server/routers.ts` L643 | `getSubscriptionForRestaurant` | **S2** |
| L-03 | `resolveOrderingSubscriptionRow` | `server/subscriptionResolver.ts` | Scoped-first | **S3** |
| L-04 | `resolvePlanLimitsForUser(userId, restaurantId)` | `server/subscriptionPlanLimits.ts` | S3 when `restaurantId` set | **S3** |
| L-05 | `resolvePlanLimitsForUser(userId)` | `server/subscriptionPlanLimits.ts` | `pickCanonicalSubscription(all)` | **S4** |
| L-06 | `assertRestaurantCreateAllowed` | `server/subscriptionPlanLimits.ts` | `resolvePlanLimitsForUser(userId)` | **S4** |
| L-07 | `getAllRestaurantsWithSubscriptions` | `server/db.ts` L761 | Scoped-first, account fallback | **S3** |
| L-08 | `admin.listAllRestaurantsWithSubscriptions` | `server/routers.ts` | L-07 | **S3** |
| L-09 | `isSubscriptionActive` | `server/db.ts` | Any entitled row (any scope) | **Legacy any-row** |
| L-10 | `getTrialEndDate` | `server/db.ts` | Any-scope trial row | **Legacy any-row** |
| L-11 | `restaurant.updateTemplate` premium gate | `server/routers.ts` L241 | `isSubscriptionActive` | **Legacy any-row** |
| L-12 | `restaurant.updateCustomColors` | `server/routers.ts` L268 | `isSubscriptionActive` | **Legacy any-row** |
| L-13 | `restaurant.updateCustomFonts` | `server/routers.ts` L295 | `isSubscriptionActive` | **Legacy any-row** |
| L-14 | `getAllUsersWithSubscriptions` | `server/db.ts` L984 | `allSubs.find(userId)` | **S5** |
| L-15 | `admin.listAllUsersWithSubscriptions` | `server/routers.ts` | L-14 | **S5** |
| L-16 | `getAdminStatistics` | `server/db.ts` L779 | All rows + `computeAdminMrr` | **S6** |
| L-17 | `admin.getStatistics` | `server/routers.ts` L943 | L-16 | **S6** |
| L-18 | `getRevenueByMonth` | `server/db.ts` | Raw row aggregation | **S6** |
| L-19 | `getSubscriptionDetails` | `server/db.ts` | Flat row list | **S6** |
| L-20 | `restaurantAllowsTableOrdering` | `server/db.ts` (deprecated) | S3 ordering | **S3** |

### 3.4 Client — commercial display (Category A)

| # | Consumer | Location | Authority source | Strategy |
|---|----------|----------|------------------|----------|
| C-01 | `useCommercialEntitlements` | `client/src/hooks/useCommercialEntitlements.ts` | `commercial.getEntitlements` | **S1** |
| C-02 | `useCommercialFeatureVisibility` | `client/src/hooks/useCommercialFeatureVisibility.ts` | Wraps C-01 | **S1** |
| C-03 | `Dashboard.tsx` feature gates | `client/src/pages/Dashboard.tsx` | C-02 | **S1** |
| C-04 | `CommercialDiagnostics.tsx` | `client/src/pages/CommercialDiagnostics.tsx` | C-01 | **S1** |
| C-05 | `computeAdminKPIs` | `client/src/lib/admin/computeAdminKPIs.ts` | S3 venue filter + S6 stats | **S3+S6** |
| C-06 | `AdminManagement.tsx` KPI strip | `client/src/pages/AdminManagement.tsx` | `getStatistics` + C-05 | **S6+S3** |
| C-07 | `AdminManagement.tsx` users panel | `client/src/pages/AdminManagement.tsx` | `listAllUsersWithSubscriptions` | **S5** |
| C-08 | `AdminManagement.tsx` restaurant cards | `client/src/pages/AdminManagement.tsx` | `listAllRestaurantsWithSubscriptions` + local scoped helper | **S3** |
| C-09 | `Statistics.tsx` | `client/src/pages/Statistics.tsx` | `getStatistics`, `getSubscriptionDetails`, `getRevenueByMonth` | **S6** |
| C-10 | `SubscriptionManagement.tsx` | `client/src/pages/SubscriptionManagement.tsx` | `getCurrentSubscription` | **S4** |

---

## 4. Parity Matrix

| Consumer | Current source | CommercialReadService | Parity | Severity |
|----------|----------------|----------------------|:------:|:--------:|
| `getCommercialEntitlements` | S1 | S1 (identical entitlements) | **MATCH** | — |
| `commercial.getEntitlements` | S1 | S1 | **MATCH** | — |
| `resolveGuestOrderingAllowed` | S1 `features.ordering` | `authority.features.ordering` | **MATCH** | — |
| `useCommercialEntitlements` / owner dashboard | S1 via tRPC | S1 | **MATCH** | — |
| `resolveTrialStatusRead` (account row) | S1 | S1 | **MATCH** | — |
| `resolveTrialStatusRead` (scoped-only + fallback) | `isSubscriptionActive` any-row | `plan: NONE` | **MISMATCH** | **P1** |
| `getCanonicalUserSubscription` | S4 any-scope | S1 account-only | **MISMATCH** when scoped-only | **P1** |
| `subscription.getCurrentSubscription` | S4 | S1 | **MISMATCH** when scoped-only | **P1** |
| `isSubscriptionActive` | Any entitled row | `commercialStatus.isEntitled` | **MISMATCH** when scoped-only | **P1** |
| Premium template/color/font gates | `isSubscriptionActive` | `isEntitled` / `isPaid` | **MISMATCH** when scoped-only | **P1** |
| `resolvePlanLimitsForUser(+restaurantId)` | S3 scoped-first | `maxRestaurants` from S1 | **MISMATCH** when scoped-only | **P1** |
| `assertRestaurantCreateAllowed` | S4 all rows | S1 limits | **MISMATCH** when picks differ | **P2** |
| `getSubscriptionForRestaurant` / `getByRestaurant` | S2 per venue | Owner-level only | **MISMATCH** (different grain) | **P2** |
| `getAllRestaurantsWithSubscriptions` | S3 | Owner-level per venue | **MISMATCH** | **P2** |
| `getAllUsersWithSubscriptions` | S5 `find()` | Per-owner canonical | **MISMATCH** multi-row owners | **P1** |
| `getAdminStatistics` / `computeAdminMrr` | S6 row sum | Per-owner MRR | **MISMATCH** multi-row | **P1** |
| `computeAdminKPIs` | S3+S6 client merge | `getDashboardSummary` (future) | **MISMATCH** | **P1** |
| `Statistics.tsx` | S6 | Canonical metrics (future) | **MISMATCH** | **P1** |
| `admin` role bypass | `plan: ADMIN` | `plan: ADMIN` | **MATCH** | — |
| Launch user `1` (admin + scoped BASIC) | ADMIN bypass + scoped visible in admin UI | ADMIN in CRS | **PARTIAL** — admin MATCH; admin UI S3/S6 still diverge | **P2** |
| Launch user `14760004` (3 scoped active) | Legacy shows active/PRO/BASIC | CRS `NONE` | **MISMATCH** | **P1** |

---

## 5. Tests Executed

### 5.1 EXEC-2 parity suite

| Test | Category | Result |
|------|----------|--------|
| CRS entitlements === `getCommercialEntitlements` | MATCH | **PASS** |
| `resolveGuestOrderingAllowed` === `features.ordering` | MATCH | **PASS** |
| Account trial `resolveTrialStatusRead` vs CRS | MATCH | **PASS** |
| Admin role ADMIN plan | MATCH | **PASS** |
| Scoped-only `isSubscriptionActive` vs CRS `isEntitled` | MISMATCH | **PASS** (documents gap) |
| Scoped-only `pickCanonicalSubscription` vs CRS `subscriptionId` | MISMATCH | **PASS** |
| Scoped-only trial fallback vs CRS | MISMATCH | **PASS** |
| `resolvePlanLimitsForUser(restaurantId)` vs CRS limits | MISMATCH | **PASS** |
| S5 `find()` pick vs CRS plan | MISMATCH | **PASS** |
| S6 `computeAdminMrr` vs CRS owner MRR | MISMATCH | **PASS** |

**Command:**

```bash
npx vitest run server/commercial/CommercialReadService.parity.test.ts
```

**Result:** 10/10 passed.

### 5.2 Regression

```bash
npx vitest run server/commercial/CommercialReadService.test.ts server/commercial/getCommercialEntitlements.test.ts
```

**Result:** 9/9 passed (no regressions from EXEC-1).

---

## 6. Match Results

| Domain | Consumers aligned with CRS |
|--------|---------------------------|
| Entitlements resolver output | `getCommercialEntitlements`, `commercial.getEntitlements`, CRS mapper |
| Feature flags | `resolveGuestOrderingAllowed` |
| Owner dashboard / diagnostics | `useCommercialEntitlements` chain |
| Admin role governance | `plan: ADMIN` bypass |
| Account-scoped subscription present | Trial read, ordering, limits match when `restaurantId = 0` row exists |

**Internal consistency:** CRS `entitlements` object is **byte-identical** to `getCommercialEntitlements().entitlements` in all tested scenarios.

---

## 7. Mismatch Results

### 7.1 Mismatch M-01 — Scoped-only owners (launch DB primary)

| Field | Legacy (`isSubscriptionActive`, S4, S3) | CommercialReadService |
|-------|----------------------------------------|----------------------|
| Plan | PROFESSIONAL / BASIC from scoped row | `NONE` |
| Entitled | `true` | `false` |
| Ordering (S1 path) | Denied | Denied |
| Ordering (legacy fallback paths) | May allow via scoped | N/A |

**Root cause:** No `restaurantId = 0` rows on launch DB (DATA-INTEGRITY-1 Phase E).  
**Severity:** **P1**  
**Remediation:** AR-6 backfill (EXEC-6) — not EXEC-2.

---

### 7.2 Mismatch M-02 — Trial status fallback

| Condition | `resolveTrialStatusRead` | CRS |
|-----------|-------------------------|-----|
| `plan === NONE` + scoped trial | `isActive: true` (fallback) | `isTrial: false`, `plan: NONE` |

**Root cause:** `wave1ReadAuthority.ts` L24–27 legacy fallback.  
**Severity:** **P1**  
**Remediation:** EXEC-5 consumer migration — remove fallback after backfill.

---

### 7.3 Mismatch M-03 — Admin metrics (S6)

| Metric | Legacy | CRS-derived |
|--------|--------|-------------|
| MRR | Sum of 3 active scoped rows (user 14760004) | 0 (no account row) |
| Subscriber count | Row count | Owner count |

**Root cause:** `computeAdminMrr` on all rows (ADA-1 §6).  
**Severity:** **P1**  
**Remediation:** EXEC-3 `CanonicalMetricsService` + EXEC-5 dashboard.

---

### 7.4 Mismatch M-04 — Admin user list (S5)

| Condition | `getAllUsersWithSubscriptions` | CRS |
|-----------|-------------------------------|-----|
| Multi-scoped owner | First array match (e.g. BASIC) | `NONE` until backfill |

**Root cause:** `allSubs.find(s => s.userId === u.id)` unordered.  
**Severity:** **P1**  
**Remediation:** EXEC-3 `admin.getOwnerOverviewList` + EXEC-5.

---

### 7.5 Mismatch M-05 — Per-venue limits (S3)

| Call | Legacy | CRS |
|------|--------|-----|
| `resolvePlanLimitsForUser(userId, restaurantId)` | PRO limits from scoped row | `maxRestaurants: 0` |

**Root cause:** Scoped-first resolver in `subscriptionPlanLimits.ts`.  
**Severity:** **P1** for enforcement; **P2** for display  
**Remediation:** EXEC-5 — limits from CRS entitlements.

---

### 7.6 Mismatch M-06 — Premium feature gates

| Gate | Legacy check | CRS equivalent |
|------|--------------|----------------|
| Template / colors / fonts | `isSubscriptionActive()` | `commercialStatus.isPaid` or `isEntitled` |

**Root cause:** `routers.ts` uses any-row `isSubscriptionActive`.  
**Severity:** **P2** (allows premium features on scoped-only when CRS says NONE)  
**Remediation:** EXEC-5 — wire gates to CRS or S1 entitlements.

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation path |
|------|------------|--------|-----------------|
| EXEC-3 APIs ship before backfill | Medium | Dashboard shows `NONE` for paying-looking scoped owners | EXEC-6 backfill before EXEC-5; dual-read window (AR-3 M3) |
| Premature legacy removal | Low | Ordering/limits break for scoped-only | EXEC-6 before EXEC-7 |
| CRS perceived as broken | Medium | Stakeholder confusion | This document + launch DB context |
| Admin user 1 dual truth | Low | ADMIN in CRS; scoped BASIC in admin UI | AR-1 disentangle metrics; EXEC-5 |

**CRS implementation risk:** **Low** — parity with S1 proven.  
**Migration risk:** **Documented and expected** — not unknown.

---

## 9. Readiness For EXEC-3

| Prerequisite | Status |
|--------------|--------|
| CRS exists and tested | **Ready** |
| Parity matrix complete | **Ready** |
| Mismatches documented with root cause | **Ready** |
| No unknown authority differences | **Ready** |
| S1 internal consistency proven | **Ready** |

**EXEC-3 recommendation:** **Proceed.**

EXEC-3 should:

1. Expose CRS via Category A/B tRPC procedures (AR-4).
2. **Not** claim parity with legacy admin metrics until EXEC-5.
3. Optionally expose `legacyCompare` fields during AR-3 M3 dual-read (deprecated one release).

**Blockers for EXEC-5 (consumer migration):** AR-6 backfill for launch DB commercial truth alignment.

**Not blockers for EXEC-3:** Documented mismatches are expected pre-backfill.

---

## 10. Files Created / Modified (EXEC-2)

| File | Action |
|------|--------|
| `server/commercial/CommercialReadService.parity.test.ts` | **Created** |
| `docs/commercial-audit/EXEC-2-AUTHORITY-PARITY-VALIDATION.md` | **Created** |

**Modified:** None (validation only).

---

## 11. Deferred Work

| Item | Phase |
|------|-------|
| Wire CRS to tRPC | EXEC-3 |
| Dashboard API layer | EXEC-3 |
| Account subscription backfill | EXEC-6 / AR-6 |
| Consumer migration | EXEC-5 |
| Legacy retirement | EXEC-7 |
| Live DB readonly dry-run on `mineuqr` | Optional pre-EXEC-6 (operator shell) |

---

*End of EXEC-2 authority parity validation.*
