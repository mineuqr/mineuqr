# PLAN-SOURCE-OF-TRUTH-AUDIT.md

**PG-1A.1 — Plan Source of Truth Audit**  
**Mode:** Read-only investigation  
**Branch:** main  
**Date:** 2026-06-05  

No code, schema, migrations, or configuration were modified to produce this report.

---

## Search Target Summary

| Term | Found in codebase? | Primary locations |
|---|---|---|
| `resolvePlanLimitsForUser` | Yes | `server/subscriptionPlanLimits.ts` |
| `PLAN_LIMITS` | **No** | — |
| `subscriptionPlans` | Yes | `drizzle/schema.ts`, `server/db.ts`, `server/seed-plans.mjs` |
| `planCatalog` | **No** | — |
| `maxRestaurants` | Yes | `drizzle/schema.ts`, `server/seed-plans.mjs`, `server/subscriptionPlanLimits.ts` |
| `restaurantLimit` | **No** (uses `maxRestaurants`) | — |
| `locationLimit` | **No** | — |
| `orderingEnabled` | **No** | — |
| `canPlaceOrders` | **No** (client uses `canOrder`) | `client/src/pages/MenuView.tsx` |
| `tableOrdering` | **No** symbol; logic via `restaurantAllowsTableOrdering` | `server/db.ts`, `server/subscriptionEntitlement.ts` |
| `callWaiter` | **No** enforcement code | Marketing copy in `client/src/locales/en.json` only |
| `requestBill` | **No** enforcement code | — |
| `subscriptionType` | **No** | — |
| `trial` / `active` | Yes | `user_subscriptions.status` enum, entitlement + KPI paths |
| `enterprise` / `professional` / `basic` | Yes | Seed names in `server/seed-plans.mjs`; not hardcoded plan IDs except `BASIC_FREE_PLAN_ID = 30001` |

---

## SECTION 1 — Plan Definitions

### Where plans are defined

| Layer | Path | Function / artifact |
|---|---|---|
| **Database schema** | `drizzle/schema.ts:94–113` | `subscriptionPlans` table |
| **Seed script (reference catalog)** | `server/seed-plans.mjs:12–76` | Inserts Basic, Professional, Enterprise |
| **Runtime read** | `server/db.ts:397–401` | `getSubscriptionPlans()` — active plans, `ORDER BY sortOrder ASC` |
| **Runtime read by id** | `server/db.ts:404–408` | `getSubscriptionPlanById(id)` |
| **Trial plan selection** | `server/create-trial-subscription.ts:19–27` | `resolveTrialPlanId()` — `sortOrder === 2` (Professional), excludes id `30001` |
| **Special plan constant** | `server/subscriptionEntitlement.ts:7` | `BASIC_FREE_PLAN_ID = 30001` (ordering-only free tier; not in seed script) |

There is **no** in-code `PLAN_LIMITS` map or `planCatalog` module. Limits and prices live on **`subscription_plans` rows** loaded at runtime.

### Per-plan documentation (seed reference values)

Values below are from `server/seed-plans.mjs`. Production DB auto-increment IDs may differ; limits/prices are row-driven.

#### Basic Plan (`sortOrder: 1`)

| Attribute | Value | Source |
|---|---|---|
| Price (monthly / yearly) | $19 / $175 | `server/seed-plans.mjs:18–19` |
| Restaurant limit | 1 | `maxRestaurants: 1` |
| Menu item limit | 100 | `maxItemsPerRestaurant: 100` |
| Category limit | 10 | `maxCategories: 10` |
| Ordering access | **Not blocked by plan name/id in code** — only plan id `30001` is blocked for table ordering | `server/subscriptionEntitlement.ts:134–140` |
| Table ordering | Allowed if subscription entitled and `plan.id !== 30001` | `resolveTableOrderingEntitlement()` |
| Call waiter / request bill | **No dedicated gate found** | — |
| Additional gates | Premium templates/colors/fonts require `isSubscriptionActive()` (entitled trial or active) | `server/routers.ts:236–293` |

#### Professional Plan (`sortOrder: 2`)

| Attribute | Value | Source |
|---|---|---|
| Price (monthly / yearly) | $35 / $299 | `server/seed-plans.mjs:38–39` |
| Restaurant limit | 5 | `maxRestaurants: 5` |
| Menu item limit | 500 | `maxItemsPerRestaurant: 500` |
| Category limit | 25 | `maxCategories: 25` |
| Ordering access | Same code path as Basic — entitled + not plan `30001` | `resolveTableOrderingEntitlement()` |
| Table ordering | Same | `server/db.ts:716–721` |
| Call waiter / request bill | **No dedicated gate found** | — |

#### Enterprise Plan (`sortOrder: 3`)

| Attribute | Value | Source |
|---|---|---|
| Price (monthly / yearly) | $59 / $499 | `server/seed-plans.mjs:59–60` |
| Restaurant limit | 999 | `maxRestaurants: 999` |
| Menu item limit | 9999 | `maxItemsPerRestaurant: 9999` |
| Category limit | 100 | `maxCategories: 100` |
| Ordering / table ordering | Same entitlement stack | `resolveTableOrderingEntitlement()` |
| Call waiter / request bill | **No dedicated gate found** | — |

#### Trial Professional (not a separate catalog plan)

| Attribute | Value | Source |
|---|---|---|
| Definition | `user_subscriptions` row: `status = "trial"`, `planId` = Professional catalog row | `server/create-trial-subscription.ts:40–49`, `resolveTrialPlanId()` |
| Price | $0 (no charge while trial) | Implicit — no invoice/MRR path for `trial` status |
| Limits | Professional plan row limits via `resolvePlanLimitsForUser` when entitled | `server/subscriptionPlanLimits.ts:56–63` |
| Duration | 14 days | `TRIAL_DAYS = 14` (`server/create-trial-subscription.ts:7`) |
| Ordering | Allowed when trial entitled and `planId !== 30001` | `resolveTableOrderingEntitlement()` |
| MRR / revenue | **Excluded** | `subscriptionContributesToCommercialRevenue()` → `status === "active"` only (`server/adminKpiCalculations.ts:4–5`) |
| Invoices | **Blocked** | `assertSubscriptionEligibleForAdminInvoice("trial")` (`server/adminSubscriptionHelpers.ts:204–213`) |

#### Plan id `30001` (BASIC_FREE_PLAN_ID)

| Attribute | Value | Source |
|---|---|---|
| Purpose | "Free / basic plan — not eligible for table ordering" | `server/subscriptionEntitlement.ts:6–7` |
| In seed script | **Not defined** | Referenced in clean-db scripts as legacy/protected row |
| Table ordering | **Blocked** when `plan.id === 30001` | `resolveTableOrderingEntitlement()` reason `plan_basic_free` |

---

## SECTION 2 — Feature Gate Mapping

| Feature | Enforcement location | Condition used |
|---|---|---|
| **Table ordering (menu → order create)** | `server/routers.ts:1683–1686` → `server/db.ts:716–721` → `server/subscriptionEntitlement.ts:117–147` | `restaurantAllowsTableOrdering(restaurantId)` → `resolveTableOrderingEntitlement(sub, plan).isEntitled`; blocks only `plan.id === BASIC_FREE_PLAN_ID (30001)`; requires entitled `trial` or `active` with valid period |
| **Order capability probe (public)** | `server/routers.ts:1633–1637` | Same `restaurantAllowsTableOrdering()` |
| **Menu UI cart / place order** | `client/src/pages/MenuView.tsx:48–68` | Client: `trpc.order.canOrder` + local `orderingAllowed` (hours/closure only); server enforces on `order.create` |
| **Premium menu templates** | `server/routers.ts:234–242` | `premiumTemplates.includes(template)` AND `ctx.user.role !== "admin"` AND `!(await isSubscriptionActive(ctx.user.id))` → FORBIDDEN |
| **Premium templates (client UX)** | `client/src/pages/TemplateSelector.tsx:68–69` | `isSubscribed = subscriptionData?.isActive \|\| user?.role === "admin"` |
| **Custom colors** | `server/routers.ts:264–268` | Non-admin requires `isSubscriptionActive(ctx.user.id)` |
| **Custom colors (client)** | `client/src/components/ColorCustomizer.tsx:217` | Toast on error referencing premium message |
| **Custom fonts** | `server/routers.ts:290–294` | Non-admin requires `isSubscriptionActive(ctx.user.id)` |
| **Restaurant count limit** | `server/subscriptionPlanLimits.ts:74–82` | `restaurants.length >= limits.maxRestaurants` from `resolvePlanLimitsForUser(userId)` |
| **Category count limit** | `server/subscriptionPlanLimits.ts:85–96` | `stats.totalCategories >= limits.maxCategories` via `resolvePlanLimitsForUser(userId, restaurantId)` |
| **Menu item count limit** | `server/subscriptionPlanLimits.ts:99–110` | `stats.totalItems >= limits.maxItemsPerRestaurant` via `resolvePlanLimitsForUser(userId, restaurantId)` |
| **Subscription period validity** | `server/subscriptionEntitlement.ts:32–114` | `resolveSubscriptionEntitlement()` — `trialEndsAt` / `currentPeriodEnd` vs `now`; `canceled`/`expired` not entitled |
| **Account-level “has subscription”** | `server/db.ts:514–517` | `userHasSubscriptionEntitlement(rows)` — any entitled trial/active row |
| **MRR** | `server/adminKpiCalculations.ts:33–42` | `subscriptionContributesToCommercialRevenue(status)` → `status === "active"` only |
| **Revenue by month chart** | `server/db.ts:825–828` | Same `subscriptionContributesToCommercialRevenue(s.status)` |
| **Admin invoice PDF** | `server/routers.ts:1209` → `server/adminSubscriptionHelpers.ts:204–213` | `assertSubscriptionEligibleForAdminInvoice(sub.status)` — rejects `trial` |
| **Call waiter** | — | **No enforcement code found** (locale marketing only) |
| **Request bill** | — | **No enforcement code found** |
| **Restaurant tenant access** | `server/restaurantAccess.ts:15–37` | `restaurant.userId === ctx.user.id` OR `ctx.user.role === "admin"` |
| **Email verification** | `server/_core/emailVerificationPolicy.ts:22` | Admins exempt |

---

## SECTION 3 — Restaurant Limit Enforcement

### Where checked

| Layer | File | Function | Trigger |
|---|---|---|---|
| **API / Server** | `server/routers.ts:119–120` | `restaurant.create` mutation | `assertRestaurantCreateAllowed(ctx.user.id)` when `ctx.user.role !== "admin"` |
| **Server helper** | `server/subscriptionPlanLimits.ts:74–82` | `assertRestaurantCreateAllowed(userId)` | Compares owned restaurant count vs `limits.maxRestaurants` |
| **Limit resolution** | `server/subscriptionPlanLimits.ts:46–68` | `resolvePlanLimitsForUser(userId)` | Account-wide: `pickCanonicalSubscription(getSubscriptionsByUser(userId))`; entitled sub → plan limits; else Basic fallback |
| **Frontend** | `client/src/pages/Dashboard.tsx:988` | `trpc.restaurant.create.useMutation` | **No client-side limit check** — relies on API error |
| **Frontend (admin)** | `client/src/pages/AdminManagement.tsx:905` | `trpc.restaurant.create.useMutation` | Same API; admin role bypasses limit server-side |
| **Database** | — | — | **No DB constraint** on restaurant count per user |

### Blocking condition

```
getRestaurantsByUser(userId).length >= resolvePlanLimitsForUser(userId).maxRestaurants
→ TRPCError FORBIDDEN (Arabic message with limit count)
```

**Admin bypass:** `server/routers.ts:119–120` — admins skip `assertRestaurantCreateAllowed`.

**Multi-restaurant nuance:** Account-wide limit uses **canonical subscription across all user rows**, not per-restaurant subscription (`server/subscriptionPlanLimits.ts:50–54`).

---

## SECTION 4 — Trial Mapping

### Trial creation flow (self-service register)

```
Register POST (auth-local/registerOwner.ts)
  ↓ parseRegisterBody / registerOwnerTransactional
  ↓ users INSERT (role: "user")
  ↓ restaurants INSERT (userId, slug, nameAr, …)
  ↓ buildTrialSubscriptionForUser(userId, restaurantId)
       ↓ resolveTrialPlanId() → Professional (sortOrder 2)
       ↓ buildTrialSubscriptionPayload → status "trial", 14-day dates
  ↓ user_subscriptions INSERT
```

| Step | File | Lines (approx.) |
|---|---|---|
| Register entry | `server/auth-local/registerOwner.ts` | `registerLocalOwner`, `registerOwnerTransactional` |
| Trial payload | `server/create-trial-subscription.ts` | `buildTrialSubscriptionForUser`, `resolveTrialPlanId` |
| Alternate helper | `server/create-trial-subscription.ts` | `createTrialSubscription()` — same payload; used outside register transaction in tests |

### Trial assignment details

| Property | Value |
|---|---|
| Plan received | **Professional catalog row** (`sortOrder === 2`; fallback second paid plan) |
| Status | `trial` |
| Billing cycle | `monthly` |
| Duration | 14 days (`TRIAL_DAYS`) |
| Scoped to | Registering user's first `restaurantId` |
| OAuth signup | **No `createTrialSubscription` caller found** in OAuth path (ops signal `oauth_trial_subscription_failed` exists but no live creation path located) |
| Admin-created subscriber | `admin.createSubscriberAccount` creates user **without** subscription or trial (`server/routers.ts:790–817`) |

### Trial expiration handling

| Mechanism | Behavior | Source |
|---|---|---|
| Entitlement check | After `trialEndsAt`, `resolveSubscriptionEntitlement` → `period_expired`, `isEntitled: false` | `server/subscriptionEntitlement.ts:66–72` |
| Status auto-update | **No automatic flip** from `trial` → `expired` in code audited | Row stays `status: "trial"` |
| `isSubscriptionActive` | Uses entitlement, not raw status | `server/db.ts:514–517` |
| Dashboard warning | Client shows expiry from `trialEndsAt` / `currentPeriodEnd` | `client/src/pages/Dashboard.tsx:1368–1373` |

### Trial conversion path (to paying)

```
User selects plan → subscription.createCheckoutSession (PayPal) or createTapCheckout
  ↓ Payment provider webhook
  ↓ updateSubscriptionForActivation(userId, { status: "active", planId, …, trialEndsAt: null })
       ↓ resolveSubscriptionForActivationFromRows (server/subscriptionActivation.ts)
  ↓ Subscription row updated to active
```

Sources: `server/routers.ts:657–728`, `server/paypal-webhook.ts:108–118`, `server/tap-webhook.ts` (similar activation pattern).

---

## SECTION 5 — Admin Commercial Behavior

### Role assignment

| Path | Behavior | File |
|---|---|---|
| OAuth owner | `user.openId === ENV.ownerOpenId` → `role = 'admin'` on upsert | `server/db.ts:137` |
| Manual promotion | `admin.updateUserRole` / `profile.updateUserRole` | `server/routers.ts:973–979`, `1363–1366` |
| Protected user | `PROTECTED_USER_IDS = [1]` — delete/demote/password-reset guards | `shared/const.ts:9–12`, `server/db/cascadeDeletes.ts` |

### Subscription bypasses

| Bypass | Condition | File |
|---|---|---|
| Premium templates | `ctx.user.role === "admin"` skips `isSubscriptionActive` check | `server/routers.ts:238` |
| Custom colors | Same | `server/routers.ts:265` |
| Custom fonts | Same | `server/routers.ts:292` |
| Restaurant limit | Admin skips `assertRestaurantCreateAllowed` | `server/routers.ts:119–120` |
| Email verification | Admin exempt | `server/_core/emailVerificationPolicy.ts:22` |
| Table ordering | **No admin role bypass** — uses restaurant owner's subscription via `getOrderingSubscriptionForRestaurant` | `server/db.ts:709–721` |
| MRR / revenue | **No admin role exclusion** — any `active` subscription row counts | `server/adminKpiCalculations.ts` |

### Plan bypasses

Admins do **not** receive a special plan row. They bypass **feature checks** via `role === "admin"`, not via plan limits.

### Restaurant limit bypasses

Only **admin role** on `restaurant.create` (`server/routers.ts:119–120`).

### Feature bypasses (client + server)

| Surface | Admin treatment |
|---|---|
| `TemplateSelector` | `isSubscribed = isActive \|\| user?.role === "admin"` (`client/src/pages/TemplateSelector.tsx:68`) |
| Server template/colors/fonts | Admin skips subscription check |

### Super Admin

| Route | Component | Commercial notes |
|---|---|---|
| `/super-admin` | `client/src/pages/SuperAdminDashboard.tsx` | User management stats; **no subscription/MRR editing** in this page |
| `/admin` | `client/src/pages/AdminManagement.tsx` | Full subscription CRUD + KPIs |

### Subscription editing entry points (admin)

| UI location | tRPC mutations | File |
|---|---|---|
| Users section dialog | `admin.createUserSubscriptionByAdmin`, `admin.updateUserSubscriptionByAdmin`, `admin.deleteUserSubscriptionByAdmin` | `client/src/pages/AdminManagement.tsx` (~100–111, 543–580) |
| Restaurant cards | `admin.createRestaurantSubscription`, `admin.updateRestaurantSubscription`, cancel/delete | `client/src/pages/AdminManagement.tsx` (~941+, 1242–1311, 1610–1650) |
| Create restaurant flow | `restaurant.create` + optional `admin.createRestaurantSubscription` | `client/src/pages/AdminManagement.tsx` (~905–924) |
| Invoice generation | `admin.generateInvoicePDF` | `client/src/pages/AdminManagement.tsx` (~145, 310) |

All require `assertAdminAccess` on server (`server/_core/assertAdminAccess.ts:11–12`).

---

## SECTION 6 — Source of Truth Discovery

From code only, commercial behavior is **not** governed by a single entity. Actual authority is **composite**:

| Candidate | Authoritative for | Not authoritative for |
|---|---|---|
| **A — User** | Ownership (`restaurants.userId`), subscription rows keyed by `userId`, account-wide limits | Per-restaurant display subscription pick differs from MRR sum |
| **B — Owner** | Same as user in this codebase (owner = `restaurants.userId`) | No separate "owner" table |
| **C — Restaurant** | Tenant boundary (`assertRestaurantAccess`), restaurant-scoped subscription display, ordering resolution per `restaurantId` | Plan prices, MRR aggregation |
| **D — Subscription** | Status, planId, billingCycle, periods; entitlement; MRR when `active` | Admin feature bypass (uses `role`) |

### Implemented authority model (factual)

1. **`subscription_plans` table** — canonical **prices and numeric limits** (`maxRestaurants`, `maxItemsPerRestaurant`, `maxCategories`).
2. **`user_subscriptions` row** — canonical **commercial state** (`status`, `planId`, `trialEndsAt`, `currentPeriodEnd`, `restaurantId`).
3. **`resolveSubscriptionEntitlement` / `pickCanonicalSubscription`** — canonical **“is entitled now?”** for a set of rows.
4. **`users.role === "admin"`** — parallel **feature bypass** path unrelated to subscription row.
5. **`BASIC_FREE_PLAN_ID = 30001`** — hardcoded **ordering block** independent of catalog plan names.

**Drift point:** UI/marketing and error strings refer to "Professional or Enterprise" for ordering (`server/routers.ts:1685`), but code blocks only plan id `30001`, not Basic/Professional catalog distinction.

---

## SECTION 7 — Initial Findings (facts only)

1. Plans are defined in **`subscription_plans` DB table**, seeded by **`server/seed-plans.mjs`**; there is no static in-code plan catalog module.

2. **`PLAN_LIMITS`, `planCatalog`, `subscriptionType`, `orderingEnabled`, `callWaiter`, `requestBill`** — no symbols or enforcement modules found under those names.

3. **Self-service trials** (post LAUNCH-5B) assign the **Professional catalog plan** (`sortOrder 2`) with **`status: "trial"`** for **14 days** (`server/create-trial-subscription.ts`).

4. **Trial is not a separate plan row** — it is a subscription status + Professional `planId`.

5. **Table ordering** requires entitled subscription and **`plan.id !== 30001`**. Catalog Basic/Professional/Enterprise are **not** differentiated for ordering in code—only the special id `30001` is blocked.

6. **Error message** on order create claims Professional/Enterprise requirement; **code does not enforce plan tier** beyond blocking `30001` (`server/routers.ts:1685` vs `subscriptionEntitlement.ts:134`).

7. **Premium templates, colors, fonts** gate on **`isSubscriptionActive()`**, which treats **entitled trials as subscribed** (`userHasSubscriptionEntitlement`).

8. **Restaurant limits** enforce at **API layer only** via `assertRestaurantCreateAllowed`; **admins bypass**; **no frontend pre-check**.

9. **Multi-restaurant owners:** limits use **account-wide canonical subscription**; ordering uses **restaurant-scoped** `resolveOrderingSubscriptionRow`; admin restaurant cards pick **per-restaurant canonical sub** with user-level fallback (`server/db.ts:757–763`).

10. **MRR and revenue-by-month** include **`active` status only**; trials excluded via `subscriptionContributesToCommercialRevenue()` (`server/adminKpiCalculations.ts`, `server/db.ts`).

11. **Trial invoices** are blocked by `assertSubscriptionEligibleForAdminInvoice` (preserved from ADMIN-AUDIT-FIX-1).

12. **Admin accounts** bypass subscription checks for templates/colors/fonts and restaurant count; **admin is not excluded from MRR** if an `active` subscription row exists.

13. **Subscription editing** is available from **two admin UI surfaces** (user dialog + restaurant card dialog) calling **different tRPC mutations** (`createUserSubscriptionByAdmin` vs `createRestaurantSubscription`).

14. **Call waiter / request bill** appear in marketing locales only; **no commercial gate implementation found**.

15. **Paying conversion** flows through **PayPal/Tap webhooks** → `updateSubscriptionForActivation` setting `status: "active"` and clearing `trialEndsAt` (`server/paypal-webhook.ts:108–117`).

16. **Commercial architecture drift is evidenced in code:** plan tier semantics (Basic vs Professional ordering), error messages, admin bypass paths, and KPI vs entitlement vs MRR use **different resolution functions** without a single shared commercial policy module.

---

*End of audit. No recommendations. No fixes. No code changes.*
