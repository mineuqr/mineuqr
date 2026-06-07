# ASN-4C — Legacy Subscription Backfill Planning

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-4C — Legacy subscription backfill planning  
**Date:** 2026-06-07  
**Status:** Complete — planning only, no runtime changes  

**Mode:** Repository audit and migration planning only. No code, schema, migration scripts, database updates, or runtime changes.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `ASN-2-AUTHORITY-SOURCE-INVENTORY.md`
- `ASN-2.5-AUTHORITY-CANONICALIZATION-DECISION.md`
- `ASN-3-NORMALIZATION-DESIGN.md`
- `ASN-4A-REGISTER-PATH-CANONICAL-STRATEGY.md`
- `ASN-4B.1-REGISTER-MIGRATION-PLAN.md`
- `ASN-4B.2-WAVE-A-ORDERING-ALIGNMENT-PLAN.md`
- `SUBSCRIPTION-SCOPE-AUDIT.md` (PG-1A.4)
- `COMMERCIAL-AUTHORITY-SPEC.md`

**Governing decisions:** D-01, D-02, D-05, D-07, D-09, D-4A-01 | **Register strategy:** R1 hard cutover (ASN-4B.1) | **Backfill scope:** ASN-4C

**Approved canonical model:**

```text
Owner Account → Subscription → Plan → Commercial Entitlements → Restaurant Features
```

**Approved R1 strategy:** New registrations create account-scoped subscriptions (`restaurantId = 0`). Legacy restaurant-scoped subscriptions remain temporarily and require backfill (this document).

---

## 1. Executive summary

Existing production data may contain `user_subscriptions` rows where `restaurantId > 0`. These rows were created by self-service registration, admin onboarding, and scoped admin subscription APIs. They are **immutable in scope after insert** — no runtime path updates `restaurantId` post-creation (`SUBSCRIPTION-SCOPE-AUDIT.md` §1B).

The canonical commercial chain (`buildCommercialContextFromDb` → `pickUserLevelSubscription`) **ignores** scoped rows. Legacy paths (`resolveOrderingSubscriptionRow`, `getSubscriptionForRestaurant`, `restaurantAllowsTableOrdering`) **prefer** scoped rows. This split is the root of F-3 ordering drift and register-path `plan: NONE` behavior.

| Item | Decision |
|------|----------|
| **Target state** | One account-scoped canonical subscription per owner (`restaurantId = 0`) governing entitlements |
| **Recommended strategy** | **R3-C — Hybrid migration** (cohort-based: in-place for simple cases, create-and-retire for complex) |
| **Legacy row disposition** | Migrate entitled state to account row; retire scoped duplicates — **do not hard-delete** rows with invoices or payment provider IDs without billing sign-off |
| **Execution owner** | ASN-5 (after ASN-4C approval) |
| **Prerequisite to Wave E** | Backfill complete + verification before removing F-W1-03 and ordering legacy stack |

---

## 2. Deliverable A — Legacy Subscription Inventory

### 2.1 Schema: `userSubscriptions`

**Table:** `user_subscriptions` (`drizzle/schema.ts` L116–131)

| Column | Role in backfill |
|--------|------------------|
| `id` | Primary key; referenced by `invoices.subscriptionId`, `renewal_notifications.subscriptionId` |
| `userId` | Owner account — canonical subscription owner |
| `restaurantId` | **Scope tag** — `0` = account-level; `> 0` = restaurant-scoped (not a DB FK) |
| `planId` | Plan source for entitlements |
| `status` | `trial` \| `active` \| `canceled` \| `expired` |
| `billingCycle` | Preserved on migration |
| `stripeSubscriptionId`, `stripeCustomerId` | Billing linkage — **protected** (D-09) |
| `currentPeriodStart`, `currentPeriodEnd`, `trialEndsAt`, `canceledAt` | Entitlement periods — must migrate accurately |
| `createdAt`, `updatedAt` | Audit |

**Immutability finding:** `restaurantId` is set only at INSERT. `updateSubscriptionById` callers never include `restaurantId` in update payloads.

---

### 2.2 Subscription creation paths (INSERT)

| ID | Path | File / route | `restaurantId` assigned | Legacy? |
|----|------|--------------|-------------------------|---------|
| C-01 | Self-service register | `server/auth-local/registerOwner.ts` L149–153 → `buildTrialSubscriptionForUser(userId, restaurantId)` | **Specific** new restaurant id | **Yes** — primary legacy cohort |
| C-02 | Standalone trial helper | `server/create-trial-subscription.ts` L65–75 `createTrialSubscription(userId)` | Default **`0`** | No |
| C-03 | Trial builder default | `buildTrialSubscriptionPayload` / `buildTrialSubscriptionForUser` | Parameter, default `0` | Depends on caller |
| C-04 | Generic insert | `server/db.ts` L463–467 `createUserSubscription` | From caller | Depends on caller |
| C-05 | Admin restaurant subscription | `server/routers.ts` L858–886 `admin.createRestaurantSubscription` | **`input.restaurantId`** | **Yes** |
| C-06 | Admin user subscription | `server/routers.ts` L1028–1064 `admin.createUserSubscriptionByAdmin` | `resolveSubscriptionRestaurantIdForUser` → `0` if no restaurants, else specific id | **Yes** when `> 0` |
| C-07 | Admin insert helper | `server/adminSubscriptionHelpers.ts` `buildAdminSubscriptionInsert` | `params.restaurantId` | Depends on caller |
| C-08 | Restaurant create | `server/routers.ts` `restaurant.create` | **No subscription inserted** | N/A |

**Post-R1 (ASN-4B.1):** C-01 will emit `restaurantId = 0` for new registrations. C-05, C-06 (with restaurant picker) remain legacy creators until admin path normalization (ASN-5+).

---

### 2.3 Subscription read paths

| ID | Function / route | Scope behavior | Treats `restaurantId != 0` as authority? |
|----|------------------|----------------|------------------------------------------|
| R-01 | `getSubscriptionsByUser(userId)` | All rows for user | Neutral — returns all scopes |
| R-02 | `getSubscriptionForRestaurant(restaurantId)` | `WHERE restaurantId = ?` strict | **Yes** — scoped-only, no account fallback |
| R-03 | `getCanonicalUserSubscription(userId)` | `pickCanonicalSubscription(all rows)` | **Partial** — any scope; used for account APIs |
| R-04 | `getSubscriptionById(id)` | By primary key | Neutral |
| R-05 | `pickUserLevelSubscription(rows)` | `restaurantId === 0` filter | **No** — explicitly excludes scoped |
| R-06 | `resolveOrderingSubscriptionRow(restaurantId, rows)` | Scoped first, then account fallback | **Yes** — scoped preferred |
| R-07 | `getOrderingSubscriptionForRestaurant(restaurantId)` | Delegates to R-06 | **Yes** |
| R-08 | `restaurantAllowsTableOrdering(restaurantId)` | R-07 → `resolveTableOrderingEntitlement` | **Yes** — legacy ordering gate |
| R-09 | `buildCommercialContextFromDb(ownerId)` | R-05 only | **No** — scoped ignored |
| R-10 | `getCommercialEntitlements(ownerId)` | Via R-09 | **No** |
| R-11 | `resolvePlanLimitsForUser(userId, restaurantId?)` | Account-wide OR R-06 when arg passed | **Yes** when `restaurantId` arg set |
| R-12 | `isSubscriptionActive(userId)` | Any entitled row, scope ignored | **No** — scope-agnostic |
| R-13 | `getTrialEndDate(userId)` | Canonical among trial rows (any scope) | **Partial** |
| R-14 | `getAllRestaurantsWithSubscriptions()` | Per restaurant: scoped OR account fallback | **Yes** — hybrid display |
| R-15 | `getAllUsersWithSubscriptions()` | First row per user (`find`, unordered) | **Unsafe** — may surface scoped row |
| R-16 | `subscription.getCurrentSubscription` | `getCanonicalUserSubscription` | **Partial** — any scope canonical pick |
| R-17 | `subscription.getByRestaurant` | R-02 strict | **Yes** |
| R-18 | `subscription.checkTrialStatus` | `resolveTrialStatusRead` — account + legacy fallback | **Yes** when `plan === NONE` |
| R-19 | `order.canOrder` | `resolveCanOrderRead` — Mixed | **Yes** — F-W1-03/04 |
| R-20 | `order.create` (entitlement) | `restaurantAllowsTableOrdering` | **Yes** |
| R-21 | Admin statistics / MRR | Sums all `active` rows | **Yes** — each scoped row counted |
| R-22 | `resolveSubscriptionForActivationFromRows` | Optional `restaurantId` filter | **Yes** when option set |
| R-23 | `cascadeDeletes.subscriptionIdsForRestaurant` | `WHERE restaurantId = ?` | **Yes** — scoped rows deleted with restaurant |

---

### 2.4 Subscription update paths

| ID | Path | Updates `restaurantId`? | Notes |
|----|------|-------------------------|-------|
| U-01 | `updateSubscriptionById(id, data)` | **Never** in practice | Partial update |
| U-02 | `updateSubscriptionForActivation(userId, data, options)` | **Never** | Payment/webhook target selection |
| U-03 | `admin.updateRestaurantSubscription` | **Never** | By `subscriptionId` |
| U-04 | `admin.updateUserSubscriptionByAdmin` | **Never** | Canonical activation pick |
| U-05 | PayPal webhook | **Never** | `server/paypal-webhook.ts` |
| U-06 | Tap webhook | **Never** | `server/tap-webhook.ts` |
| U-07 | `cancelSubscriptionById` | **Never** | Status + `canceledAt` |

**Backfill implication:** Migrating scope requires either a new INSERT (R3-B) or an exceptional one-time `restaurantId` UPDATE (R3-A) — neither exists in application code today.

---

### 2.5 Complete inventory: `restaurantId != 0` treated as authority

| Layer | Symbol / route | Authority role |
|-------|----------------|----------------|
| **Resolver** | `resolveOrderingSubscriptionRow` | Scoped row wins over account row for target restaurant |
| **Resolver** | `getSubscriptionForRestaurant` | Strict scoped lookup |
| **DB** | `getOrderingSubscriptionForRestaurant` | Ordering subscription selection |
| **DB** | `restaurantAllowsTableOrdering` | Guest order write entitlement |
| **DB** | `getAllRestaurantsWithSubscriptions` | Admin restaurant card subscription display |
| **Commercial (Mixed)** | `resolveCanOrderRead` | F-W1-03: legacy when `plan === NONE`; F-W1-04: OR with legacy |
| **Commercial (Mixed)** | `resolveTrialStatusRead` | Legacy `isSubscriptionActive` when `plan === NONE` |
| **Limits** | `resolvePlanLimitsForUser(userId, restaurantId)` | Per-venue category/item caps |
| **Limits** | `assertCategoryCreateAllowed`, `assertMenuItemCreateAllowed` | Pass restaurant id |
| **Activation** | `resolveSubscriptionForActivationFromRows` with `restaurantId` option | Webhook/admin scoped targeting |
| **Admin** | `admin.createRestaurantSubscription` | Creates scoped rows |
| **Admin** | `resolveSubscriptionRestaurantIdForUser` | Resolves to specific id |
| **Admin** | `assertRestaurantSubscriptionForUpdate` | Validates `restaurantId > 0` vs owner |
| **Admin UI** | `AdminManagement.tsx` `getSubscriptionForRestaurant` | Local strict scoped display |
| **Client registry** | `clientGateRegistry.ts`, `featureVisibility.ts` | Documents `subscription.getByRestaurant` legacy |
| **Cascade** | `subscriptionIdsForRestaurant` | Scoped rows tied to restaurant lifecycle |
| **Data integrity** | `scripts/data-integrity-audit-phase2-readonly.mjs` R2 | `restaurantId = r.id OR restaurantId = 0` |

**Not scoped-authority (account or scope-agnostic):**

| Symbol | Behavior |
|--------|----------|
| `pickUserLevelSubscription` | Account only |
| `buildCommercialContextFromDb` | Account only |
| `getCommercialEntitlements` / `resolveCommercialEntitlements` | Account only |
| `assertRestaurantCreateAllowed` | Account-wide canonical limits |
| `isSubscriptionActive` | Any entitled row |
| `getCurrentSubscription` | Canonical across all scopes (not account-only) |
| Premium template/color gates in `routers.ts` | `isSubscriptionActive` — scope ignored |

---

## 3. Deliverable B — Legacy Population Discovery

### 3.1 Methodology (planning only — no data execution)

Production row counts are **not available in this audit**. ASN-5 must run readonly SQL against the target environment before execution. Recommended discovery queries (readonly):

```sql
-- L1: All legacy scoped rows
SELECT status, COUNT(*) AS c
FROM user_subscriptions
WHERE restaurantId > 0
GROUP BY status;

-- L2: Owners with scoped rows but no account row
SELECT COUNT(DISTINCT userId) AS owners_scoped_only
FROM user_subscriptions s
WHERE s.restaurantId > 0
  AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions a
    WHERE a.userId = s.userId AND a.restaurantId = 0
  );

-- L3: Owners with BOTH account and scoped rows (mixed)
SELECT COUNT(DISTINCT userId) AS owners_mixed
FROM user_subscriptions
WHERE userId IN (
  SELECT userId FROM user_subscriptions WHERE restaurantId > 0
)
AND userId IN (
  SELECT userId FROM user_subscriptions WHERE restaurantId = 0
);

-- L4: Multi-scoped owners (no account row)
SELECT userId, COUNT(*) AS scoped_count
FROM user_subscriptions
WHERE restaurantId > 0
GROUP BY userId
HAVING COUNT(*) > 1;

-- L5: Orphan scoped rows (restaurant missing or wrong owner)
SELECT s.id, s.userId, s.restaurantId, s.status
FROM user_subscriptions s
LEFT JOIN restaurants r ON r.id = s.restaurantId
WHERE s.restaurantId > 0
  AND (r.id IS NULL OR r.userId != s.userId);

-- L6: Scoped rows with billing linkage
SELECT COUNT(*) FROM user_subscriptions
WHERE restaurantId > 0
  AND (stripeSubscriptionId IS NOT NULL OR stripeCustomerId IS NOT NULL);

-- L7: Scoped rows referenced by invoices
SELECT COUNT(DISTINCT s.id)
FROM user_subscriptions s
JOIN invoices i ON i.subscriptionId = s.id
WHERE s.restaurantId > 0;
```

---

### 3.2 Legacy row categories

| Category | ID | Defining characteristics | Typical creation path | Dependent flows |
|----------|-----|--------------------------|----------------------|-----------------|
| **Trial (register)** | B-01 | `status = trial`, `restaurantId = first restaurant`, entitled period valid | C-01 `registerOwner` | F-W1-03 ordering read; legacy ordering write; owner `plan: NONE` in CommercialContext |
| **Trial (admin)** | B-02 | `status = trial`, `restaurantId > 0`, admin-created | C-05, C-06 | Same as B-01 for that restaurant |
| **Paid active** | B-03 | `status = active`, scoped, valid period | C-05 admin; C-01 + webhook activation U-05/U-06 | Ordering, limits, MRR, invoices |
| **Expired** | B-04 | `status = expired` or period elapsed | Natural lifecycle; admin edit | Historical; may still appear in canonical pick tie-breaks |
| **Cancelled** | B-05 | `status = canceled`, `canceledAt` set | Admin cancel; user cancel flows | Display; not entitled |
| **Orphaned** | B-06 | `restaurantId > 0` but restaurant missing or `restaurants.userId != sub.userId` | Data drift; partial deletes | Admin update validation fails; ordering may false-negative |
| **Test / demo** | B-07 | Admin-created, non-production patterns (heuristic) | C-05, C-06 | Same as paid/trial scoped |
| **Admin onboarding** | B-08 | Restaurant + subscription created together in Admin UI | `AdminManagement.tsx` → C-05 | Strict scoped display on restaurant tab |
| **Multi-restaurant per-venue** | B-09 | Multiple scoped rows, one per restaurant, same `userId` | Repeated C-05 / multi-register (unusual) | `resolveOrderingSubscriptionRow` per venue; inflated MRR |
| **Mixed account + scoped** | B-10 | Both `restaurantId = 0` and `> 0` rows for same user | Admin added account row without retiring scoped | Ordering prefers scoped; CommercialContext uses account — **F-3 class** |
| **Scoped-only single restaurant** | B-11 | Exactly one scoped row, one restaurant, no account row | C-01 (majority pre-R1 cohort) | Primary ASN-4C backfill target |

---

### 3.3 How legacy rows were created (summary)

```text
┌─────────────────────────────────────────────────────────────────┐
│ LEGACY CREATION SOURCES (restaurantId > 0)                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Self-service register (C-01)          ← highest volume est.  │
│ 2. Admin createRestaurantSubscription (C-05)                    │
│ 3. Admin createUserSubscriptionByAdmin (C-06) with restaurant   │
│ 4. Payment activation on existing scoped row (U-02, no re-scope)│
└─────────────────────────────────────────────────────────────────┘

NON-LEGACY (restaurantId = 0):
  • createTrialSubscription(userId) without options (C-02)
  • Admin createUserSubscriptionByAdmin when user has zero restaurants (C-06)
  • Post-R1 register cutover (ASN-4B.1)
```

---

### 3.4 Flow dependency map

| Flow | Depends on scoped row? | Breaks if scoped removed without account replacement? |
|------|------------------------|------------------------------------------------------|
| Guest `order.create` entitlement | **Yes** (today) | **Yes** — 403 until Wave A + backfill |
| Guest `order.canOrder` when `plan === NONE` | **Yes** (F-W1-03) | **Yes** |
| Owner CommercialContext / dashboard entitlements | **No** (ignores scoped) | No — already NONE/incorrect for scoped-only |
| `subscription.getByRestaurant` | **Yes** | **Yes** — returns null (display only) |
| Category/item limits per restaurant | **Yes** when scoped exists | Plan limits may change to account-level |
| MRR / admin KPIs | Counts scoped rows | MRR may decrease after deduplication |
| Invoices | By `subscriptionId` FK | **Yes** if row deleted — must re-link or preserve |
| PayPal/Tap activation | Targets existing row id | **Yes** if wrong row retired |
| Restaurant cascade delete | Deletes scoped rows by `restaurantId` | N/A — pre-delete backfill should extract state |
| `isSubscriptionActive` / premium templates | Scope-agnostic | Unlikely break if account row entitled |

---

## 4. Deliverable C — Backfill Strategy Options

### 4.1 Option R3-A — In-place update (`restaurantId → 0`)

**Procedure:** For each legacy row, `UPDATE user_subscriptions SET restaurantId = 0 WHERE id = ?`.

| Dimension | Assessment |
|-----------|------------|
| **Benefits** | Single row per migration; preserves `id`, invoices, Stripe ids, notifications; simplest SQL; no new duplicate rows |
| **Risks** | **CRITICAL:** Multiple scoped rows for same user become multiple `restaurantId = 0` rows — `pickUserLevelSubscription` picks one winner; losers become shadow duplicates. Mixed B-10: two account rows if account row already exists. Per-restaurant plan differentiation (B-09) **lost**. No application code path validates this update. |
| **Rollback** | Medium — must restore original `restaurantId` per row from backup snapshot |
| **Operational complexity** | Low per row — **high** for cohort validation (must exclude multi-scoped and mixed) |

**Safe cohort:** B-11 only (single scoped row, no account row, single restaurant owner).

---

### 4.2 Option R3-B — Create canonical rows and retire legacy rows

**Procedure:** For each owner, INSERT new account row (`restaurantId = 0`) with merged best entitled state; mark legacy rows `expired` or archive-delete if no billing artifacts.

| Dimension | Assessment |
|-----------|------------|
| **Benefits** | Preserves audit trail; handles B-09, B-10 cleanly; explicit retirement; invoice/payment ids stay on legacy until reconciled; aligns with D-01 single account subscription |
| **Risks** | Duplicate entitled rows transiently if not coordinated; webhook may target old id until runtime updated; MRR double-count until retirement; requires billing sign-off for row retirement |
| **Rollback** | Medium-high — delete new rows, reactivate legacy statuses from snapshot |
| **Operational complexity** | High — merge rules, invoice re-linking, payment provider mapping |

**Safe cohort:** All categories when merge rules and billing checklist applied.

---

### 4.3 Option R3-C — Hybrid migration (recommended)

**Procedure:** Classify each owner into a cohort; apply R3-A or R3-B per cohort rules.

| Cohort | Condition | Action |
|--------|-----------|--------|
| **H-A** | Exactly one scoped row; no account row; restaurant exists and owner matches; ≤1 restaurant | **R3-A** in-place `restaurantId → 0` |
| **H-B** | Account row exists + one or more scoped rows | **R3-B** retire scoped (status → `expired`); account row is canonical; reconcile if scoped had better entitlement |
| **H-C** | Multiple scoped rows; no account row | **R3-B** create one account row from `pickCanonicalSubscription(all scoped)`; retire all scoped |
| **H-D** | Orphan or owner mismatch (B-06) | **Manual** remediation — do not auto-migrate |
| **H-E** | Scoped row with `stripeSubscriptionId` / invoices | **R3-B** with billing program: migrate linkage to account row or preserve legacy id as billing record |

| Dimension | Assessment |
|-----------|------------|
| **Benefits** | Minimizes risk for majority cohort (H-A); handles edge cases explicitly; supports phased rollout |
| **Risks** | Cohort misclassification; two code paths to test; temporary dual-path runtime during phased execution |
| **Rollback** | Cohort-dependent; H-A simpler than H-C |
| **Operational complexity** | Medium-high — requires discovery queries (§3.1) before execution |

---

### 4.4 Recommendation

**Adopt R3-C (Hybrid migration).**

Rationale:

1. **R3-A alone is unsafe** for B-09 and B-10 — documented in `SUBSCRIPTION-SCOPE-AUDIT.md` Examples 3–5.
2. **R3-B alone is unnecessarily heavy** for the expected majority pre-R1 cohort (B-11: single scoped trial per owner).
3. **R3-C** matches ASN-4B.1 KEEP-until-backfill posture: surgical in-place for simple rows, create-and-retire for complex.
4. Aligns with D-09 billing protection: scoped rows with payment linkage enter H-E, not blind R3-A.

**Post-backfill invariant:** At most **one entitled account-scoped row** per owner for commercial authority; scoped rows either absent or retired (non-entitled).

---

## 5. Deliverable D — Dependency Impact Audit

Impact classification per migration option: **None** | **Low** | **Medium** | **High**

### 5.1 `CommercialContext` / `buildCommercialContextFromDb`

| Option | Impact | Notes |
|--------|--------|-------|
| R3-A (H-A) | **High** (positive) | Scoped-only owners move from `subscriptionRow: null` / `plan: NONE` to entitled TRIAL/ACTIVE |
| R3-B | **High** (positive) | Same — account row populated |
| R3-C | **High** (positive) | Cumulative |

**Risk:** H-B must reconcile account vs scoped entitlement before retiring scoped — wrong pick → **High** negative (downgrade).

---

### 5.2 `pickUserLevelSubscription`

| Option | Impact | Notes |
|--------|--------|-------|
| R3-A (multi-row mistake) | **High** (negative) | Duplicate `restaurantId = 0` → ambiguous pick |
| R3-A (H-A only) | **Low** | Single account row — deterministic |
| R3-B / R3-C | **Low** | By design one canonical account row |

---

### 5.3 `resolveCommercialEntitlements` / `getCommercialEntitlements`

| Option | Impact | Notes |
|--------|--------|-------|
| R3-C success | **High** (positive) | Owner `features.*`, `limits.*`, `commercial.*` align with legacy ordering for scoped-only cohort |
| R3-A on B-10 without merge | **Medium** | Account row may under-represent scoped entitlement |

---

### 5.4 Ordering (`order.canOrder`, `order.create`)

| Option | Impact | Notes |
|--------|--------|-------|
| R3-C + Wave A deployed | **High** (positive) | Both paths read `features.ordering` from same account authority |
| R3-C without Wave A | **Medium** | Backfill fixes NONE gap; F-W1-04 OR drift may remain until Wave A |
| R3-A on B-09 | **High** (negative) | Per-venue ordering plan semantics collapse to one account plan |

**Ordering alignment dependency:** ASN-4B.2 Wave A should deploy with or before backfill verification for legacy cohort.

---

### 5.5 Trial handling (`checkTrialStatus`, `resolveTrialStatusRead`)

| Option | Impact | Notes |
|--------|--------|-------|
| R3-C | **Medium** | `resolveTrialStatusRead` legacy fallback (`isSubscriptionActive`) less critical once account row exists; trial dates must copy correctly |
| R3-A / R3-B with wrong dates | **High** (negative) | Owner trial UI incorrect |

---

### 5.6 Billing (invoices, webhooks, MRR)

| Option | Impact | Notes |
|--------|--------|-------|
| R3-A (H-A, no Stripe) | **Low** | Trial rows — minimal billing linkage |
| R3-B / H-E | **High** | Requires billing program sign-off (D-09): invoice FK, `stripeSubscriptionId`, activation target id |
| All options | **Medium** | MRR may drop when duplicate scoped `active` rows retired — expected correction |

**Protected:** Do not modify webhook selection logic in ASN-4C execution without billing review.

---

### 5.7 Admin tooling

| Component | R3-A | R3-B | R3-C |
|-----------|------|------|------|
| `getAllRestaurantsWithSubscriptions` | **Medium** — display shifts to account fallback | **Low** after retirement | **Low** |
| `subscription.getByRestaurant` | **Medium** — strict scoped returns null post-migration | **Medium** — needs account fallback or deprecation | **Medium** |
| `createRestaurantSubscription` | **None** until ASN-5 admin normalization | **None** | **None** |
| `getAllUsersWithSubscriptions` | **Medium** — still unsafe pick; separate fix | **Medium** | **Medium** |
| Admin KPI / MRR | **Medium** | **Medium** | **Medium** |

---

### 5.8 Summary impact matrix

| Dependency | R3-A | R3-B | R3-C |
|------------|------|------|------|
| CommercialContext | High ± | High + | High + |
| pickUserLevelSubscription | High − if misapplied | Low | Low |
| resolveCommercialEntitlements | High + | High + | High + |
| Ordering | High ± | High + | High + |
| Trial handling | Medium | Medium | Medium |
| Billing | Low–High | High | High (H-E only) |
| Admin tooling | Medium | Medium | Low–Medium |

---

## 6. Deliverable E — Legacy Retirement Map

After successful backfill **and** Wave A ordering alignment, the following compatibility layers become candidates for removal. **Do not remove in ASN-4C** — planning only.

| ID | Layer | Location | Purpose today | Removable after |
|----|-------|----------|---------------|-----------------|
| E-01 | **F-W1-03** | `server/commercial/wave1ReadAuthority.ts` L66–68 | `plan === NONE` → `restaurantAllowsTableOrdering` only | R1 + **ASN-4C backfill** + Wave A |
| E-02 | **F-W1-04** | `wave1ReadAuthority.ts` L70–72 | `legacy \|\| features.ordering` | **Wave A** (before or with backfill verify) |
| E-03 | `resolveCanOrderRead` | `wave1ReadAuthority.ts` L54–73 | Mixed ordering read shim | Wave E (after A + 4C) |
| E-04 | `restaurantAllowsTableOrdering` | `server/db.ts` L716–722 | Legacy ordering write gate | Wave E |
| E-05 | `getOrderingSubscriptionForRestaurant` | `server/db.ts` L709–714 | Scoped-first row pick | Wave E |
| E-06 | `resolveOrderingSubscriptionRow` | `server/subscriptionResolver.ts` L92–103 | Scoped-first resolver | Wave E (ordering + limits consumers migrated) |
| E-07 | `resolveCanOrderRead` trial fallback branch | `resolveTrialStatusRead` L29–32 | Legacy `isSubscriptionActive` when NONE | ASN-4C + trial on account row |
| E-08 | Restaurant-scoped trial assumption in register | `registerOwner.ts` L149–153 | Scoped trial insert | **R1** (ASN-4B.1) — already planned |
| E-09 | `getSubscriptionForRestaurant` strict scoped | `server/db.ts` L436–444 | Per-restaurant subscription API | Wave F — migrate to account subscription display |
| E-10 | `subscription.getByRestaurant` | `server/routers.ts` L646–654 | Owner dashboard per-venue expiry | Wave F |
| E-11 | `resolvePlanLimitsForUser` scoped branch | `server/subscriptionPlanLimits.ts` L50–54 | Per-venue limits | Wave D (account limits only) |
| E-12 | `getAllRestaurantsWithSubscriptions` scoped-first display | `server/db.ts` L760–762 | Admin hybrid card | Wave F |
| E-13 | `resolveSubscriptionRestaurantIdForUser` scoped requirement | `adminSubscriptionHelpers.ts` L89–127 | Admin forces scoped create | ASN-5 admin path normalization |
| E-14 | `assertRestaurantSubscriptionForUpdate` scoped validation | `adminSubscriptionHelpers.ts` L187–197 | Scoped admin updates | ASN-5 |
| E-15 | `admin.createRestaurantSubscription` | `server/routers.ts` L858–886 | Creates scoped rows | ASN-5 — replace with account subscription + restaurant ops |
| E-16 | Client `clientGateRegistry` / `featureVisibility` legacy entries | `client/src/lib/commercial/` | Documents scoped reads | Wave F client gate cleanup |
| E-17 | Data integrity R2 scoped OR | `data-integrity-audit-phase2-readonly.mjs` L214 | Accepts scoped as coverage | After backfill — account row only |
| E-18 | Parity tests for F-W1-03/04 | `wave1ReadAuthority.parity.test.ts` | Documents drift | Remove with E-01/E-02 |

### 6.1 Retirement sequencing (from ASN-3)

```text
R1 register cutover (ASN-4B.1)
    → Wave A ordering alignment (ASN-4B.2)
    → ASN-4C backfill (this plan)
    → Verify legacy cohort zero entitled scoped rows
    → Remove F-W1-03 (E-01)
    → Wave D limits normalization
    → Wave E delete ordering legacy stack (E-03–E-06)
    → Wave F admin/UI scope cleanup (E-09–E-16)
    → ASN-5+ admin create path normalization (E-13–E-15)
```

---

## 7. Deliverable F — Backfill Execution Prerequisites

| # | Prerequisite | Owner | Blocking? |
|---|--------------|-------|-----------|
| P-01 | **ASN-4C plan approved** | Governance | **Yes** |
| P-02 | **Production data audit** — run §3.1 queries on staging + production | ASN-5 | **Yes** |
| P-03 | **Backup verification** — restorable snapshot of `user_subscriptions`, `invoices`, `renewal_notifications` | Ops | **Yes** |
| P-04 | **Legacy row inventory export** — cohort tags (H-A through H-E) per `userId` | ASN-5 | **Yes** |
| P-05 | **Admin account validation** — exclude or specially handle `role = admin` users | ASN-5 | Yes |
| P-06 | **Billing sign-off** for H-E cohort (Stripe ids, invoices, webhook target ids) | Billing program | **Yes** if H-E non-empty |
| P-07 | **R1 register cutover deployed** (or simultaneous) — stop new scoped row creation | ASN-4B.1 | **Yes** |
| P-08 | **Wave A ordering alignment deployed** (or simultaneous) — `order.create` uses account entitlements | ASN-4B.2 | **Strongly recommended** |
| P-09 | **Rollback plan documented** — per-cohort restore procedure | ASN-5 | **Yes** |
| P-10 | **Dry-run on staging** — row counts in/out, spot-check owners | ASN-5 | **Yes** |
| P-11 | **Post-migration verification script** — zero entitled scoped rows; exactly one entitled account row per active owner | ASN-5 | **Yes** |
| P-12 | **Orphan remediation** (H-D) — manual tickets before bulk migration | Support/Ops | Yes if L5 > 0 |
| P-13 | **Communication window** — internal notice for MRR display changes | Product/Ops | No |
| P-14 | **Freeze admin scoped subscription creates** during backfill window | Ops | Recommended |

---

## 8. Success criteria — answers

### 8.1 What legacy subscription data exists?

`user_subscriptions` rows with `restaurantId > 0` — a **scope tag** set at INSERT, never updated by application code. Created primarily by:

1. Self-service registration (scoped trial on first restaurant)
2. Admin `createRestaurantSubscription` and scoped `createUserSubscriptionByAdmin`
3. Payment activation preserving original scope

These rows are **invisible** to `pickUserLevelSubscription` / `CommercialContext` but **authoritative** for legacy ordering, strict per-restaurant subscription APIs, and per-venue plan limits.

Exact counts require §3.1 SQL (not executed in this planning phase).

---

### 8.2 What should be migrated?

| Migrate | Target |
|---------|--------|
| Entitled state (plan, status, periods, trial dates, billing cycle) | Single account row per owner (`restaurantId = 0`) |
| Billing linkage (Stripe ids) on scoped rows | Account row (H-E rules) or preserved legacy id with billing mapping |
| Invoice `subscriptionId` references | Re-link to account row id where applicable |

**Cohort priority:** B-11 (scoped-only single restaurant) first — expected largest pre-R1 population.

---

### 8.3 What should be preserved?

| Preserve | Reason |
|----------|--------|
| Row `id` when using R3-A (H-A) | Invoice FK, notification history |
| Legacy row as `expired` archive (R3-B) when invoices/Stripe exist | Audit + D-09 billing |
| `createdAt` / historical status transitions | Compliance and support |
| Payment provider metadata | Webhook continuity |
| Non-entitled expired/canceled scoped rows | Optional — may retire without migration if no billing artifacts |

---

### 8.4 What should be deleted?

| Delete | Condition |
|--------|-----------|
| Duplicate scoped rows post-account migration | After entitlement merged and **no** invoice/Stripe on scoped row |
| Orphan scoped rows (B-06) | After manual review — restaurant gone, no billing |
| Shadow duplicate account rows from mis-executed R3-A | **Prevent** — never create via misclassified cohort |

**Do not mass-delete** scoped rows with invoice or `stripeSubscriptionId` without billing program approval.

---

### 8.5 What is the safest migration strategy?

**R3-C Hybrid migration** with mandatory discovery (§3.1), cohort classification (§4.3), billing escrow for H-E, and deploy ordering Wave A alongside or before legacy cohort verification.

**Never** apply blanket R3-A to all scoped rows.

---

### 8.6 What compatibility layers become removable after migration?

See §6 (E-01 through E-18). Minimum ordering-unblock set:

- **F-W1-03** (E-01) — requires ASN-4C complete
- **F-W1-04** (E-02) — requires Wave A
- **`resolveCanOrderRead`** (E-03) — Wave E
- **`restaurantAllowsTableOrdering` chain** (E-04–E-06) — Wave E
- **Register scoped trial** (E-08) — R1
- **Admin scoped create paths** (E-13–E-15) — ASN-5

---

### 8.7 What should ASN-5 implement after ASN-4C is approved?

| ASN-5 work package | Description |
|--------------------|-------------|
| **5.1 Data discovery execution** | Run §3.1 queries; produce cohort CSV per owner |
| **5.2 Backfill execution scripts** | Implement R3-C cohort handlers (transactional); staging dry-run |
| **5.3 Verification suite** | Post-migration invariants; ordering smoke tests for sampled owners |
| **5.4 Billing reconciliation** | H-E invoice/subscription id mapping; billing sign-off checklist |
| **5.5 Admin path normalization** | Stop creating scoped rows: `createRestaurantSubscription`, `resolveSubscriptionRestaurantIdForUser` |
| **5.6 `getAllUsersWithSubscriptions` fix** | Use `getCanonicalUserSubscription` / account pick — separate from backfill but same release train |
| **5.7 F-W1-03 removal** | After backfill verified — simplify `resolveCanOrderRead` or rely on Wave A helper only |
| **5.8 Documentation** | Update `SUBSCRIPTION-SCOPE-AUDIT.md` status; close F-3 incident class for legacy cohort |
| **5.9 Rollback runbook** | Per-cohort restore tested on staging |

**ASN-5 is execution — not in scope until ASN-4C approved.**

---

## 9. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Misclassified H-A owner has hidden second scoped row | High | Pre-migration `GROUP BY userId HAVING COUNT(*) > 1` gate |
| Billing webhook targets retired subscription id | High | H-E checklist; billing sign-off |
| MRR dashboard drop | Medium | Expected; communicate before execution |
| Per-venue plan collapse (B-09) | Medium | Document upgrade path; manual review for multi-scoped owners |
| Ordering 403 during backfill window | Medium | Deploy Wave A first; maintenance window |
| Orphan scoped rows | Low | H-D manual remediation |

---

## 10. Related documents

| Document | Relationship |
|----------|--------------|
| `ASN-4B.1-REGISTER-MIGRATION-PLAN.md` | R1 stops new scoped rows; defers backfill to ASN-4C |
| `ASN-4B.2-WAVE-A-ORDERING-ALIGNMENT-PLAN.md` | Ordering must align before F-W1-03 removal |
| `SUBSCRIPTION-SCOPE-AUDIT.md` | Source inventory for scope creation and resolution |
| `ASN-3-NORMALIZATION-DESIGN.md` | Waves D–F retirement schedule |
| `COMMERCIAL-AUTHORITY-SPEC.md` | Target authority model |

---

*End of ASN-4C planning document. No code, schema, migration scripts, database updates, or runtime changes were performed.*
