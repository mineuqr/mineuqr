# COMMERCIAL-DATA-MODEL-AUDIT.md

**PG-1A.3 — Commercial Data Model Audit**  
**Mode:** Read-only investigation  
**Branch:** main  
**Date:** 2026-06-05  

No code, schema, commits, fixes, or refactors were performed.

---

## Search Target Summary

| Term | Found? | Notes |
|---|---|---|
| `users` | Yes | `drizzle/schema.ts:134–153` |
| `restaurants` | Yes | `drizzle/schema.ts:57–91` |
| `user_subscriptions` | Yes | `drizzle/schema.ts:116–131` |
| `subscription_plans` | Yes | `drizzle/schema.ts:94–113` |
| `invoices` | Yes | `drizzle/schema.ts:175–189` |
| `orders` | Yes | `drizzle/schema.ts:289–308` |
| `restaurant_users` | **No** | — |
| `restaurant_members` | **No** | — |
| `ownerId` | **No column** | Ownership = `restaurants.userId` |
| `userId` | Yes | On `restaurants`, `user_subscriptions`, `invoices`, `renewal_notifications`, `auth_tokens` |
| `restaurantId` | Yes | On `user_subscriptions`, menu entities, `orders`, etc. |
| `subscriptionId` | Yes | On `invoices`, `renewal_notifications` |
| `planId` | Yes | On `user_subscriptions` |
| `tenantId` | **No** | Tenant boundary = `restaurants.userId` in app code |
| `organizationId` | **No** | — |

**Drizzle relations file:** `drizzle/relations.ts` exists but is empty (no declared ORM relations).  
**Database FK constraints:** Migrations define columns only; no `FOREIGN KEY` constraints found in `drizzle/*.sql`.

---

## PRIMARY QUESTION — Real Ownership Chain

**Implemented model:**

```
User
├─ Restaurants          (restaurants.userId → users.id, 1→Many)
├─ Subscriptions        (user_subscriptions.userId → users.id, 1→Many rows)
│   ├─ Plan             (user_subscriptions.planId → subscription_plans.id)
│   └─ Restaurant scope (user_subscriptions.restaurantId, optional; 0 = account-level)
├─ Invoices             (invoices.userId + invoices.subscriptionId)
└─ Notifications        (renewal_notifications.userId, optional subscriptionId)

Restaurant
├─ Menu / tables / orders / offers / holidays (restaurantId FK columns, app-enforced)
└─ Indirect subscription lookup via owner userId (not a direct restaurant→subscription FK)
```

**Not implemented:** `Restaurant → Subscription → User` as primary ownership. Subscriptions are **user-owned rows** with an optional **restaurant scope column**, not restaurant-owned rows.

---

## SECTION 1 — Entity Inventory

### Core commercial entities

| Table | Primary Key | Important FK columns (logical) | Purpose |
|---|---|---|---|
| `users` | `id` | — | Account identity, auth, role (`user` \| `admin`) |
| `restaurants` | `id` | `userId` → owner user | Tenant / venue; QR menu host |
| `subscription_plans` | `id` | — | Global plan catalog (prices, limits) |
| `user_subscriptions` | `id` | `userId`, `planId`, `restaurantId` | Per-user subscription state |
| `invoices` | `id` | `userId`, `subscriptionId` | Billing documents |
| `orders` | `id` | `restaurantId`, `tableId` | Customer table orders |
| `order_items` | `id` | `orderId`, `menuItemId` | Line items on orders |
| `renewal_notifications` | `id` | `userId`, `subscriptionId` (nullable) | User notifications incl. billing / orders |

**Schema location:** `drizzle/schema.ts`

### Restaurant-scoped operational entities (commercial-adjacent)

| Table | Primary Key | FK column | Purpose |
|---|---|---|---|
| `categories` | `id` | `restaurantId` | Menu categories |
| `menu_items` | `id` | `categoryId`, `restaurantId` | Menu items |
| `offers` | `id` | `restaurantId` | Promotional offers |
| `restaurant_tables` | `id` | `restaurantId` | Dining tables / QR targets |
| `restaurant_holidays` | `id` | `restaurantId` | Closure schedule |

### Reference / auth entities

| Table | Primary Key | FK column | Purpose |
|---|---|---|---|
| `countries_currencies` | `id` | — | Country/currency reference |
| `auth_tokens` | `id` | `userId` | Password reset / email verify tokens |

### Migration origins (selected)

| Table | First migration |
|---|---|
| `users`, `restaurants`, `subscription_plans`, `user_subscriptions` | `drizzle/0000_shiny_blizzard.sql` |
| `user_subscriptions.restaurantId` | `drizzle/0004_wooden_anthem.sql` |
| `invoices` | `drizzle/0002_cold_weapon_omega.sql` |
| `orders`, `order_items` | Later migrations (see `drizzle/schema.ts`) |

---

## SECTION 2 — Ownership Map (User ↔ Restaurant)

### Relationship type: **1 → Many**

| Aspect | Implementation |
|---|---|
| Owner column | `restaurants.userId` (`drizzle/schema.ts:59`) |
| List owned restaurants | `getRestaurantsByUser(userId)` — `server/db.ts:266–269` |
| Tenant access check | `assertRestaurantAccess` — `restaurant.userId === ctx.user.id` (`server/restaurantAccess.ts:24`) |
| Admin override | Admin role bypasses ownership check (`server/restaurantAccess.ts:24`) |

**No many-to-many:** No `restaurant_users`, `restaurant_members`, or co-owner table exists.

**Owner semantics:** "Owner" is not a DB role. It is the user whose `id` equals `restaurants.userId`. User role enum is only `user` \| `admin` (`drizzle/schema.ts:145`).

**Denormalized owner contact:** `restaurants.ownerEmail` (`drizzle/schema.ts:67`) — informational; not used as ownership key.

---

## SECTION 3 — Subscription Ownership

### Who owns subscriptions?

**Answer: the User (`user_subscriptions.userId`).**

Each subscription row stores:

| Column | Role |
|---|---|
| `userId` | **Owner** of the subscription row |
| `planId` | Selected plan from catalog |
| `restaurantId` | **Scope marker** — specific restaurant id, or **`0` = account-level** |

**Schema:** `drizzle/schema.ts:116–131`

### Lookup patterns

| Function | File:line | Query pattern |
|---|---|---|
| `getSubscriptionsByUser(userId)` | `server/db.ts:421–428` | `WHERE userId = ?` ORDER BY id DESC |
| `getSubscriptionForRestaurant(restaurantId)` | `server/db.ts:436–443` | `WHERE restaurantId = ?` → canonical pick |
| `getCanonicalUserSubscription(userId)` | `server/db.ts:450–452` | All user rows → `pickCanonicalSubscription` |
| `getOrderingSubscriptionForRestaurant(restaurantId)` | `server/db.ts:709–713` | Owner `userId` from restaurant → `resolveOrderingSubscriptionRow` |
| `pickUserLevelSubscription(rows)` | `server/subscriptionResolver.ts:79–86` | Filter `restaurantId === 0` |
| `resolveOrderingSubscriptionRow(restaurantId, rows)` | `server/subscriptionResolver.ts:92–102` | Restaurant-scoped first, then user-level (`0`) |

### Subscription ↔ restaurant integrity (application-level)

| Check | Location |
|---|---|
| Admin create restaurant-scoped sub: `restaurant.userId` must match resolved owner | `server/adminSubscriptionHelpers.ts:130–144` |
| Admin create user sub: if `restaurantId > 0`, must belong to user | `server/adminSubscriptionHelpers.ts:105–114` |
| Admin update sub: if `restaurantId > 0`, `sub.userId === restaurant.userId` | `server/adminSubscriptionHelpers.ts:187–197` |
| User-level sub allowed only when user has zero restaurants | `server/adminSubscriptionHelpers.ts:94–102`, `118–120` |

### Multiple rows per user

A user may have **multiple** `user_subscriptions` rows (different `restaurantId` and/or duplicate history). Canonical selection uses `pickCanonicalSubscription` (`server/subscriptionResolver.ts:70–75`), not SQL uniqueness.

**Self-service registration** creates one row scoped to the first restaurant (`restaurantId = newRestaurantId`).  
**Additional restaurants** via `restaurant.create` do **not** auto-create subscription rows.

---

## SECTION 4 — Plan Ownership

### How `subscription_plans` connects

| Connection | Direction | Mechanism |
|---|---|---|
| Plan → Subscription | 1 → Many | `user_subscriptions.planId` |
| Plan → User | **None direct** | Via subscription row |
| Plan → Restaurant | **None direct** | Via subscription row's `restaurantId` scope |

**Plan catalog is global.** No per-user or per-restaurant plan ownership. Plans are seeded/read via:

| Function | File:line |
|---|---|
| `getSubscriptionPlans()` | `server/db.ts:399–401` |
| `getSubscriptionPlanById(id)` | `server/db.ts:404–408` |
| Seed script | `server/seed-plans.mjs` |

**Trial plan assignment:** `resolveTrialPlanId()` picks Professional (`sortOrder === 2`) — `server/create-trial-subscription.ts:19–27`.

**Plans are not owned by users or restaurants.** They are reference data joined at query time:

```typescript
// Example: subscription.getCurrentSubscription
const subscription = await getCanonicalUserSubscription(ctx.user.id);
const plan = await getSubscriptionPlanById(subscription.planId);
// server/routers.ts:634–638
```

---

## SECTION 5 — Invoice Ownership

### Schema ownership path

```
Invoice
├─ userId          (direct owner — invoices.userId)
└─ subscriptionId  (linked subscription row — invoices.subscriptionId)
```

**No `restaurantId` on `invoices`.** Restaurant linkage is indirect: subscription → `restaurantId` column (if scoped) or user → restaurants.

**Schema:** `drizzle/schema.ts:175–189`  
**Migration:** `drizzle/0002_cold_weapon_omega.sql:1–15`

### Invoice generation flow

```
admin.generateInvoicePDF
  ↓ assertAdminAccess (admin operator)
  ↓ getUserById(input.userId)
  ↓ getCanonicalUserSubscription(input.userId)   ← NOT input.subscriptionId for amount/plan
  ↓ assertSubscriptionEligibleForAdminInvoice(sub.status)  ← blocks trial
  ↓ getSubscriptionPlanById(sub.planId)
  ↓ createInvoice({ userId, subscriptionId: sub.id, amount, ... })
  ↓ generateInvoicePDFBuffer(...)
  ↓ updateInvoice(pdfUrl)
```

**Locations:** `server/routers.ts:1191–1254`, `server/db.ts:590–594`, `server/adminSubscriptionHelpers.ts:204–213`

**Note:** Input includes `subscriptionId` but generation uses **canonical user subscription** for plan/amount (`routers.ts:1205`), not necessarily the input `subscriptionId`.

### Invoice lookup flow

| Route | Access | Query |
|---|---|---|
| `invoice.list` | Owner (`ctx.user.id`) | `getInvoicesByUser(ctx.user.id)` — `server/routers.ts:741–742`, `server/db.ts:577–580` |
| `invoice.getById` | Owner; `invoice.userId === ctx.user.id` | `server/routers.ts:745–750` |
| `invoice.getUnpaid` | Owner | `getUnpaidInvoices(ctx.user.id)` — `server/db.ts:603–611` |
| `admin.getUserInvoices` | Admin | `getInvoicesByUser(input.userId)` — `server/routers.ts:1258–1262` |

### Invoice reporting flow

Invoices are **not** included in MRR calculations. MRR uses `user_subscriptions` + `subscription_plans` via `computeAdminMrr` (`server/adminKpiCalculations.ts:33–42`, `server/db.ts:779–787`).

### Cascade delete

| Trigger | Behavior |
|---|---|
| Delete subscription | Deletes invoices where `subscriptionId` matches — `server/db/cascadeDeletes.ts:111` |
| Delete user | Deletes all invoices where `userId` matches — `server/db/cascadeDeletes.ts:231` |

---

## SECTION 6 — Order Ownership

### Schema ownership path

```
Order
├─ restaurantId   (required — orders.restaurantId)
├─ tableId        (restaurant_tables.id)
└─ tableNumber    (denormalized)
```

**No columns:** `userId`, `subscriptionId`, `customerUserId`.

**Schema:** `drizzle/schema.ts:289–308`

### Commercial linkage (indirect)

| Link | Path |
|---|---|
| Order → Restaurant owner | `getRestaurantById(order.restaurantId).userId` |
| Ordering gate → Subscription | `restaurantAllowsTableOrdering(restaurantId)` → owner's subscription rows (`server/db.ts:709–721`) |
| Order notification → User | `createNotification({ userId: restaurant.userId, ... })` — `server/routers.ts:1725–1727` |

### Order creation flow

```
order.create (public, no auth)
  ↓ getRestaurantById(restaurantId)
  ↓ restaurantAllowsTableOrdering(restaurantId)   ← subscription check on owner
  ↓ createOrder({ restaurantId, tableId, tableNumber, ... })
  ↓ createOrderItems(...)
  ↓ createNotification({ userId: restaurant.userId, notificationType: 'new_order' })
```

**Locations:** `server/routers.ts:1640–1735`, `server/db.ts:1117–1121`

### Order access (owner dashboard)

```
order.list / order.getById / order.updateStatus
  ↓ assertRestaurantAccess(ctx, order.restaurantId)
  ↓ getOrdersByRestaurant / getOrderById
```

**Locations:** `server/routers.ts:1738–1768`

**Orders are restaurant-owned records.** Subscription affects whether orders can be **created**, not who **owns** the order row.

---

## SECTION 7 — Trial Ownership

### Self-service registration (`registerOwner`)

**File:** `server/auth-local/registerOwner.ts:98–156`

Single DB transaction creates three entities:

| Step | Entity | Key fields |
|---|---|---|
| 1 | `users` | `openId`, `email`, `role: "user"`, `passwordHash` |
| 2 | `restaurants` | `userId` = new user id, `slug`, `nameAr`, `ownerEmail` |
| 3 | `user_subscriptions` | `userId`, **`restaurantId` = new restaurant id**, `planId` = Professional trial, `status: "trial"` |

Trial payload built by `buildTrialSubscriptionForUser(userId, restaurantId)` — `server/create-trial-subscription.ts:53–58`.

**Ownership chain at trial creation:**

```
User (new)
  └─ owns Restaurant (new, restaurants.userId)
  └─ owns Subscription (new, user_subscriptions.userId)
       └─ scoped to Restaurant (user_subscriptions.restaurantId = restaurant.id)
       └─ references Plan (Professional via resolveTrialPlanId)
```

### Standalone trial helper

`createTrialSubscription(userId, { restaurantId })` — `server/create-trial-subscription.ts:65–78`  
Default `restaurantId = 0` (account-level) if not passed.

### Admin-created trial

`admin.createUserSubscriptionByAdmin` with `status: "trial"` — `server/routers.ts:1025–1079`  
Uses `resolveSubscriptionRestaurantIdForUser` to set `restaurantId` (required if user has restaurants).

### Payment activation (trial → active)

PayPal webhook: `updateSubscriptionForActivation(userId, { status: "active", planId, ... })` — `server/paypal-webhook.ts:108–118`  
Tap webhook: `updateSubscriptionById` or `updateSubscriptionForActivation` — `server/tap-webhook.ts:111–120`

Activation updates **existing user-owned row**; does not create a new owner entity.

---

## SECTION 8 — Data Flow Mapping

### User registration flow (self-service owner)

```
POST /api/auth/register (registerLocalOwner)
  ↓ parseRegisterBody
  ↓ registerOwnerTransactional
      INSERT users
      INSERT restaurants (userId = user.id)
      INSERT user_subscriptions (userId, restaurantId, planId=trial, status=trial)
  ↓ createSessionToken + setSessionCookie
  ↓ sendVerificationEmailForUser
```

**Files:** `server/auth-local/registerOwner.ts`, `server/create-trial-subscription.ts`

### Admin subscriber account (user only, no restaurant/sub)

```
admin.createSubscriberAccount
  ↓ upsertUser (role: user)
  ↓ updateUserPassword
  → Returns userId only; no restaurant or subscription created
```

**File:** `server/routers.ts:790–817`

### Restaurant creation flow (post-registration)

```
restaurant.create
  ↓ assertRestaurantCreateAllowed (non-admin)
  ↓ ownerUserId = ctx.user.id (or admin-resolved owner)
  ↓ createRestaurant({ userId: ownerUserId, slug, ... })
  → No subscription row created
```

**Files:** `server/routers.ts:104–148`, `server/db.ts:286–290`

### Subscription activation flow (payment)

```
subscription.createCheckoutSession / createTapCheckout
  ↓ getSubscriptionPlanById(planId)
  ↓ PayPal order / Tap charge (metadata: user_id, plan_id, subscription_id)
  ↓ Webhook (paypal-webhook / tap-webhook)
  ↓ updateSubscriptionForActivation(userId, { status: active, planId, periods })
```

**Files:** `server/routers.ts:657–737`, `server/paypal-webhook.ts`, `server/tap-webhook.ts`, `server/subscriptionActivation.ts`

### Admin subscription creation (restaurant-scoped)

```
admin.createRestaurantSubscription
  ↓ resolveRestaurantOwnerUserId(restaurantId) → restaurant.userId
  ↓ getSubscriptionForRestaurant(restaurantId) — conflict if exists
  ↓ createSubscriptionForRestaurant({ userId: ownerUserId, restaurantId, planId, status: active })
```

**File:** `server/routers.ts:855–883`

### Admin subscription creation (user-scoped)

```
admin.createUserSubscriptionByAdmin
  ↓ getCanonicalUserSubscription — conflict if any row exists
  ↓ resolveSubscriptionRestaurantIdForUser(userId, restaurantId?)
  ↓ createSubscriptionForRestaurant({ userId, restaurantId, planId, status })
```

**File:** `server/routers.ts:1025–1079`

### Invoice creation flow

```
admin.generateInvoicePDF({ userId, subscriptionId })
  ↓ getCanonicalUserSubscription(userId)
  ↓ createInvoice({ userId, subscriptionId: sub.id, ... })
  ↓ PDF upload → updateInvoice(pdfUrl)
```

**File:** `server/routers.ts:1191–1254`

### Trial creation flow (summary)

| Entry point | Restaurant created? | Subscription `restaurantId` |
|---|---|---|
| `registerOwner` | Yes (same transaction) | Specific restaurant id |
| `createTrialSubscription()` | No | Default `0` |
| `admin.createUserSubscriptionByAdmin` | No | Resolved (0 or specific) |

---

## SECTION 9 — Entity Relationship Model

```
User
├── restaurants[]                    (restaurants.userId)
│   ├── categories[], menu_items[], offers[]
│   ├── restaurant_tables[]
│   ├── restaurant_holidays[]
│   └── orders[]                     (orders.restaurantId)
│       └── order_items[]
├── user_subscriptions[]             (user_subscriptions.userId)
│   ├── plan → subscription_plans    (planId)
│   └── scope → restaurantId         (0 = account-level, else restaurant id)
├── invoices[]                       (invoices.userId)
│   └── subscription → user_subscriptions (subscriptionId)
├── renewal_notifications[]        (userId, optional subscriptionId)
└── auth_tokens[]

subscription_plans (global catalog, no parent entity)

Commercial resolution paths:
  Restaurant limits     → User → canonical subscription → plan.maxRestaurants
  Table ordering        → Restaurant → owner User → scoped/user-level subscription → plan
  Premium features      → User → any entitled subscription row
  Invoices              → User + subscription row (no restaurant column)
  Orders                → Restaurant (subscription only gates creation)
```

---

## SECTION 10 — Initial Findings

1. **Primary ownership is User-centric.** Restaurants and subscriptions both hang off `users.id`; restaurants do not own subscriptions in the schema.

2. **User → Restaurant is 1→Many** via `restaurants.userId`. No co-owner or membership tables exist.

3. **User → Subscription is 1→Many rows** via `user_subscriptions.userId`. Multiple rows per user are supported; canonical pick resolves ambiguity.

4. **`user_subscriptions.restaurantId` is a scope field**, not an ownership inversion. Value `0` means account-level (`server/subscriptionResolver.ts:78–86`).

5. **`subscription_plans` is global reference data** joined by `planId`. Plans are not owned by users or restaurants.

6. **No database foreign keys** are declared in migrations; relationships are enforced in application code only.

7. **`drizzle/relations.ts` is empty** — no ORM-level relation graph.

8. **Invoices belong to User + Subscription** (`userId`, `subscriptionId`). No direct invoice→restaurant link.

9. **Orders belong to Restaurant only** (`restaurantId`). No `userId` or `subscriptionId` on order rows. Subscription affects order **creation eligibility**, not order ownership.

10. **Self-service registration atomically creates User + Restaurant + scoped Trial Subscription** in one transaction (`server/auth-local/registerOwner.ts:121–153`).

11. **Additional restaurants do not auto-create subscriptions.** Only the initial register flow and explicit admin/payment paths create subscription rows.

12. **Trial subscription is user-owned, restaurant-scoped** at registration (`restaurantId = new restaurant id`, `status = trial`, Professional `planId`).

13. **Admin can assign restaurant owner separately from caller** via `resolveAdminRestaurantOwnerUserId` when creating restaurants (`server/routers.ts:122–128`, `server/adminSubscriptionHelpers.ts:151–175`).

14. **Tenant isolation uses `restaurants.userId`**, not subscription scope (`server/restaurantAccess.ts:15–37`).

15. **Cascade deletes confirm ownership hierarchy:** deleting a user deletes owned restaurants (and their orders/menu), then remaining user subscriptions and invoices (`server/db/cascadeDeletes.ts:218–239`).

16. **No `tenantId`, `organizationId`, `ownerId`, `restaurant_users`, or `restaurant_members`** entities exist in the codebase searched.

17. **Admin list queries join in memory**, not SQL JOINs: e.g. `getAllRestaurantsWithSubscriptions` maps restaurants → owner user → owner subscriptions (`server/db.ts:746–770`); `getAllUsersWithSubscriptions` uses first matching sub row per user (`server/db.ts:972–989`).

18. **Payment webhooks activate user-owned subscription rows** by `userId` (and optionally `subscriptionId` in Tap metadata), preserving the User → Subscription ownership model.

19. **MRR and revenue metrics operate on subscription rows + plan prices**, not invoices (`server/adminKpiCalculations.ts`, `server/db.ts:getAdminStatistics`).

20. **"Owner" in product language maps to `restaurants.userId` and `user_subscriptions.userId`**, not a separate role or entity type.

---

*End of audit. No recommendations. No fixes. No code changes.*
