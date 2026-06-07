# COMMERCIAL-FLOW-AUDIT.md

**PG-1A.5 — Commercial Flow Audit**  
**Mode:** Read-only investigation  
**Branch:** main  
**Date:** 2026-06-05  

No code, schema, commits, fixes, or refactors were performed.

Builds on PG-1A.1 (plans/trial), PG-1A.2 (entitlements), PG-1A.3 (ownership), PG-1A.4 (scope).

---

## Search Target Summary

| Symbol | Found? | Primary location |
|---|---|---|
| `registerOwner` / `registerLocalOwner` | Yes | `server/auth-local/registerOwner.ts` |
| `buildTrialSubscriptionForUser` | Yes | `server/create-trial-subscription.ts:53` |
| `resolveTrialPlanId` | Yes | `server/create-trial-subscription.ts:19` |
| `createTrialSubscription` | Yes | `server/create-trial-subscription.ts:65` |
| `createRestaurant` | Yes | `server/db.ts:286`, `server/routers.ts:134` |
| `assertRestaurantCreateAllowed` | Yes | `server/subscriptionPlanLimits.ts:74` |
| `createRestaurantSubscription` | Yes | `server/routers.ts:855` |
| `createUserSubscriptionByAdmin` | Yes | `server/routers.ts:1025` |
| `activateSubscription` | **No symbol** | Uses `updateSubscriptionForActivation` |
| `changePlan` | **No symbol** | Admin/webhook `planId` updates |
| `generateInvoicePDF` | Yes | `server/routers.ts:1191` |
| `subscriptionContributesToCommercialRevenue` | Yes | `server/adminKpiCalculations.ts:4` |
| `computeAdminMrr` | Yes | `server/adminKpiCalculations.ts:33` |
| `getRevenueByMonth` | Yes | `server/db.ts:812` |
| `getCurrentSubscription` | Yes | `server/routers.ts:634` |
| `getSubscriptionForRestaurant` | Yes | `server/db.ts:436` |
| `subscription.getByRestaurant` | Yes | `server/routers.ts:641` |

---

## SECTION 1 — Owner Registration Flow

### Runtime path

```
POST /api/auth/register
  ↓ server/auth-local.ts:157–172
parseRegisterBody(req.body)
  ↓ registerLocalOwner(req, res, input)
  ↓ registerOwnerTransactional(input)     [DB transaction]
```

### Inside transaction (`registerOwnerTransactional`, `server/auth-local/registerOwner.ts:121–155`)

| Step | Table | Function | Row created |
|---|---|---|---|
| 1 | `users` | `tx.insert(users)` | 1 user row |
| 2 | `restaurants` | `tx.insert(restaurants)` | 1 restaurant row |
| 3 | `user_subscriptions` | `tx.insert(userSubscriptions)` | 1 subscription row |

### User row (`users`)

| Field | Value |
|---|---|
| `openId` | `local_{email}` |
| `email` | Input email |
| `role` | `"user"` |
| `loginMethod` | `"email"` |
| `passwordHash` | bcrypt hash |

**Lines:** `registerOwner.ts:122–130`

### Restaurant row (`restaurants`)

| Field | Value |
|---|---|
| `userId` | New user id |
| `slug` | Generated from restaurant name + nanoid |
| `nameAr` | Input `restaurantName` |
| `ownerEmail` | Input email |
| `isActive` | `true` |

**Lines:** `registerOwner.ts:136–143`

### Subscription row (`user_subscriptions`)

| Field | Value | Source |
|---|---|---|
| `userId` | New user id | Argument |
| `restaurantId` | **New restaurant id** (scoped) | `buildTrialSubscriptionForUser(userId, restaurantId)` |
| `planId` | Professional (`sortOrder === 2`) | `resolveTrialPlanId()` |
| `status` | `"trial"` | `buildTrialSubscriptionPayload` |
| `billingCycle` | `"monthly"` | Payload default |
| `currentPeriodStart` | Now | Payload |
| `currentPeriodEnd` | Now + 14 days | Payload |
| `trialEndsAt` | Now + 14 days | Payload |

**Trial builder chain:**

```
buildTrialSubscriptionForUser(userId, restaurantId)
  ↓ resolveTrialPlanId()                    [server/create-trial-subscription.ts:19–27]
  ↓ buildTrialSubscriptionPayload(...)      [server/create-trial-subscription.ts:29–49]
  ↓ tx.insert(userSubscriptions).values(trialPayload)
```

**Lines:** `registerOwner.ts:149–153`, `create-trial-subscription.ts:53–58`

### Post-transaction (`registerLocalOwner`, `registerOwner.ts:174–214`)

| Action | Effect |
|---|---|
| `sdk.createSessionToken` + `setSessionCookie` | Session created |
| `sendVerificationEmailForUser` | Verification email (non-commercial) |
| `logSuccessfulLogin` | Audit log |
| **No invoice row** | — |
| **No notification row** on register | — |

**Response:** `{ success, user, verificationEmailSent }` — `auth-local.ts:176–180`

### Resolvers executed at registration

None for entitlements. `resolveTrialPlanId` reads `subscription_plans` catalog only.

---

## SECTION 2 — Trial Lifecycle Flow

### Trial start

Created at registration (Section 1) or via:

| Path | `restaurantId` | File |
|---|---|---|
| `createTrialSubscription(userId)` | Default **`0`** | `create-trial-subscription.ts:65–75` |
| `admin.createUserSubscriptionByAdmin` with `status: trial` | Resolved scope | `routers.ts:1025–1060` |

### Trial active (runtime)

Entitlement is **computed at read time**, not stored as a separate state machine.

```
resolveSubscriptionEntitlement(sub, now)
  ↓ status === "trial"
  ↓ parse trialEndsAt
  ↓ now < trialEnd → isEntitled: true
```

**File:** `server/subscriptionEntitlement.ts:56–79`

**Consumers during active trial:**

| Check | Resolver | Scope |
|---|---|---|
| Premium features | `isSubscriptionActive(userId)` → `userHasSubscriptionEntitlement` | Any entitled row |
| Ordering | `restaurantAllowsTableOrdering` → `resolveTableOrderingEntitlement` | Scoped + fallback |
| Limits | `resolvePlanLimitsForUser` | Account-wide or per-restaurant |
| MRR | `subscriptionContributesToCommercialRevenue("trial")` → **false** | — |

**UI probe:** `subscription.checkTrialStatus` → `{ isActive, trialEndDate }` — `routers.ts:651–654`, `db.ts:515–523`

### Trial expiry

**How expiry is determined:**

| Mechanism | Behavior |
|---|---|
| **Runtime period check** | `now >= trialEndsAt` → `resolveSubscriptionEntitlement` returns `period_expired`, `isEntitled: false` |
| **DB status field** | Remains `"trial"` unless manually updated |

**No automatic status transition found:** No cron jobs, no background worker sets `status = "expired"` when `trialEndsAt` passes. Grep for `status: "expired"` assignment in server code returned no writers except admin update inputs.

**Resolvers that detect post-expiry trial:**

| Resolver | Effect after trialEndsAt elapsed |
|---|---|
| `resolveSubscriptionEntitlement` | `isEntitled: false`, reason `period_expired` |
| `isSubscriptionActive` | false (if no other entitled row) |
| `userHasSubscriptionEntitlement` | false for that row |
| `resolveTableOrderingEntitlement` | Deny (base entitlement fails) |
| `resolvePlanLimitsForUser` | Falls back to Basic limits |
| `assertSubscriptionEligibleForAdminInvoice` | Still blocks if status is `"trial"` (status-based, not period-based) |

**Rows modified automatically on expiry:** **None.**

**Admin can set `status: "expired"`** via `admin.updateRestaurantSubscription` or `admin.updateUserSubscriptionByAdmin` — `routers.ts:891`, `1086`.

---

## SECTION 3 — Restaurant Creation Flow

### Owner path

```
trpc.restaurant.create
  ↓ verifiedProcedure
  ↓ if role !== admin → assertRestaurantCreateAllowed(ctx.user.id)
  ↓ createRestaurant({ userId: ctx.user.id, slug, ... })
```

**File:** `server/routers.ts:104–148`

### Tables touched

| Table | Operation |
|---|---|
| `restaurants` | **INSERT** one row |
| `user_subscriptions` | **No change** |
| `invoices` | **No change** |

### Limit check (non-admin)

```
assertRestaurantCreateAllowed(userId)
  ↓ getRestaurantsByUser(userId)           → count existing
  ↓ resolvePlanLimitsForUser(userId)       → account-wide canonical (no restaurantId arg)
  ↓ compare count vs maxRestaurants
```

**File:** `subscriptionPlanLimits.ts:74–82`

### Subscription / scope effects

| Aspect | Effect |
|---|---|
| New subscription row | **Not created** |
| Existing subscription scope | **Unchanged** |
| Entitlements for new restaurant | Inherited from owner's existing rows via resolver fallback |

### Admin restaurant create

```
resolveAdminRestaurantOwnerUserId(...)  → target owner userId
assertRestaurantCreateAllowed SKIPPED
createRestaurant({ userId: ownerUserId, ... })
```

**Lines:** `routers.ts:119–128`

Admin onboarding UI may additionally call `admin.createRestaurantSubscription` with the new restaurant id — `client/src/pages/AdminManagement.tsx:918–925`.

---

## SECTION 4 — Subscription Activation Flow

### A. Self-service payment upgrade (PayPal)

```
Pricing.tsx → subscription.createCheckoutSession
  ↓ createPayPalOrder({ userId, planId, ... })   [external — no DB sub change]
  ↓ User completes PayPal checkout
  ↓ PayPal webhook → handlePayPalWebhook
  ↓ capturePayPalOrder
  ↓ updateSubscriptionForActivation(userId, {
       planId, status: "active", stripeSubscriptionId: orderId,
       currentPeriodStart, currentPeriodEnd (+1 month),
       trialEndsAt: null
     }, { planId })
```

**Files:** `routers.ts:657–684`, `paypal-webhook.ts:108–118`

| Before | After (same row, updated) |
|---|---|
| `status: trial`, `planId: Professional` | `status: active`, `planId: purchased plan` |
| `trialEndsAt: date` | `trialEndsAt: null` |
| `restaurantId: R` | **Unchanged** |
| `userId` | **Unchanged** |

**Row selection:** `resolveSubscriptionForActivationFromRows` — priority: subscriptionId → restaurantId → planId match → user-level (`0`) → canonical — `subscriptionActivation.ts:17–44`

**No new subscription row** on PayPal activation.

### B. Self-service payment upgrade (Tap)

```
subscription.createTapCheckout
  ↓ createTapCharge(metadata: user_id, plan_id, subscription_id, billing_cycle)
  ↓ Tap webhook CAPTURED
  ↓ updateSubscriptionById(subId, { status: active, periods })  OR
     updateSubscriptionForActivation(uid, { status: active, periods }, { planId })
```

**File:** `tap-webhook.ts:82–120`

**Tap activation payload:** Updates `status`, `currentPeriodStart`, `currentPeriodEnd` only. Does **not** set `planId` or clear `trialEndsAt` on `updateSubscriptionById` path.

### C. Admin create subscription (restaurant-scoped)

```
admin.createRestaurantSubscription
  ↓ resolveRestaurantOwnerUserId(restaurantId)
  ↓ getSubscriptionForRestaurant(restaurantId) — conflict if exists
  ↓ INSERT user_subscriptions {
       userId: ownerUserId,
       restaurantId: input.restaurantId,
       planId, status: "active", billingCycle, periods
     }
```

**File:** `routers.ts:855–883`

| Before | After |
|---|---|
| No row for restaurant | **New row** inserted |
| — | `restaurantId = specific`, `status = active` |

### D. Admin create subscription (user-scoped)

```
admin.createUserSubscriptionByAdmin
  ↓ getCanonicalUserSubscription — conflict if any row exists
  ↓ resolveSubscriptionRestaurantIdForUser(userId, restaurantId?)
  ↓ INSERT user_subscriptions { userId, restaurantId: 0 or specific, planId, status }
  ↓ createNotification(subscription_created)
```

**File:** `routers.ts:1025–1079`

### E. Admin change plan / status

```
admin.updateRestaurantSubscription(subscriptionId, { planId?, status?, billingCycle?, subscriptionEndDate? })
admin.updateUserSubscriptionByAdmin(userId, { planId?, status?, ... })
  ↓ updateSubscriptionById(id, updateData)
  ↓ createNotification(subscription_updated)   [user-scoped path only]
```

**Files:** `routers.ts:886–904`, `1081–1129`

| Field | Can change? |
|---|---|
| `planId` | Yes |
| `status` | Yes (incl. `trial`, `active`, `expired`, `canceled`) |
| `billingCycle` | Yes |
| Period fields / `trialEndsAt` | Yes (via `applyAdminTrialStatusUpdate`) |
| `restaurantId` | **No** — never in updateData |
| `userId` | **No** |

### F. Cancel

```
cancelSubscriptionById(id)
  ↓ UPDATE status: "canceled", canceledAt: now
```

**File:** `db.ts:737–743`

### G. Client success page (no activation)

`SubscriptionSuccess.tsx` polls `subscription.getCurrentSubscription` after payment redirect. It does **not** call an activation mutation. Activation depends on webhook completing first.

**File:** `client/src/pages/SubscriptionSuccess.tsx:21–60`

---

## SECTION 5 — Invoice Flow

### Invoice creation (admin only)

```
admin.generateInvoicePDF({ userId, subscriptionId, markAsPaid? })
  ↓ assertAdminAccess
  ↓ getUserById(userId)
  ↓ getCanonicalUserSubscription(userId)        ← ignores input.subscriptionId for sub selection
  ↓ assertSubscriptionEligibleForAdminInvoice(sub.status)  ← blocks trial
  ↓ getSubscriptionPlanById(sub.planId)
  ↓ createInvoice({ userId, subscriptionId: sub.id, amount, currency: USD, status, ... })
  ↓ generateInvoicePDFBuffer(...)
  ↓ putUploadedFile → updateInvoice(pdfUrl)
```

**File:** `server/routers.ts:1191–1254`

### Invoice row created (`invoices`)

| Field | Source |
|---|---|
| `userId` | `input.userId` |
| `subscriptionId` | Canonical sub `.id` (not necessarily `input.subscriptionId`) |
| `amount` | Plan price from canonical sub's `billingCycle` |
| `currency` | `"USD"` hardcoded |
| `status` | `"pending"` or `"paid"` if `markAsPaid` |
| `invoiceNumber` | `INV-{timestamp}-{userId}` |

**No `restaurantId` column** on invoices.

### Ownership chain

```
Invoice
├─ userId → users.id
└─ subscriptionId → user_subscriptions.id
     ├─ userId → users.id
     ├─ restaurantId → scope tag (not on invoice)
     └─ planId → subscription_plans.id
```

Restaurant linkage: **indirect only** via subscription's `restaurantId` if scoped.

### Invoice retrieval

| Route | Access | Query |
|---|---|---|
| `invoice.list` | Owner | `getInvoicesByUser(ctx.user.id)` — `routers.ts:741–742` |
| `invoice.getById` | Owner, `invoice.userId === ctx.user.id` | `routers.ts:745–750` |
| `invoice.getUnpaid` | Owner | `db.ts:603–611` |
| `admin.getUserInvoices` | Admin | `getInvoicesByUser(input.userId)` — `routers.ts:1258–1262` |

**Client:** `PaymentHistory.tsx` uses `invoice.list` + `subscription.getCurrentSubscription`.

### Invoice reporting

Invoices are **not** inputs to MRR or `getRevenueByMonth`. Revenue metrics read `user_subscriptions` + `subscription_plans` directly.

---

## SECTION 6 — MRR Flow

### Pipeline

```
admin.getStatistics
  ↓ getAdminStatistics()                    [server/db.ts:775–809]
  ↓ computeAdminMrr(allSubs, allPlans)      [server/adminKpiCalculations.ts:33–42]
  ↓ returns totalRevenue → Admin KPI UI
```

### Revenue eligibility

```
subscriptionContributesToCommercialRevenue(status)
  → status === "active" ONLY
```

**File:** `server/adminKpiCalculations.ts:4–5`

| Status | Counts toward MRR? |
|---|---|
| `active` | **Yes** |
| `trial` | **No** |
| `canceled` | **No** |
| `expired` | **No** |
| Trial past `trialEndsAt` but status still `trial` | **No** (status gate, not period gate) |

### MRR calculation

```
For each sub where status === "active":
  plan = plans.find(p => p.id === sub.planId)
  monthly = billingCycle === yearly ? priceYearly/12 : priceMonthly
  sum += monthly
```

**Scope handling:** `restaurantId` is **ignored**. Each `active` row contributes independently.

**Multiple active rows same user:** All counted → potential MRR inflation (PG-1A.4).

### Revenue by month (`getRevenueByMonth`)

```
For each business-calendar month bucket:
  Filter subs where:
    subscriptionContributesToCommercialRevenue(status)  [active only]
    AND createdAt in that month
  Sum monthlyEquivalentPlanPrice per row
```

**File:** `server/db.ts:812–844`

**Note:** Uses `createdAt` month of subscription row, not `currentPeriodStart` or payment date. Not invoice-based.

### Other admin stats (non-MRR)

| Metric | Source |
|---|---|
| `activeSubscribers` | Count where `status === 'active' \|\| status === 'trial'` |
| `trialSubscribers` | Count where `status === 'trial'` |
| `expiredSubscribers` | Count where `status === 'expired'` (DB status field) |
| `subscriptionsByPlan` | Count active **or** trial per planId |

**File:** `db.ts:782–808`

---

## SECTION 7 — Feature Entitlement Flow

### Restaurant creation

```
restaurant.create
  ↓ [admin bypass OR]
  ↓ assertRestaurantCreateAllowed(userId)
      ↓ getRestaurantsByUser → count
      ↓ resolvePlanLimitsForUser(userId)          ← NO restaurantId arg (account-wide)
      ↓ pickCanonicalSubscription(all user rows)
      ↓ resolveSubscriptionEntitlement → plan.maxRestaurants
```

**Admin bypass:** `ctx.user.role === "admin"` skips limit — `routers.ts:119–120`

---

### Table ordering

```
order.canOrder / order.create
  ↓ restaurantAllowsTableOrdering(restaurantId)
      ↓ getRestaurantById → owner userId
      ↓ getSubscriptionsByUser(ownerUserId)
      ↓ resolveOrderingSubscriptionRow(restaurantId, rows)   ← scoped first, then restaurantId=0
      ↓ getSubscriptionPlanById(sub.planId)
      ↓ resolveTableOrderingEntitlement(sub, plan)
          ↓ resolveSubscriptionEntitlement(sub)
          ↓ plan.id === 30001 ? deny
```

**Files:** `db.ts:716–721`, `subscriptionEntitlement.ts:117–147`

**Scope:** Hybrid (PG-1A.4). **Admin bypass:** None on ordering.

---

### Premium templates

```
restaurant.updateTemplate (premium template id)
  ↓ assertRestaurantAccess
  ↓ [admin bypass OR]
  ↓ isSubscriptionActive(ctx.user.id)
      ↓ getSubscriptionsByUser
      ↓ userHasSubscriptionEntitlement(rows)    ← ANY entitled row, scope ignored
```

**Files:** `routers.ts:234–242`, `db.ts:515–517`

**Client:** `TemplateSelector.tsx` → `checkTrialStatus` + `role === admin`

---

### Category limits

```
category.create
  ↓ assertRestaurantAccess
  ↓ [admin bypass OR]
  ↓ assertCategoryCreateAllowed(userId, restaurantId)
      ↓ resolvePlanLimitsForUser(userId, restaurantId)   ← scoped + fallback to 0
      ↓ getRestaurantStats(restaurantId) → compare maxCategories
```

**File:** `subscriptionPlanLimits.ts:85–96`, `routers.ts:369–373`

---

### Menu item limits

```
menuItem.create
  ↓ assertRestaurantAccess
  ↓ [admin bypass OR]
  ↓ assertMenuItemCreateAllowed(userId, restaurantId)
      ↓ resolvePlanLimitsForUser(userId, restaurantId)
      ↓ getRestaurantStats → compare maxItemsPerRestaurant
```

**File:** `subscriptionPlanLimits.ts:99–110`, `routers.ts:449–450`

---

## SECTION 8 — Admin Commercial Flow

### Admin account

| Action | Commercial effect |
|---|---|
| `admin.createSubscriberAccount` | Creates `users` row only — **no** restaurant or subscription |
| Admin `role === "admin"` | Parallel bypass on limits, premium features, tenant access |

**File:** `routers.ts:790–817`

### Admin subscription actions

| Mutation | Creates row? | Updates row? | Scope |
|---|---|---|---|
| `createRestaurantSubscription` | Yes | — | Specific `restaurantId` |
| `createUserSubscriptionByAdmin` | Yes | — | `0` or specific |
| `updateRestaurantSubscription` | — | Yes | Unchanged |
| `updateUserSubscriptionByAdmin` | — | Yes | Unchanged |
| `cancelRestaurantSubscription` | — | status→canceled | — |
| `deleteRestaurantSubscription` | Deletes sub + invoices | — | — |
| `deleteUserSubscriptionByAdmin` | Cascade delete canonical sub | — | — |

### Admin invoice actions

| Mutation | Effect |
|---|---|
| `generateInvoicePDF` | INSERT invoice + PDF upload |
| `getUserInvoices` | Read invoices by userId |

**Trial block:** `assertSubscriptionEligibleForAdminInvoice` rejects `status === "trial"`.

### Admin restaurant actions

| Mutation | Limit check | Subscription effect |
|---|---|---|
| `restaurant.create` (admin) | **Skipped** | No auto sub unless UI calls `createRestaurantSubscription` |
| Admin create restaurant + plan UI | Skipped | Creates restaurant then `createRestaurantSubscription` |

### Admin reporting

| Route | Data |
|---|---|
| `admin.getStatistics` | MRR, subscriber counts |
| `admin.getRevenueByMonth` | Monthly active-sub revenue by createdAt |
| `admin.getSubscriptionDetails` | Sub list with first restaurant per user |
| `admin.listAllRestaurantsWithSubscriptions` | Restaurant + scoped/fallback sub |
| `admin.listAllUsersWithSubscriptions` | User + first sub row + restaurants |

---

## SECTION 9 — End-to-End Scenarios

### Scenario A: New owner self-service (happy path)

```
1. POST /api/auth/register
   CREATE users (role=user)
   CREATE restaurants (userId=U, id=R)
   CREATE user_subscriptions (userId=U, restaurantId=R, status=trial, planId=Professional)

2. Trial active (days 1–14)
   isSubscriptionActive(U) → true
   restaurantAllowsTableOrdering(R) → true (Professional plan)
   resolvePlanLimitsForUser(U) → Professional maxRestaurants=5
   MRR → 0 (trial excluded)

3. Owner creates 2nd restaurant via restaurant.create
   CREATE restaurants (userId=U, id=R2)
   user_subscriptions unchanged
   assertRestaurantCreateAllowed uses canonical trial row → allowed if under limit

4. Owner upgrades via Tap/PayPal (Pricing page)
   createCheckoutSession / createTapCheckout → external payment only
   Webhook → UPDATE user_subscriptions SET status=active, planId=purchased, trialEndsAt=null
   restaurantId remains R

5. Admin generates invoice
   getCanonicalUserSubscription(U) → activated row
   CREATE invoices (userId=U, subscriptionId=sub.id, status=pending/paid)
   MRR → +1× plan monthly price (status=active)

6. Trial period passes without payment
   status still "trial" in DB
   resolveSubscriptionEntitlement → period_expired at read time
   isSubscriptionActive → false
   MRR → still 0 (status not active)
```

---

### Scenario B: Admin-onboarded restaurant

```
1. admin.createSubscriberAccount → CREATE users only

2. Admin creates restaurant + subscription (AdminManagement UI)
   CREATE restaurants (userId=U, id=R)
   admin.createRestaurantSubscription → CREATE user_subscriptions
     (userId=U, restaurantId=R, status=active, planId=selected)

3. MRR immediately includes this row (status=active)

4. admin.generateInvoicePDF(U, ...) → CREATE invoice linked to canonical sub
```

---

### Scenario C: Multi-restaurant, account-level sub only

```
1. User U has Restaurant A, B
   Single sub: { restaurantId: 0, status: active, plan: Professional }

2. Ordering on A and B
   resolveOrderingSubscriptionRow(A) → falls back to sub (restaurantId=0)
   resolveOrderingSubscriptionRow(B) → same fallback

3. subscription.getByRestaurant(A)
   getSubscriptionForRestaurant(A) → null (strict scoped query)
   Dashboard expiry warning for A → absent

4. admin.listAllRestaurantsWithSubscriptions
   Both A and B display the account-level sub (fallback)

5. MRR → 1× Professional (one active row)
```

---

### Scenario D: Payment activation row selection

```
User U has:
  S1 { restaurantId: 10, status: trial, planId: 2 }
  S0 { restaurantId: 0, status: trial, planId: 2 }

PayPal webhook with planId=3:
  updateSubscriptionForActivation(U, { planId: 3, status: active }, { planId: 3 })
  → resolveSubscriptionForActivationFromRows filters planId=3 → no match
  → pickUserLevelSubscription → activates S0 if plan matches, else canonical

restaurantId on activated row: UNCHANGED
```

---

## SECTION 10 — Initial Findings

1. **Registration atomically creates three commercial rows** in one transaction: user, restaurant, restaurant-scoped trial subscription.

2. **Trial assignment uses Professional plan** via `resolveTrialPlanId()` (`sortOrder === 2`), 14-day `trialEndsAt` and `currentPeriodEnd`.

3. **Self-service registration sets `restaurantId` to the new restaurant id**, not `0`.

4. **Trial expiry is enforced at resolver read time** via `trialEndsAt`; DB `status` stays `"trial"` unless admin updates it.

5. **No background job** transitions trial → expired or active automatically.

6. **`status === "expired"` is only writable via admin update mutations** — not auto-set on period lapse.

7. **Additional restaurants do not create subscription rows**; entitlements flow from existing user subscriptions.

8. **Payment checkout creates no DB subscription changes** until webhook fires.

9. **PayPal activation updates** `planId`, `status`, periods, clears `trialEndsAt`; **Tap by-id activation updates** status and periods only (may leave `trialEndsAt` and `planId` unchanged).

10. **`restaurantId` is never modified** after subscription insert across all activation and admin edit paths.

11. **Invoices are admin-generated only**; linked to `userId` + canonical `subscriptionId`; no restaurant column.

12. **MRR counts only `status === "active"`** rows; trials excluded even if period-valid.

13. **MRR sums every active row** without deduplication by user or scope.

14. **`getRevenueByMonth` uses subscription `createdAt` month**, not billing period or invoice date.

15. **Feature resolver scope varies by feature:** account-wide (restaurant count, premium UX), hybrid (ordering, item/category limits), strict scoped (`getByRestaurant` display).

16. **Admin bypasses limit and premium checks** but not ordering entitlement or MRR rules.

17. **`SubscriptionSuccess` page does not activate subscriptions** — it polls `getCurrentSubscription` after webhook.

18. **`generateInvoicePDF` ignores input `subscriptionId`** for plan/amount; uses `getCanonicalUserSubscription`.

19. **Admin create user subscription sends `subscription_created` notification**; payment webhooks send owner email notifications.

20. **Commercial lifecycle is row-mutation based:** CREATE at register/admin-create; UPDATE at payment/admin-edit/cancel; DELETE via admin cascade; no separate commercial state table.

---

*End of audit. No recommendations. No fixes. No code changes.*
