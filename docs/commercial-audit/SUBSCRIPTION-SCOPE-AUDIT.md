# SUBSCRIPTION-SCOPE-AUDIT.md

**PG-1A.4 — Subscription Scope Audit**  
**Mode:** Read-only investigation  
**Branch:** main  
**Date:** 2026-06-05  

No code, schema, commits, fixes, or refactors were performed.

---

## Search Target Summary

| Term | Found? | Notes |
|---|---|---|
| `user_subscriptions.restaurantId` | Yes | `drizzle/schema.ts:119` |
| `restaurantId = 0` / `restaurantId: 0` | Yes | Account-level convention in resolver code |
| `restaurantId ?? 0` | Yes | `server/create-trial-subscription.ts:69` |
| `subscriptionScope` | **No** | — |
| `scope` (subscription context) | Comment only | `server/subscriptionResolver.ts:78`, `server/adminSubscriptionHelpers.ts:86` |
| `resolveSubscriptionEntitlement` | Yes | Does **not** read `restaurantId` |
| `resolvePlanLimitsForUser` | Yes | Scope-aware when `restaurantId` arg passed |
| `resolveTableOrderingEntitlement` | Yes | Scope resolved **before** call |
| `buildTrialSubscriptionForUser` | Yes | Accepts `restaurantId` param |
| `activateSubscription` | **No symbol** | Uses `updateSubscriptionForActivation` |
| `changeSubscription` | **No symbol** | Admin/plan updates via `updateSubscriptionById` |

**Column added:** `user_subscriptions.restaurantId` — migration `drizzle/0004_wooden_anthem.sql:1`.

**Immutability:** No code path **updates** `user_subscriptions.restaurantId` after insert. Scope is set at creation only.

---

## What `restaurantId` Means (Factual Definition)

`user_subscriptions.restaurantId` is a **scope tag** on a user-owned subscription row:

| Value | Code label | Meaning in resolvers |
|---|---|---|
| **`0`** | Account-level / user-level | Row applies account-wide; selected by `pickUserLevelSubscription` (`server/subscriptionResolver.ts:78–86`) |
| **`> 0`** | Restaurant-scoped | Row tagged to a specific restaurant id; selected by filtering `restaurantId === target` |

It is **not** a foreign key in the database. Application code validates that scoped ids match `restaurants.userId === sub.userId` on admin writes (`server/adminSubscriptionHelpers.ts:105–114`, `187–197`).

---

## SECTION 1 — Subscription Scope Inventory

### A. Created (INSERT)

| File | Function / route | `restaurantId` assigned | Line refs |
|---|---|---|---|
| `server/auth-local/registerOwner.ts` | `registerOwnerTransactional` → `tx.insert(userSubscriptions)` | **Specific** — new restaurant id | `149–153` |
| `server/create-trial-subscription.ts` | `buildTrialSubscriptionPayload` | Parameter, default **`0`** | `29–42` |
| `server/create-trial-subscription.ts` | `buildTrialSubscriptionForUser` | Parameter, default **`0`** | `53–58` |
| `server/create-trial-subscription.ts` | `createTrialSubscription` | `options?.restaurantId ?? 0` | `65–75` |
| `server/db.ts` | `createUserSubscription` | From caller payload | `463–467` |
| `server/db.ts` | `createSubscriptionForRestaurant` | From caller payload | `724–728` |
| `server/adminSubscriptionHelpers.ts` | `buildAdminSubscriptionInsert` | `params.restaurantId` | `37–61` |
| `server/routers.ts` | `admin.createRestaurantSubscription` | **`input.restaurantId`** (specific) | `873–881` |
| `server/routers.ts` | `admin.createUserSubscriptionByAdmin` | From `resolveSubscriptionRestaurantIdForUser` | `1040–1054` |

### B. Updated

| Finding | Evidence |
|---|---|
| **`restaurantId` is never updated** | `updateSubscriptionById` accepts `Partial<InsertUserSubscription>` but all callers only set `planId`, `status`, `billingCycle`, period fields, `trialEndsAt`, Stripe ids — `server/routers.ts:897–903`, `1097–1103`, `server/paypal-webhook.ts:108–117`, `server/tap-webhook.ts:96–120` |

### C. Queried / filtered

| File | Function | Filter / use | Line refs |
|---|---|---|---|
| `server/db.ts` | `getSubscriptionForRestaurant(restaurantId)` | `WHERE restaurantId = ?` (strict) | `436–443` |
| `server/db.ts` | `getOrderingSubscriptionForRestaurant(restaurantId)` | Owner rows → `resolveOrderingSubscriptionRow` | `709–713` |
| `server/db.ts` | `getAllRestaurantsWithSubscriptions()` | Per restaurant: scoped rows, then user-level fallback | `760–762` |
| `server/db.ts` | `cascadeDeletes.subscriptionIdsForRestaurant` | `WHERE restaurantId = ?` | `142–150` |
| `server/subscriptionResolver.ts` | `pickUserLevelSubscription` | `restaurantId === 0` | `79–86` |
| `server/subscriptionResolver.ts` | `resolveOrderingSubscriptionRow` | `restaurantId === target`, else fallback to `0` | `92–102` |
| `server/subscriptionActivation.ts` | `resolveSubscriptionForActivationFromRows` | Filter by `options.restaurantId` if set | `28–32` |
| `server/adminSubscriptionHelpers.ts` | `resolveSubscriptionRestaurantIdForUser` | Validates / resolves scope for admin create | `89–127` |
| `server/adminSubscriptionHelpers.ts` | `assertRestaurantSubscriptionForUpdate` | Validates `sub.restaurantId > 0` vs owner | `187–197` |
| `scripts/data-integrity-audit-phase2-readonly.mjs` | R2 audit rule | `restaurantId = r.id OR restaurantId = 0` | `214`, `221` |

### D. Compared (runtime logic)

| File | Function | Comparison |
|---|---|---|
| `server/subscriptionResolver.ts:84` | `pickUserLevelSubscription` | `r.restaurantId === 0` |
| `server/subscriptionResolver.ts:98` | `resolveOrderingSubscriptionRow` | `s.restaurantId === restaurantId` |
| `server/adminSubscriptionHelpers.ts:94` | `resolveSubscriptionRestaurantIdForUser` | `restaurantIdInput === 0` |
| `server/adminSubscriptionHelpers.ts:187` | `assertRestaurantSubscriptionForUpdate` | `sub.restaurantId > 0` |

### E. Ignored by resolver

| File | Function | Scope handling |
|---|---|---|
| `server/subscriptionEntitlement.ts:32` | `resolveSubscriptionEntitlement` | **Ignores** `restaurantId` — status/period only |
| `server/subscriptionEntitlement.ts:117` | `resolveTableOrderingEntitlement` | **Ignores** `restaurantId` — entitlement + plan id only |
| `server/adminKpiCalculations.ts:33` | `computeAdminMrr` | **Ignores** `restaurantId` — sums all `active` rows |

---

## SECTION 2 — Scope Creation Flows

### A. User registration → trial creation

```
registerOwnerTransactional
  INSERT users
  INSERT restaurants → restaurantId = R
  buildTrialSubscriptionForUser(userId, R)
  INSERT user_subscriptions { userId, restaurantId: R, planId: Professional, status: trial }
```

| Field | Value | Reason |
|---|---|---|
| `restaurantId` | **Specific restaurant id** | Passed from newly created restaurant (`server/auth-local/registerOwner.ts:149–151`) |

### B. Restaurant creation (post-registration)

```
restaurant.create
  INSERT restaurants { userId }
  → No subscription row created
```

| Field | Value | Reason |
|---|---|---|
| `restaurantId` | **N/A** | No subscription inserted (`server/routers.ts:134–138`) |

Additional restaurants inherit entitlements from existing user rows via resolver fallback (ordering) or account-wide canonical pick (restaurant count).

### C. Admin subscription activation

**Path 1 — restaurant-scoped:**

```
admin.createRestaurantSubscription
  restaurantId = input.restaurantId (specific)
  userId = restaurant.userId
  INSERT user_subscriptions { userId, restaurantId, planId, status: active }
```

**File:** `server/routers.ts:855–883`

**Path 2 — user-scoped (admin user dialog):**

```
admin.createUserSubscriptionByAdmin
  restaurantId = resolveSubscriptionRestaurantIdForUser(userId, input.restaurantId?)
  INSERT user_subscriptions { userId, restaurantId, planId, status }
```

| User state | `restaurantId` resolved | Reason |
|---|---|---|
| No restaurants | **`0`** | `owned.length === 0` → return 0 (`adminSubscriptionHelpers.ts:118–120`) |
| Has restaurants, input omitted | **Error** | Must specify restaurant (`adminSubscriptionHelpers.ts:123–126`) |
| Has restaurants, input = specific id | **That id** | Validated against owner (`adminSubscriptionHelpers.ts:105–115`) |
| Input explicitly **`0`** with restaurants | **Error** | Forbidden when user has restaurants (`adminSubscriptionHelpers.ts:94–101`) |

**Admin onboarding (restaurant + sub):** `AdminManagement.tsx:918–925` calls `createRestaurantSubscription` with **specific** `restaurantData.id`.

### D. Plan change (payment / checkout)

```
PayPal/Tap webhook
  updateSubscriptionForActivation(userId, { planId, status: active, ... }, { planId })
  OR updateSubscriptionById(subscriptionId, { status: active, ... })
```

| Field | Value | Reason |
|---|---|---|
| `restaurantId` | **Unchanged** | Activation updates plan/status/periods on existing row only |

**Files:** `server/paypal-webhook.ts:108–118`, `server/tap-webhook.ts:111–120`

Target row selected by `resolveSubscriptionForActivationFromRows` priority: subscriptionId → restaurantId option → planId → user-level (`0`) → canonical (`server/subscriptionActivation.ts:17–44`).

### E. Manual subscription edit (admin)

```
admin.updateRestaurantSubscription(subscriptionId, { planId?, status?, ... })
admin.updateUserSubscriptionByAdmin(userId, { planId?, status?, ... })
  → updateSubscriptionById(id, updateData)   // no restaurantId in updateData
```

| Field | Value | Reason |
|---|---|---|
| `restaurantId` | **Unchanged** | Edit mutations never include `restaurantId` (`server/routers.ts:897–903`, `1097–1103`) |

### F. Standalone trial helper (non-register)

```
createTrialSubscription(userId)   // no options
  → restaurantId = 0
```

**File:** `server/create-trial-subscription.ts:65–69`  
**Test:** `server/trial-and-webhook.test.ts:80–84`

---

## SECTION 3 — Scope Resolution Flows

### `resolveSubscriptionEntitlement(sub, now?)`

```
Input: single subscription row
  ↓
restaurantId: NOT READ
  ↓
Output: { isEntitled, reason, status, source } based on status + trialEndsAt/currentPeriodEnd only
```

**File:** `server/subscriptionEntitlement.ts:32–114`

Scope must be resolved **before** selecting which row to pass in.

---

### `resolvePlanLimitsForUser(userId, restaurantId?)`

```
Input: userId, optional restaurantId
  ↓
getSubscriptionsByUser(userId) → all rows
  ↓
If restaurantId != null:
    sub = resolveOrderingSubscriptionRow(restaurantId, rows)
      → filter rows where restaurantId === target
      → else pickUserLevelSubscription (restaurantId === 0)
Else (account-wide):
    sub = pickCanonicalSubscription(all rows)
  ↓
resolveSubscriptionEntitlement(sub) → if entitled → plan limits
Else → getFallbackBasicLimits()
  ↓
Output: { maxRestaurants, maxItemsPerRestaurant, maxCategories }
```

**File:** `server/subscriptionPlanLimits.ts:46–68`

| Call site | `restaurantId` arg | Effect |
|---|---|---|
| `assertRestaurantCreateAllowed` | **Omitted** | Account-wide canonical (`:76`) |
| `assertCategoryCreateAllowed` | **Passed** | Restaurant-scoped + user-level fallback (`:89`) |
| `assertMenuItemCreateAllowed` | **Passed** | Restaurant-scoped + user-level fallback (`:103`) |

---

### `resolveTableOrderingEntitlement(sub, plan, now?)`

```
Input: pre-selected subscription row + plan
  ↓
restaurantId: NOT READ (scope already applied when row was chosen)
  ↓
resolveSubscriptionEntitlement(sub)
  ↓
plan.id === 30001 ? deny : allow
  ↓
Output: entitlement result
```

**File:** `server/subscriptionEntitlement.ts:117–148`

**Row selection chain (ordering):**

```
restaurantAllowsTableOrdering(restaurantId)
  ↓ getRestaurantById → owner userId
  ↓ getSubscriptionsByUser(ownerUserId)
  ↓ resolveOrderingSubscriptionRow(restaurantId, rows)
  ↓ resolveTableOrderingEntitlement(sub, plan)
```

**File:** `server/db.ts:716–721`

---

### Related resolvers (scope behavior)

| Function | Scope behavior | File:line |
|---|---|---|
| `pickCanonicalSubscription(rows)` | All rows; no `restaurantId` filter | `subscriptionResolver.ts:70–75` |
| `pickUserLevelSubscription(rows)` | **`restaurantId === 0` only** | `subscriptionResolver.ts:79–86` |
| `resolveOrderingSubscriptionRow(id, rows)` | Scoped first, then user-level | `subscriptionResolver.ts:92–102` |
| `userHasSubscriptionEntitlement(rows)` | **Any row**, any scope | `subscriptionEntitlement.ts:151–156` |
| `isSubscriptionActive(userId)` | All user rows → any entitled | `server/db.ts:515–517` |
| `getCanonicalUserSubscription(userId)` | All rows → canonical pick | `server/db.ts:450–452` |
| `getSubscriptionForRestaurant(id)` | **Strict** `WHERE restaurantId = id` — no fallback to 0 | `server/db.ts:436–443` |
| `resolveSubscriptionForActivationFromRows` | Optional filter by `restaurantId`; falls back to user-level | `subscriptionActivation.ts:17–44` |
| `getAllRestaurantsWithSubscriptions` | Per restaurant: scoped canonical, **then** user-level fallback | `server/db.ts:760–762` |

---

## SECTION 4 — Account-Level (`restaurantId = 0`)

### Where created

| Path | File |
|---|---|
| `createTrialSubscription(userId)` without options | `server/create-trial-subscription.ts:69` |
| `admin.createUserSubscriptionByAdmin` when user has **zero** restaurants | `server/adminSubscriptionHelpers.ts:118–120` |
| Tests / mocks | Multiple test files |

### Where expected

| Context | Evidence |
|---|---|
| Comment: "OAuth / account-level rows" | `server/subscriptionResolver.ts:78` |
| Admin user-level sub when no restaurants | `server/adminSubscriptionHelpers.ts:86–88` |
| Data integrity audit R2: `restaurantId = 0` satisfies restaurant coverage | `scripts/data-integrity-audit-phase2-readonly.mjs:214` |
| Activation fallback after plan/restaurant filters | `subscriptionActivation.ts:41–42` |

### Where consumed

| Consumer | Behavior |
|---|---|
| `pickUserLevelSubscription` | Selects only `restaurantId === 0` rows |
| `resolveOrderingSubscriptionRow` | **Fallback** when no scoped row for target restaurant |
| `resolvePlanLimitsForUser(userId, restaurantId)` | Fallback for per-restaurant category/item limits |
| `getAllRestaurantsWithSubscriptions` | Fallback subscription display per restaurant card |
| `resolveSubscriptionForActivationFromRows` | Preferred target when no restaurant/plan filter matches |

### Where ignored / not used

| Consumer | Behavior |
|---|---|
| `getSubscriptionForRestaurant(id)` | Does **not** query `restaurantId = 0` rows |
| `subscription.getByRestaurant` API | Uses strict query → **null** if only account-level row exists |
| `resolvePlanLimitsForUser(userId)` without second arg | Uses canonical across **all** scopes (not limited to 0) |
| `resolveSubscriptionEntitlement` | Row-agnostic |
| `computeAdminMrr` | Counts row regardless of scope |

---

## SECTION 5 — Restaurant-Scoped Subscriptions (`restaurantId > 0`)

### Creation flow

| Entry | `restaurantId` |
|---|---|
| Self-service `registerOwner` | First restaurant id |
| `admin.createRestaurantSubscription` | Input restaurant id |
| `admin.createUserSubscriptionByAdmin` | Selected restaurant id (required when user has restaurants) |
| Admin create restaurant + subscription UI | New restaurant id (`AdminManagement.tsx:921`) |

### Resolution flow

```
Filter: user_subscriptions WHERE userId = owner AND restaurantId = R
  ↓ pickCanonicalSubscription (if multiple rows for same R)
  ↓ used directly by getSubscriptionForRestaurant(R)
  ↓ OR first choice in resolveOrderingSubscriptionRow(R, allOwnerRows)
  ↓ OR first choice in getAllRestaurantsWithSubscriptions per restaurant card
```

### Feature impact

| Feature | Scoped row effect |
|---|---|
| **Table ordering** for restaurant R | Scoped row for R **preferred** over account-level row (`subscription-resolver.test.ts:183–196`) |
| **Category/item limits** for restaurant R | Scoped row for R preferred; falls back to `restaurantId = 0` (`subscriptionPlanLimits.ts:52–53`) |
| **Restaurant count limit** | **Not scoped** — uses account-wide `pickCanonicalSubscription` |
| **Premium templates/colors/fonts** | **Not scoped** — `isSubscriptionActive` checks any entitled row |
| **`subscription.getByRestaurant(R)`** | **Strict scoped only** — no fallback |
| **Dashboard expiry warning** | Uses `getByRestaurant` → may miss account-level sub (`Dashboard.tsx:1362–1365`) |

### MRR impact

`computeAdminMrr` sums **every** `active` subscription row for the user. A user with scoped rows for Restaurant A and Restaurant B would contribute **twice** to MRR if both are `active`.

**File:** `server/adminKpiCalculations.ts:33–42` — no deduplication by user or restaurant.

### Invoice impact

`admin.generateInvoicePDF` uses `getCanonicalUserSubscription(userId)` — account-wide canonical pick across **all scopes**, not restaurant-specific.

**File:** `server/routers.ts:1205–1229`

Invoice record stores `subscriptionId` of canonical row. No `restaurantId` on invoice table.

---

## SECTION 6 — Admin Interaction

| Admin action | Route | Scope created / affected |
|---|---|---|
| Create subscriber account | `admin.createSubscriberAccount` | **None** — user only |
| Create user subscription | `admin.createUserSubscriptionByAdmin` | **`0`** if no restaurants; **specific id** if user has restaurants |
| Create restaurant + subscription | Admin UI → `createRestaurantSubscription` | **Specific** new restaurant id |
| Create subscription on existing restaurant | `admin.createRestaurantSubscription` | **Specific** `input.restaurantId` |
| Update restaurant subscription | `admin.updateRestaurantSubscription` | Scope **unchanged** |
| Update user subscription | `admin.updateUserSubscriptionByAdmin` | Scope **unchanged** |
| Cancel / delete subscription | By `subscriptionId` | Scope of deleted row unchanged |
| Generate invoice | `admin.generateInvoicePDF` | Uses canonical user sub (any scope) |

### Admin creates both scope types

| Type | When |
|---|---|
| **Account-level (`0`)** | `createUserSubscriptionByAdmin` when target user has zero restaurants |
| **Restaurant-level (`> 0`)** | `createRestaurantSubscription`; `createUserSubscriptionByAdmin` with restaurant picker; self-service register |

### Admin UI scope selection

**Users tab:** If user has 1 restaurant, auto-selects it; if multiple, requires picker; if zero, omits `restaurantId` → resolves to `0` (`AdminManagement.tsx:188–216`).

**Restaurants tab:** Always creates restaurant-scoped subscription (`AdminManagement.tsx:918–925`).

---

## SECTION 7 — Real-World Mapping (Factual Examples)

### Example 1: Single restaurant owner (typical register)

```
User U
└─ Restaurant A (id=10)

Subscription S1 { userId: U, restaurantId: 10, status: trial, plan: Professional }
```

| Query / action | Result |
|---|---|
| `getSubscriptionForRestaurant(10)` | Returns S1 |
| `resolveOrderingSubscriptionRow(10, rows)` | Returns S1 |
| `resolvePlanLimitsForUser(U)` | Uses S1 (canonical among all rows) |
| `resolvePlanLimitsForUser(U, 10)` | Returns S1 |
| `isSubscriptionActive(U)` | true (if period valid) |
| `subscription.getByRestaurant(10)` | Shows S1 |
| MRR | 0 while trial; 1× plan price when active |

---

### Example 2: Multi-restaurant owner, account-level sub only

```
User U
├─ Restaurant A (id=10)
└─ Restaurant B (id=20)

Subscription S0 { userId: U, restaurantId: 0, status: active, plan: Professional }
```

| Query / action | Result |
|---|---|
| `resolvePlanLimitsForUser(U)` | Professional limits (maxRestaurants: 5) |
| `assertRestaurantCreateAllowed(U)` | Allowed until 5 restaurants |
| `resolveOrderingSubscriptionRow(10, rows)` | Returns S0 (fallback — no scoped row for 10) |
| `resolveOrderingSubscriptionRow(20, rows)` | Returns S0 (fallback) |
| `getSubscriptionForRestaurant(10)` | **undefined** (strict filter) |
| `subscription.getByRestaurant(10)` | **null** — Dashboard expiry warning absent |
| `getAllRestaurantsWithSubscriptions` | Both A and B show S0 (user-level fallback) |
| MRR | 1× Professional price |

---

### Example 3: Multi-restaurant owner, per-restaurant subs

```
User U
├─ Restaurant A (id=10)
└─ Restaurant B (id=20)

Subscription SA { userId: U, restaurantId: 10, status: active, plan: Basic }
Subscription SB { userId: U, restaurantId: 20, status: active, plan: Enterprise }
```

| Query / action | Result |
|---|---|
| `resolveOrderingSubscriptionRow(10, rows)` | Returns SA (scoped preferred) |
| `resolveOrderingSubscriptionRow(20, rows)` | Returns SB |
| `resolvePlanLimitsForUser(U, 10)` | Basic limits for A's categories/items |
| `resolvePlanLimitsForUser(U, 20)` | Enterprise limits for B's categories/items |
| `resolvePlanLimitsForUser(U)` | Canonical pick among SA/SB (best entitled by rank/period) — **one** plan's `maxRestaurants` |
| MRR | **2×** — both SA and SB counted if active |
| `getSubscriptionForRestaurant(10)` | SA only |

---

### Example 4: Scoped trial + account-level active (mixed)

```
User U
├─ Restaurant A (id=10)

Subscription S1 { restaurantId: 10, status: trial, plan: Professional }
Subscription S0 { restaurantId: 0, status: active, plan: Basic }
```

| Query / action | Result |
|---|---|
| `resolveOrderingSubscriptionRow(10, rows)` | S1 preferred over S0 (`subscription-resolver.test.ts:183–196`) |
| If S1 trial expired, S0 active | Ordering falls back to S0 if no entitled scoped row |
| `isSubscriptionActive(U)` | true (S0 or S1 entitled) |

---

### Example 5: Restaurant B with no scoped sub, only A scoped

```
User U
├─ Restaurant A (id=10) — SA scoped
└─ Restaurant B (id=20) — no scoped row

Subscription SA { restaurantId: 10, status: active, plan: Professional }
```

| Query / action | Result |
|---|---|
| `resolveOrderingSubscriptionRow(20, rows)` | **undefined** if no user-level row (`subscription-resolver.test.ts:213–216`) |
| `restaurantAllowsTableOrdering(20)` | false → ordering blocked for B |
| `getAllRestaurantsWithSubscriptions` for B | null unless user-level fallback exists |

---

## SECTION 8 — Scope Authority Model

**Conclusion: Candidate C — Hybrid model**

Evidence:

| Resolution mode | Used for | Scope rule |
|---|---|---|
| **Account-wide canonical** | Restaurant count limits, `getCurrentSubscription`, `checkTrialStatus`, invoices, payment activation fallback | Best row across **all** scopes |
| **Restaurant-scoped + user-level fallback** | Table ordering, category/item limits | Prefer `restaurantId = R`, else `restaurantId = 0` |
| **Strict restaurant-scoped** | `getSubscriptionForRestaurant`, `subscription.getByRestaurant` | **`restaurantId = R` only** — no fallback |
| **Any-row entitlement** | Premium templates/colors/fonts (`isSubscriptionActive`) | Scope **ignored** |
| **All active rows summed** | MRR | Each row counted independently |

There is **no single scope authority**. The meaning of `restaurantId` depends on which code path consumes the subscription row:

- **`0`** = account-level tag; acts as fallback for restaurant-specific resolution and as primary scope for users without restaurants.
- **`> 0`** = restaurant tag; preferred for that restaurant's ordering and per-venue quotas; required for strict per-restaurant API display.

The column is **immutable after insert**; scope is fixed at creation. Plan changes and activation update other fields on the same row without re-scoping.

---

## SECTION 9 — Initial Findings

1. **`user_subscriptions.restaurantId` is a scope tag**, not ownership. The subscription owner remains `userId` (PG-1A.3).

2. **`restaurantId = 0` means account-level** in code comments and resolver logic (`server/subscriptionResolver.ts:78`).

3. **`restaurantId > 0` means restaurant-scoped**, validated against `restaurants.userId` on admin writes.

4. **Scope is set only at INSERT** — no update path modifies `restaurantId`.

5. **Self-service registration creates restaurant-scoped trial** (`restaurantId = new restaurant`), not account-level (`server/auth-local/registerOwner.ts:149–153`).

6. **Standalone `createTrialSubscription(userId)` creates account-level trial** (`restaurantId = 0`) (`server/create-trial-subscription.ts:69`).

7. **Additional restaurants via `restaurant.create` do not create subscription rows** — entitlements come from existing rows.

8. **`resolveSubscriptionEntitlement` and `resolveTableOrderingEntitlement` do not interpret scope** — callers select the row first.

9. **`resolvePlanLimitsForUser` is dual-mode:** without `restaurantId` arg → account-wide; with arg → scoped + fallback.

10. **`resolveOrderingSubscriptionRow` implements scoped-first, user-level-fallback** — the core hybrid rule for ordering and per-venue quotas.

11. **`getSubscriptionForRestaurant` is strict scoped** — no fallback to `restaurantId = 0`.

12. **`subscription.getByRestaurant` and Dashboard expiry UI use strict scoped query** — account-level-only users see null per-restaurant subscription display.

13. **`getAllRestaurantsWithSubscriptions` uses hybrid display** — scoped row OR user-level fallback per restaurant card (`server/db.ts:760–762`).

14. **`isSubscriptionActive` / premium features ignore scope** — any entitled row on the account suffices.

15. **Restaurant count limits use account-wide canonical pick** — not per-restaurant scoped rows (`assertRestaurantCreateAllowed` → `resolvePlanLimitsForUser(userId)` without second arg).

16. **MRR counts every active row** regardless of scope — duplicate scoped rows for same user inflate MRR.

17. **Invoices use account-wide canonical subscription** — not restaurant-scoped row.

18. **Payment activation prefers user-level row** when no plan/restaurant filter matches (`subscriptionActivation.ts:41–42`).

19. **Admin can create both scope types:** `0` for users without restaurants; specific id for restaurant-scoped and onboarding flows.

20. **No `subscriptionScope` symbol or centralized scope registry exists** — behavior is distributed across resolver functions.

21. **Data integrity script R2** treats `restaurantId = r.id OR restaurantId = 0` as sufficient subscription coverage for a restaurant (`scripts/data-integrity-audit-phase2-readonly.mjs:214`).

22. **Another restaurant's scoped row is never used for ordering** on a different restaurant (`subscription-resolver.test.ts:213–216`).

---

*End of audit. No recommendations. No fixes. No code changes.*
