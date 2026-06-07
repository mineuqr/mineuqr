# PLAN-ID-MAPPING.md

**PG-1C.2D — Plan Identifier Mapping Contract**  
**Status:** APPROVED ALIGNMENT CONTRACT  
**Priority:** P0  
**Date:** 2026-06-07  

**Upstream specifications:**

- [COMMERCIAL-AUTHORITY-SPEC.md](../../COMMERCIAL-AUTHORITY-SPEC.md) (PG-1C.1A)
- [PLAN-FEATURE-MATRIX.md](./PLAN-FEATURE-MATRIX.md) (PG-1C.1B)
- [COMMERCIAL-DATA-SNAPSHOT.md](../commercial-audit/COMMERCIAL-DATA-SNAPSHOT.md) (PG-1B.2 baseline)
- [PG-1C.2C-AUTHORITY-VERIFICATION.md](../commercial-audit/PG-1C.2C-AUTHORITY-VERIFICATION.md)

**Purpose:** Official mapping between database plan identifiers, subscription records, and catalog plan keys consumed by `resolveCommercialEntitlements()`. Eliminates ad-hoc `planId` checks in favor of named catalog plans.

**Authority rule:** Runtime code MUST NOT branch on numeric `planId` for feature or limit decisions after migration waves complete. Until then, this document is the **only** approved translation table from `planId` → `catalogPlan`.

---

## 1. Catalog Plan Keys

| `catalogPlan` | Type | Resolver `CommercialPlan` when active |
|---|---|---|
| `BASIC` | Paid catalog plan | `BASIC` |
| `PROFESSIONAL` | Paid catalog plan | `PROFESSIONAL` |
| `ENTERPRISE` | Paid catalog plan | `ENTERPRISE` |

**Account states (not catalog plans):** `TRIAL`, `ADMIN`, and `NONE` are resolved from subscription `status`, user `role`, and period validity — not from `planId` alone.

---

## 2. Database Plan Inventory (Current Source)

Live baseline from `subscription_plans` (PG-1B.2 / PG-1C.2C snapshot):

| `planId` | `nameEn` | `sortOrder` | `maxRestaurants` | `maxItemsPerRestaurant` | `maxCategories` | Monthly USD | Yearly USD |
|---:|---|---:|---:|---:|---:|---:|---:|
| **30001** | Basic Plan | 1 | 1 | 100 | 10 | 19.00 | 175.00 |
| **30002** | Professional Plan | 2 | 5 | 500 | 25 | 39.00 | 349.00 |
| **30003** | Enterprise Plan | 3 | 999 | 9999 | 100 | 99.00 | 899.00 |

**Seed reference:** `server/seed-plans.mjs` inserts the same three tiers with identical limit ratios but different prices ($19/$35/$59). Runtime catalog reads from the database; seed values are not authoritative for live pricing.

---

## 3. Official Mapping Table

| `planId` | Current source | Intended `catalogPlan` | Used when `status` | Resolved `CommercialPlan` |
|---:|---|---|---|---|
| **30001** | `subscription_plans` row; `BASIC_FREE_PLAN_ID` in `server/subscriptionEntitlement.ts`; `ORDERING_FREE_PLAN_ID` in `server/create-trial-subscription.ts` | `BASIC` | `active` | `BASIC` |
| **30002** | `subscription_plans` row; `TRIAL_PLAN_SORT_ORDER = 2` target in `server/create-trial-subscription.ts` | `PROFESSIONAL` | `active` | `PROFESSIONAL` |
| **30002** | Same row — trial rows store Professional `planId` | `PROFESSIONAL` *(underlying)* | `trial` | **`TRIAL`** *(account state overrides catalog)* |
| **30003** | `subscription_plans` row | `ENTERPRISE` | `active` | `ENTERPRISE` |

### 3.1 Mapping function (normative contract)

```
mapPlanIdToCatalogPlan(planId):
  30001 → BASIC
  30002 → PROFESSIONAL
  30003 → ENTERPRISE
  unknown → ERROR (log + treat as NONE for authority)
```

**Trial rule:** When `user_subscriptions.status === "trial"`, the resolver MUST output `plan: TRIAL` regardless of `planId`. The `catalogPlan` on the subscription snapshot remains `PROFESSIONAL` (underlying entitlement tier) for audit only; it does not drive feature output during trial.

**Admin rule:** When `users.role === "admin"`, mapping is ignored; resolver outputs `plan: ADMIN`.

**NONE rule:** When no entitled subscription exists, `catalogPlan` is absent; resolver outputs `plan: NONE`.

---

## 4. Subscription Record Mapping

### 4.1 `user_subscriptions` row → resolver input

| DB field | CommercialContext field | Notes |
|---|---|---|
| `userId` | `ownerId` | Owner account scope |
| `planId` | → `catalogPlan` via §3.1 | Never pass raw `planId` to resolver |
| `status` | `subscriptionStatus` | `trial` \| `active` \| `canceled` \| `expired` |
| `trialEndsAt` | `trialEndsAt` | Required for period validation when `status = trial` |
| `currentPeriodEnd` | `currentPeriodEnd` | Required for period validation when `status = active` |
| `restaurantId` | *(not passed to resolver)* | Scope selection happens **before** context build; see §5 |

### 4.2 Canonical row selection (pre-mapping)

Before `planId` mapping, the adapter MUST pick one owner-level subscription row:

| Priority | Rule |
|---|---|
| 1 | Among rows for `ownerId`, prefer entitled `trial` or `active` with valid period |
| 2 | Use `pickCanonicalSubscription` / `pickUserLevelSubscription` for account-level authority |
| 3 | Restaurant-scoped rows (`restaurantId > 0`) MUST NOT drive owner commercial authority after Wave 3 |

**Current divergence (documented, not fixed in PG-1C.2D):** `resolveOrderingSubscriptionRow` may pick a restaurant-scoped row for ordering. The CommercialContext contract uses **owner-level canonical** row only.

---

## 5. Constant Cross-Reference (Legacy → Canonical)

| Legacy constant | Location | Value | Canonical replacement |
|---|---|---:|---|
| `BASIC_FREE_PLAN_ID` | `server/subscriptionEntitlement.ts` | 30001 | `catalogPlan === "BASIC"` → `features.ordering === false` |
| `ORDERING_FREE_PLAN_ID` | `server/create-trial-subscription.ts` | 30001 | Exclude `BASIC` from trial plan resolution by `sortOrder`, not by special ID |
| `TRIAL_PLAN_SORT_ORDER` | `server/create-trial-subscription.ts` | 2 | Maps to `catalogPlan: PROFESSIONAL` / `planId: 30002` |
| `getFallbackBasicLimits` heuristic | `server/subscriptionPlanLimits.ts` | `maxRestaurants === 1` | `plan: NONE` → `limits: 0/0/0` per alignment decision AD-1 |

---

## 6. Limit Values: DB vs Authority

| `catalogPlan` | DB `subscription_plans` limits | Authority `limits.*` (PLAN-FEATURE-MATRIX) | Alignment decision |
|---|---|---|---|
| BASIC | 1 / 100 / 10 | 1 / 10 / 100 | **Authority wins** — DB aligned except column naming (`maxItemsPerRestaurant` = `items`) |
| PROFESSIONAL | 5 / 500 / 25 | 5 / 25 / 500 | **Authority wins** — same values, order differs in code |
| ENTERPRISE | 999 / 9999 / 100 | `null` / `null` / `null` | **Authority wins** — DB numbers are marketing/display legacy only (AD-2) |
| NONE | Fallback 1 / 10 / 100 (runtime) | 0 / 0 / 0 | **Authority wins** (AD-1) |

**Enforcement rule after migration:**

```
if (limit === null) → allow
if (count >= limit) → deny
```

DB numeric caps for Enterprise MUST NOT be read for authority decisions post–Wave 3.

---

## 7. Migration Notes

### 7.1 Phase 0 (PG-1C.2D — this document)

- [x] Document all plan IDs and sources
- [x] Define `planId` → `catalogPlan` mapping
- [x] Clarify trial/admin/none overrides
- [ ] No code changes

### 7.2 Phase 1 (Wave 1 — read-only adapter)

- Implement `mapPlanIdToCatalogPlan()` in `src/lib/commercial/` (single module)
- Build `CommercialContext` from canonical owner subscription (see PG-1C.2D §3)
- Expose read-only `subscription.getEntitlements` returning resolver output
- DB `planId` remains on subscription rows; no schema change

### 7.3 Phase 2 (Wave 2–3 — enforcement)

- Replace `plan.id === 30001` with `features.ordering`
- Replace `isSubscriptionActive` with per-feature flags
- Deprecate `BASIC_FREE_PLAN_ID` and `ORDERING_FREE_PLAN_ID` constants
- `resolveTrialPlanId()` continues writing `planId: 30002` — no trial catalog plan row needed

### 7.4 Phase 3 (Wave 4 — billing)

- MRR/revenue uses `commercial.countsInMrr` at owner granularity
- Invoice eligibility uses `commercial.invoiceEligible`
- Plan prices remain on `subscription_plans`; only participation flags change source

### 7.5 Unknown or future plan IDs

A new `planId` MUST NOT be introduced without:

1. Row in this mapping table
2. Rows in PLAN-FEATURE-MATRIX §1–§4
3. PG-1C governance review

Until mapped, unknown `planId` → log error → authority treats as `NONE`.

---

## 8. Validation Checklist

| Check | Expected |
|---|---|
| 30001 maps to BASIC | Y |
| 30002 maps to PROFESSIONAL | Y |
| 30003 maps to ENTERPRISE | Y |
| Trial on 30002 resolves to TRIAL plan | Y |
| Active on 30001 resolves to BASIC plan | Y |
| Admin ignores planId | Y |
| No entitled sub → NONE | Y |
| Enterprise authority limits are `null` | Y |

---

## Document control

| Field | Value |
|---|---|
| Version | 1.0 |
| Supersedes | Ad-hoc `planId` / `sortOrder` heuristics in PG-1A audit series |
| Next phase | PG-1C.2E — CommercialContext adapter implementation (Wave 1 prerequisite) |

---

*Specification only. No implementation. No schema changes.*
