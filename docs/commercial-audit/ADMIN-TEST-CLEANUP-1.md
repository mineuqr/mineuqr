# ADMIN-TEST-CLEANUP-1 — Retired Subscription API Test Cleanup

**Date:** 2026-06-09  
**Status:** Complete  

**Context:** AUTHORITY-CLEANUP-1 retired restaurant-scoped admin subscription APIs. Tests that asserted historical behavior against those procedures failed with `PRECONDITION_FAILED`.

---

## Phase A — Test inventory (`server/admin-audit-fix2.test.ts`)

| Test | Retired API / assumption | Classification |
|------|--------------------------|----------------|
| `creates subscription for restaurant owner after onboarding` | `admin.createRestaurantSubscription`, `createSubscriptionForRestaurant` per restaurant | **Category 1 — Obsolete** |
| `returns NOT_FOUND for missing subscription` | `admin.updateRestaurantSubscription` validation | **Category 1 — Obsolete** |
| `rejects when subscription owner does not match restaurant owner` | Restaurant-scoped subscription ↔ restaurant owner consistency | **Category 1 — Obsolete** |
| `updates when subscription and restaurant are consistent` | `admin.updateRestaurantSubscription` success path | **Category 1 — Obsolete** |
| `assigns restaurant to subscriber via ownerUserId when admin creates` | `restaurant.create` ownership only | **Category 3 — Still valid** |
| `resolves subscriber from ownerEmail when ownerUserId omitted` | `restaurant.create` ownership only | **Category 3 — Still valid** |
| `does not return passwordHash from admin.listAllUsers` | Admin response sanitization | **Category 3 — Still valid** |

**Action taken:** Removed 4 obsolete tests (Category 1). Retained 3 valid tests (Category 3).

**Category 2 (rewrite):** Not required in this file. Owner-level subscription behavior is already covered elsewhere:

- `server/admin-subscription.test.ts` — retirement guards for all three retired procedures
- `server/commercial/authorityCleanup1.test.ts` — `createUserSubscriptionByAdmin` + retirement assertion
- `server/admin-invoice-billing.test.ts` — `createUserSubscriptionByAdmin` billing rules

---

## Phase C — Changes

**File:** `server/admin-audit-fix2.test.ts`

- Deleted `creates subscription for restaurant owner after onboarding`
- Deleted entire `updateRestaurantSubscription validation (R-2)` describe block (3 tests)
- Removed unused mocks/imports: `createSubscriptionForRestaurant`, `getRestaurantById`, `getSubscriptionForRestaurant`, `getSubscriptionById`, `updateSubscriptionById`

No production code changes.

---

## Phase D — Repository-wide retired API verification

Search: `createRestaurantSubscription`, `updateRestaurantSubscription`, `cancelRestaurantSubscription`

| Location | Role | Status |
|----------|------|--------|
| `server/routers.ts` | Production stubs → `assertRestaurantScopedSubscriptionRetired` | Expected (AUTHORITY-CLEANUP-1) |
| `server/admin-subscription.test.ts` | Asserts `PRECONDITION_FAILED` retirement | Valid |
| `server/commercial/authorityCleanup1.test.ts` | Asserts retirement + owner-level create | Valid |
| `server/admin-audit-fix2.test.ts` | **Removed** historical behavior tests | Clean |

**No remaining tests** assert successful restaurant-scoped subscription management or restaurant-scoped subscription ownership validation via retired admin procedures.

**Related but valid references:**

- `createSubscriptionForRestaurant` in `admin-invoice-billing.test.ts` / `authorityCleanup1.test.ts` — tests owner-level `createUserSubscriptionByAdmin` implementation (account row with `restaurantId: 0`), not retired admin APIs
- Commercial/subscription resolver tests — data-model `restaurantId` field on rows; not admin restaurant-scoped subscription authority

---

## Phase E — Validation

```bash
npm run check
npm test
```

Target: zero failures.

---

## Exit criteria

| Criterion | Status |
|-----------|--------|
| No tests depend on retired subscription API behavior | ✅ |
| No restaurant-scoped subscription admin assumptions in active tests | ✅ |
| Owner-level authority reflected in dedicated test files | ✅ |
| `npm run check` passes | ✅ |
| `npm test` passes with zero failures | ✅ |
