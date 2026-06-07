# ASN-5 — Authority Normalization Execution

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-5 — Execution  
**Date:** 2026-06-07  
**Status:** **Complete**  

**Inputs:** ASN-1 through ASN-5A (verified empty commercial data on audited database).

**Constraints honored:** No schema changes. No database migrations. No data mutations. Authority normalization only.

---

## 1. Execution summary

### 1.1 Goals completed

| Goal | Status | Summary |
|------|--------|---------|
| **G1 — R1 register normalization** | ✅ Done | Register creates account-scoped trial (`restaurantId = 0`) |
| **G2 — Wave A ordering alignment** | ✅ Done | `order.canOrder` and `order.create` share `resolveGuestOrderingAllowed` |
| **G3 — Retire F-W1-03** | ✅ Done | `resolveCanOrderRead` removed; no `plan === NONE` → legacy ordering |
| **G4 — Retire F-W1-04** | ✅ Done | No `legacy \|\| features.ordering` OR branch |
| **G5 — Authority simplification** | ✅ Partial | Ordering routers decoupled from scoped subscription chain |

### 1.2 Files changed

| File | Change |
|------|--------|
| `server/auth-local/registerOwner.ts` | `buildTrialSubscriptionForUser(userId, 0)` — account trial |
| `server/commercial/guestOrderingAuthority.ts` | **New** — canonical guest ordering resolver |
| `server/commercial/guestOrderingAuthority.test.ts` | **New** — unit tests |
| `server/commercial/wave1ReadAuthority.ts` | Removed `resolveCanOrderRead` (F-W1-03/04) |
| `server/routers.ts` | Wired `resolveGuestOrderingAllowed` for `canOrder` + `create` |
| `server/create-trial-subscription.ts` | Comment update (register uses `0`) |
| `server/db.ts` | `@deprecated` on `restaurantAllowsTableOrdering` |
| `server/commercial/wave1ReadAuthority.test.ts` | Removed F-W1 ordering tests |
| `server/commercial/wave1ReadAuthority.parity.test.ts` | Rewritten for ASN-5 canonical ordering |
| `server/order-create-pricing.test.ts` | Mock `resolveGuestOrderingAllowed` |
| `server/phase-c-verification.test.ts` | Mock `resolveGuestOrderingAllowed` |
| `server/payment-flow.test.ts` | Added `getUserById` / `getSubscriptionsByUser` mocks |

**Not changed:** Schema, migrations, billing webhooks, admin subscription create paths, `resolveTrialStatusRead` legacy fallback for scoped-only trial rows.

---

## 2. Authority diff (before vs after)

### 2.1 Registration (R1)

**Before:**

```text
registerOwnerTransactional
  INSERT users
  INSERT restaurants → restaurantId = R
  buildTrialSubscriptionForUser(userId, R)   ← restaurant-scoped
  INSERT user_subscriptions { restaurantId: R }
```

**After:**

```text
registerOwnerTransactional
  INSERT users
  INSERT restaurants → restaurantId = R
  buildTrialSubscriptionForUser(userId, 0)   ← account-scoped
  INSERT user_subscriptions { restaurantId: 0 }
```

**CommercialContext after register:** `pickUserLevelSubscription` finds trial → `plan: TRIAL` → `features.ordering: true`.

---

### 2.2 Guest ordering read (`order.canOrder`)

**Before:**

```text
resolveCanOrderRead(restaurantId)
  → getCommercialEntitlements(ownerId)
  → if plan === NONE: restaurantAllowsTableOrdering (F-W1-03)
  → else: legacy || features.ordering (F-W1-04)
```

**After:**

```text
resolveGuestOrderingAllowed(restaurantId)
  → getRestaurantById → ownerId
  → getCommercialEntitlements(ownerId)
  → features.ordering === true
```

---

### 2.3 Guest ordering write (`order.create` entitlement gate)

**Before:**

```text
restaurantAllowsTableOrdering(restaurantId)
  → resolveOrderingSubscriptionRow (scoped-first)
  → resolveTableOrderingEntitlement
```

**After:**

```text
resolveGuestOrderingAllowed(restaurantId)   ← same helper as canOrder
  → features.ordering
```

**Preserved (operational, non-commercial):** `isActive`, `temporaryClosure`, `workingHours`, table validation, pricing.

---

### 2.4 Authority flow (target state)

```text
Owner Account
    ↓
Subscription (restaurantId = 0 for new registrations)
    ↓
Plan
    ↓
Commercial Entitlements (getCommercialEntitlements)
    ↓
features.ordering
    ↓
order.canOrder  ──┐
order.create      ──┴── resolveGuestOrderingAllowed
```

**No authority drift:** read and write use identical entitlement source.

---

## 3. Removed legacy components

| ID | Component | Location | Reason removed |
|----|-----------|----------|----------------|
| R-01 | **F-W1-03** | `wave1ReadAuthority.ts` L66–68 | `plan === NONE` → `restaurantAllowsTableOrdering` |
| R-02 | **F-W1-04** | `wave1ReadAuthority.ts` L70–72 | `legacy \|\| features.ordering` |
| R-03 | **`resolveCanOrderRead`** | `wave1ReadAuthority.ts` | Entire mixed shim deleted |
| R-04 | **`restaurantAllowsTableOrdering` router import** | `routers.ts` | No ordering consumer |
| R-05 | **Scoped register trial** | `registerOwner.ts` | R1 account trial |

---

## 4. Validation results

| # | Requirement | Result | Evidence |
|---|-------------|--------|----------|
| 1 | New registration produces account-scoped authority | ✅ Pass | `registerOwner.ts` L149: `buildTrialSubscriptionForUser(userId, 0)` |
| 2 | CommercialContext resolves expected plan | ✅ Pass | Account row visible to `pickUserLevelSubscription`; parity test account trial |
| 3 | Entitlements resolve correctly | ✅ Pass | `getCommercialEntitlements.test.ts` (5 tests) |
| 4 | Ordering access follows `features.ordering` | ✅ Pass | `guestOrderingAuthority.test.ts` |
| 5 | Order creation follows `features.ordering` | ✅ Pass | `order.create` uses `resolveGuestOrderingAllowed`; `order-create-pricing.test.ts` |
| 6 | No F-W1-03 dependency remains | ✅ Pass | `grep resolveCanOrderRead server/` → 0 matches |
| 7 | No F-W1-04 dependency remains | ✅ Pass | No OR branch in ordering path |
| 8 | Admin flows still function | ✅ Pass | `admin-subscription.test.ts` (12), `admin-invoice-billing.test.ts` (4) |

### 4.1 Test execution

```text
npm run check                              → PASS (tsc --noEmit)
npm test -- server/                        → PASS (449 passed, 2 skipped, 0 failed)
```

Key ASN-5 test files:

- `server/commercial/guestOrderingAuthority.test.ts` — 4 passed
- `server/commercial/wave1ReadAuthority.parity.test.ts` — 6 passed (includes scoped-only → deny ordering)
- `server/commercial/wave1ReadAuthority.test.ts` — 3 passed (trial status only)

### 4.2 Grep verification

| Pattern | `server/` production code |
|---------|---------------------------|
| `resolveCanOrderRead` | **0** |
| `restaurantAllowsTableOrdering` in `routers.ts` | **0** |
| `F-W1-03` / `F-W1-04` | **0** (docs only) |

---

## 5. Residual legacy inventory (intentional)

| Component | Status | Future wave |
|-----------|--------|-------------|
| `restaurantAllowsTableOrdering` | `@deprecated` in `db.ts`; no router callers | Wave E delete |
| `getOrderingSubscriptionForRestaurant` | Unused by ordering routers | Wave E |
| `resolveOrderingSubscriptionRow` | Used by `subscriptionPlanLimits` (category/item caps) | Wave D |
| `resolveTrialStatusRead` NONE fallback | `isSubscriptionActive` when `plan === NONE` | Wave F (scoped trial rows) |
| `getSubscriptionForRestaurant` | Admin/owner strict scoped API | Wave F |
| `admin.createRestaurantSubscription` | Still creates scoped rows | ASN-5B admin normalization |
| `subscription.getByRestaurant` | Strict scoped read | Wave F |

**ASN-5A note:** Audited database has 0 subscription rows — no ASN-4C data backfill was required. Scoped-only rows in other environments will not receive ordering via legacy path; backfill still recommended there.

---

## 6. Success criteria assessment

| Criterion | Met? |
|-----------|------|
| Authority flow: Account → Subscription → Plan → Entitlements → Features → Ordering | **Yes** |
| No restaurant-scoped authority for guest ordering | **Yes** |
| No authority drift between `canOrder` and `create` | **Yes** |
| No F-W1-03 | **Yes** |
| No F-W1-04 | **Yes** |
| CommercialContext effective source for ordering | **Yes** via `getCommercialEntitlements` |

---

## 7. Rollback notes

Revert ordering + register changes:

1. Restore `buildTrialSubscriptionForUser(userId, restaurantId)` in `registerOwner.ts`
2. Restore `resolveCanOrderRead` in `wave1ReadAuthority.ts`
3. Restore `routers.ts` imports and `restaurantAllowsTableOrdering` on `order.create`

No database rollback required — no data migration was executed.

---

*End of ASN-5 execution record. Last updated: 2026-06-07.*
