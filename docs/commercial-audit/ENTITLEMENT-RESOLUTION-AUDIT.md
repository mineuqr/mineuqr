# ENTITLEMENT-RESOLUTION-AUDIT.md

**PG-1A.2 — Entitlement Resolution Audit**  
**Mode:** Read-only investigation  
**Branch:** main  
**Date:** 2026-06-05  

No code, schema, commits, fixes, or refactors were performed.

---

## Search Target Summary

| Term | Found? | Notes |
|---|---|---|
| `resolvePlanLimitsForUser` | Yes | `server/subscriptionPlanLimits.ts:46` |
| `resolveTableOrderingEntitlement` | Yes | `server/subscriptionEntitlement.ts:117` |
| `restaurantAllowsTableOrdering` | Yes | `server/db.ts:716` |
| `assertRestaurantCreateAllowed` | Yes | `server/subscriptionPlanLimits.ts:74` |
| `PLAN_LIMITS` | **No** | — |
| `planCatalog` | **No** | — |
| `orderingEnabled` / `canPlaceOrders` | **No** symbols | Client uses `canOrder`; server uses `restaurantAllowsTableOrdering` |
| `callWaiter` / `requestBill` | **No enforcement** | Locale marketing only |
| `subscriptionType` | **No** | — |
| `role === "super_admin"` | **No** | DB enum is `admin` \| `user` only (`drizzle/schema.ts:145`) |
| `role === "owner"` | **No role value** | Ownership = `restaurants.userId` |

---

## SECTION 1 — Entitlement Resolvers Inventory

| # | File | Function | Purpose |
|---|---|---|---|
| 1 | `server/subscriptionEntitlement.ts:32` | `resolveSubscriptionEntitlement(sub, now?)` | Period-valid entitlement for a single subscription row (`trial`/`active`/`canceled`/`expired`) |
| 2 | `server/subscriptionEntitlement.ts:117` | `resolveTableOrderingEntitlement(sub, plan, now?)` | Table ordering: entitled subscription + plan not `30001` |
| 3 | `server/subscriptionEntitlement.ts:151` | `userHasSubscriptionEntitlement(rows, now?)` | Account-level: any row entitled via #1 |
| 4 | `server/subscriptionResolver.ts:11` | `subscriptionEntitledNow(sub, now?)` | Boolean wrapper for #1 |
| 5 | `server/subscriptionResolver.ts:34` | `subscriptionCanonicalRank(sub, now?)` | Rank rows for canonical pick (entitled > lapsed > canceled) |
| 6 | `server/subscriptionResolver.ts:47` | `compareSubscriptionsCanonical(a, b, now?)` | Deterministic sort for competing rows |
| 7 | `server/subscriptionResolver.ts:70` | `pickCanonicalSubscription(rows, now?)` | Pick one subscription row from a set |
| 8 | `server/subscriptionResolver.ts:79` | `pickUserLevelSubscription(rows, now?)` | Canonical pick among `restaurantId === 0` rows |
| 9 | `server/subscriptionResolver.ts:92` | `resolveOrderingSubscriptionRow(restaurantId, rows, now?)` | Restaurant-scoped sub first, then user-level |
| 10 | `server/subscriptionPlanLimits.ts:27` | `getFallbackBasicLimits()` (internal) | Basic-tier limits when no entitled plan |
| 11 | `server/subscriptionPlanLimits.ts:46` | `resolvePlanLimitsForUser(userId, restaurantId?)` | Numeric quotas: restaurants / items / categories |
| 12 | `server/subscriptionPlanLimits.ts:74` | `assertRestaurantCreateAllowed(userId)` | Throws if restaurant count ≥ limit |
| 13 | `server/subscriptionPlanLimits.ts:85` | `assertCategoryCreateAllowed(userId, restaurantId)` | Throws if category count ≥ limit |
| 14 | `server/subscriptionPlanLimits.ts:99` | `assertMenuItemCreateAllowed(userId, restaurantId)` | Throws if item count ≥ limit |
| 15 | `server/db.ts:709` | `getOrderingSubscriptionForRestaurant(restaurantId)` | Loads owner rows → #9 |
| 16 | `server/db.ts:716` | `restaurantAllowsTableOrdering(restaurantId)` | Boolean via #2 |
| 17 | `server/db.ts:515` | `isSubscriptionActive(userId)` | #3 over all user subscription rows |
| 18 | `server/db.ts:520` | `getTrialEndDate(userId)` | Canonical trial row's `trialEndsAt` |
| 19 | `server/subscriptionActivation.ts:16` | `resolveSubscriptionForActivationFromRows(rows, options)` | Pick row for payment activation |
| 20 | `server/db.ts:494` | `resolveSubscriptionForActivation(userId, options)` | DB load + #19 |
| 21 | `server/adminKpiCalculations.ts:4` | `subscriptionContributesToCommercialRevenue(status)` | `status === "active"` only |
| 22 | `server/adminKpiCalculations.ts:33` | `computeAdminMrr(subs, plans)` | Sum plan prices for #21 rows |
| 23 | `server/adminSubscriptionHelpers.ts:204` | `assertSubscriptionEligibleForAdminInvoice(status)` | Rejects `trial` status |
| 24 | `server/restaurantAccess.ts:15` | `assertRestaurantAccess(ctx, restaurantId, action?)` | Tenant boundary: owner or admin |
| 25 | `server/_core/assertAdminAccess.ts:11` | `assertAdminAccess(ctx, procedure?)` | Requires `role === "admin"` |
| 26 | `server/_core/emailVerificationPolicy.ts:19` | `isEmailVerificationRequired(user)` | Email gate (admins exempt) |
| 27 | `server/_core/trpc.ts:122` | `verifiedProcedure` | Session + optional email verification middleware |

**Hardcoded plan constant used in resolvers:** `BASIC_FREE_PLAN_ID = 30001` (`server/subscriptionEntitlement.ts:7`).

---

## SECTION 2 — Feature Matrix Discovery

| Feature | Resolver(s) | Plan dependency | Subscription dependency | Admin bypass? |
|---|---|---|---|---|
| **Restaurant creation** | `assertRestaurantCreateAllowed` → `resolvePlanLimitsForUser` → `resolveSubscriptionEntitlement` | `plan.maxRestaurants` from entitled sub's plan; else Basic fallback | Entitled `trial` or `active` row (canonical account-wide) | **Yes** — skip limit check (`routers.ts:119–120`) |
| **Restaurant limit (count)** | Same as above | `maxRestaurants` on resolved plan | Entitled subscription required for plan limits; unentitled → Basic fallback (1 restaurant) | **Yes** (on create only) |
| **Menu items limit** | `assertMenuItemCreateAllowed` → `resolvePlanLimitsForUser(userId, restaurantId)` | `maxItemsPerRestaurant` | Restaurant-scoped: `resolveOrderingSubscriptionRow` + entitlement | **Yes** (`routers.ts:449–450`) |
| **Category limit** | `assertCategoryCreateAllowed` | `maxCategories` | Same restaurant-scoped resolution | **Yes** (`routers.ts:371–372`) |
| **QR menu (public view)** | None (commercial) | None | None | N/A (public) |
| **Ordering (table)** | `restaurantAllowsTableOrdering` → `resolveTableOrderingEntitlement` | Blocks `plan.id === 30001` only | Entitled `trial` or `active`; uses owner's restaurant-scoped sub | **No** admin bypass on ordering path |
| **Cart (UI)** | Client: `canPlaceOrder` in `MenuView.tsx:68` | Indirect via `order.canOrder` | Indirect via server ordering resolver | No |
| **Checkout (place order)** | `order.create` → `restaurantAllowsTableOrdering` (`routers.ts:1683–1686`) | Same as ordering | Same as ordering | No |
| **Table ordering (capability probe)** | `order.canOrder` → `restaurantAllowsTableOrdering` (`routers.ts:1633–1637`) | Same | Same | No |
| **Call waiter** | **None found** | — | — | — |
| **Request bill** | **None found** | — | — | — |
| **Reports (owner dashboard)** | `assertRestaurantAccess` only | None | None | Admin can access any restaurant via tenant bypass |
| **Subscription reports (admin KPIs)** | `assertAdminAccess` | MRR uses plan prices via `computeAdminMrr` | `active` rows only for MRR | Admin-only route (not a bypass — gate) |
| **Export features** | **None found** | — | — | — |
| **Admin features (management)** | `assertAdminAccess` | — | — | Admin role required |
| **Custom colors** | Server: `isSubscriptionActive`; Client: `isSubscribed \|\| isAdmin` | None (any entitled sub) | Entitled trial/active | **Yes** server (`routers.ts:265`) + client (`ColorCustomizer.tsx:277`) |
| **Custom fonts** | Same pattern | None | Entitled trial/active | **Yes** server (`routers.ts:292`) + client (`FontCustomizer.tsx:305`) |
| **Templates (premium)** | Server: `isSubscriptionActive`; Client: `checkTrialStatus` + `isSubscribed` | None (premium flag is UI constant in `MenuTemplates.tsx`) | Entitled trial/active | **Yes** server (`routers.ts:238`) + client (`TemplateSelector.tsx:68`) |
| **Multi-restaurant** | `resolvePlanLimitsForUser(userId)` account-wide for count; per-restaurant sub display uses `pickCanonicalSubscription` per restaurant | `maxRestaurants` from canonical entitled sub | Multiple rows allowed; limits from one canonical sub | Admin bypass on restaurant **create** count only |
| **Invoices (generation)** | `assertSubscriptionEligibleForAdminInvoice` | Plan price used after gate | Non-`trial` canonical sub | Admin operator role (not subscription bypass) |
| **Invoices (list)** | `verifiedProcedure` + `ctx.user.id` | None | None | No |
| **Subscription checkout (PayPal/Tap)** | `verifiedProcedure`; activation via `resolveSubscriptionForActivation` | User-selected `planId` | Existing row updated to `active` | No |
| **Table management (CRUD)** | `assertRestaurantAccess` | None | None | Admin tenant bypass |
| **Order list / status (owner)** | `assertRestaurantAccess` | None | None | Admin tenant bypass |
| **Offers CRUD** | `assertRestaurantAccess` | None | None | Admin tenant bypass |
| **Holidays CRUD** | `assertRestaurantAccess` | None | None | Admin tenant bypass |

---

## SECTION 3 — Enforcement Location Map

| Feature | Frontend | API / Router | Server helper | Database |
|---|---|---|---|---|
| Restaurant create limit | No pre-check (`Dashboard.tsx:988`, `AdminManagement.tsx:905`) | `restaurant.create` (`routers.ts:118–120`) | `assertRestaurantCreateAllowed` | No constraint |
| Category limit | No | `category.create` (`routers.ts:369–373`) | `assertCategoryCreateAllowed` | No |
| Menu item limit | No | `menuItem.create` (`routers.ts:440–451`) | `assertMenuItemCreateAllowed` | No |
| Table ordering | `MenuView.tsx:48–68` (UI gate + hours) | `order.canOrder`, `order.create` (`routers.ts:1633–1686`) | `restaurantAllowsTableOrdering` | No |
| Cart / submit order | `CartDrawer.tsx:43–59` (no sub check) | `order.create` | Same as ordering | No |
| Premium templates | `TemplateSelector.tsx:200–212` (lock UI) | `restaurant.updateTemplate` (`routers.ts:234–242`) | `isSubscriptionActive` | No |
| Custom colors | `ColorCustomizer.tsx:277–301` (lock UI) | `restaurant.updateCustomColors` (`routers.ts:264–268`) | `isSubscriptionActive` | No |
| Custom fonts | `FontCustomizer.tsx:305+` (lock UI) | `restaurant.updateCustomFonts` (`routers.ts:290–294`) | `isSubscriptionActive` | No |
| QR / public menu | Public queries | `restaurant.getBySlug`, `category.listPublic`, `menuItem.listByRestaurant` | None | No |
| Owner reports/stats | Dashboard UI | `restaurant.stats` (`routers.ts:202–213`) | `assertRestaurantAccess`, `getRestaurantStats` | No |
| Admin KPIs | Statistics / AdminManagement pages | `admin.getStatistics`, etc. | `assertAdminAccess`, `computeAdminMrr` | Reads `user_subscriptions`, `subscription_plans` |
| Tenant isolation | — | Most owner mutations | `assertRestaurantAccess` | `restaurants.userId` |
| Email verification | UI panels | `verifiedProcedure` routes | `isEmailVerificationRequired` | `users.emailVerifiedAt` |
| Trial invoices | — | `admin.generateInvoicePDF` | `assertSubscriptionEligibleForAdminInvoice` | — |

**Pattern:** Quota features = **API + server only** (no frontend enforcement). Premium UX features = **frontend lock + API** (dual layer). Ordering = **frontend probe + API hard block**.

---

## SECTION 4 — Admin Bypass Map

There is **no** `super_admin` role. `/super-admin` is a page route; access still uses `role === "admin"`.

| Feature / check | File:line | Bypass type | Effect |
|---|---|---|---|
| Restaurant create limit | `server/routers.ts:119–120` | Skip `assertRestaurantCreateAllowed` when `ctx.user.role === "admin"` | Admin unlimited restaurant creates via API |
| Premium templates | `server/routers.ts:237–238` | Skip `isSubscriptionActive` when admin | Admin can apply premium templates without entitled sub |
| Custom colors | `server/routers.ts:264–265` | Skip `isSubscriptionActive` when admin | Admin can save colors without entitled sub |
| Custom fonts | `server/routers.ts:291–292` | Skip `isSubscriptionActive` when admin | Admin can save fonts without entitled sub |
| Category create limit | `server/routers.ts:371–372` | Skip `assertCategoryCreateAllowed` when admin | Admin unlimited categories |
| Menu item create limit | `server/routers.ts:449–450` | Skip `assertMenuItemCreateAllowed` when admin | Admin unlimited menu items |
| Restaurant tenant access | `server/restaurantAccess.ts:24` | `ctx.user.role === "admin"` | Admin can access any restaurant's data |
| Email verification | `server/_core/emailVerificationPolicy.ts:22` | Admin exempt from verification requirement | Admin can use `verifiedProcedure` without verified email |
| Admin API surface | `server/_core/assertAdminAccess.ts:12` | Requires admin (inverse gate) | Non-admins blocked from admin router |
| `adminProcedure` middleware | `server/_core/trpc.ts:128` | Requires admin | Same |
| Template selector UI | `client/src/pages/TemplateSelector.tsx:68` | `user?.role === "admin"` in `isSubscribed` | Premium templates unlocked in UI |
| Color customizer UI | `client/src/components/ColorCustomizer.tsx:277` | `isAdmin \|\| isSubscribed` | Panel shown without subscription |
| Font customizer UI | `client/src/components/FontCustomizer.tsx:305` | `isAdmin \|\| isSubscribed` | Panel shown without subscription |
| Admin nav link | `client/src/components/landing/LandingNavbar.tsx:61,118` | Show link when `user?.role === "admin"` | Navigation only |
| Admin query gating | `client/src/lib/queryRuntime.ts:16–21` | `adminQueriesEnabled(..., isAdmin)` | Admin TRPC queries enabled |
| Auth gate helpers | `client/src/_core/hooks/useAuthGate.ts:27–35` | `isAdmin`, `showAdminAllowed`, `showAdminDenied` | Client routing/display |

**Not bypassed by admin role:** table ordering (`restaurantAllowsTableOrdering`), MRR inclusion, invoice trial block, `subscriptionContributesToCommercialRevenue`.

---

## SECTION 5 — Plan Dependency Map

| Dependency type | Where used | Details |
|---|---|---|
| **`planId` on subscription row** | Limits, ordering, MRR, invoices, display | `user_subscriptions.planId` → `getSubscriptionPlanById` |
| **`plan.sortOrder`** | Trial assignment only | `resolveTrialPlanId()` picks `sortOrder === 2` (`server/create-trial-subscription.ts:22`) |
| **`subscription.status`** | All entitlement + MRR | Enum: `active`, `trial`, `canceled`, `expired` (`drizzle/schema.ts:121`) |
| **`subscription.status === "active"`** | MRR / revenue only | `subscriptionContributesToCommercialRevenue` |
| **Restaurant count** | `assertRestaurantCreateAllowed` | Compared to `limits.maxRestaurants` |
| **Owner's subscription rows** | Ordering, limits, KPIs | Keyed by `user_subscriptions.userId`; scoped by `restaurantId` for ordering |
| **Hardcoded `plan.id === 30001`** | Table ordering block | `BASIC_FREE_PLAN_ID` — independent of catalog Basic/Professional names |
| **`maxRestaurants === 1` heuristic** | Fallback limits | `getFallbackBasicLimits()` picks lowest-tier plan (`subscriptionPlanLimits.ts:29–31`) |
| **Premium template list (hardcoded)** | Template gate | Array in `routers.ts:235`; `isPremium` in `MenuTemplates.tsx:15–22` |
| **No `plan.features` JSON enforcement** | — | `features` column exists in schema/seed but **no runtime feature gate reads it** |

**Catalog vs. special plan:** Seeded Basic/Professional/Enterprise (`server/seed-plans.mjs`) are distinct from plan id `30001` used only in ordering entitlement.

---

## SECTION 6 — Feature Decision Flows

### Ordering (table → place order)

```
Customer opens /menu/:slug/table/:n
  ↓
MenuView.tsx: trpc.order.canOrder({ restaurantId })
  ↓
routers.ts:1636 → restaurantAllowsTableOrdering(restaurantId)
  ↓
db.ts:709–713 → getRestaurantById → getSubscriptionsByUser(ownerId)
  ↓
subscriptionResolver.ts:92 → resolveOrderingSubscriptionRow(restaurantId, rows)
  ↓
db.ts:718–720 → getSubscriptionPlanById(sub.planId)
  ↓
subscriptionEntitlement.ts:117 → resolveTableOrderingEntitlement(sub, plan)
  ↓ (resolveSubscriptionEntitlement → period check)
  ↓ (plan.id === 30001 ? deny : allow)
  ↓
Returns { canOrder: boolean } to client
  ↓
MenuView.tsx:68 canPlaceOrder = tableNumber && canOrder && orderingAllowed(hours)
  ↓
CartDrawer → trpc.order.create
  ↓
routers.ts:1683 → restaurantAllowsTableOrdering again (hard FORBIDDEN if false)
```

### Restaurant limit (create)

```
Dashboard/Admin → trpc.restaurant.create
  ↓
routers.ts:119 → if role !== admin → assertRestaurantCreateAllowed(userId)
  ↓
subscriptionPlanLimits.ts:75–76 → resolvePlanLimitsForUser(userId)
  ↓
getSubscriptionsByUser → pickCanonicalSubscription (account-wide)
  ↓
resolveSubscriptionEntitlement(sub) → if entitled → plan.maxRestaurants
  ↓ else getFallbackBasicLimits() → typically maxRestaurants: 1
  ↓
Compare getRestaurantsByUser(userId).length >= maxRestaurants → FORBIDDEN
```

### Premium template

```
TemplateSelector.tsx: isSubscribed = checkTrialStatus.isActive || role===admin
  ↓ (client lock on isPremium templates)
User applies → trpc.restaurant.updateTemplate
  ↓
routers.ts:235–242 → if premium template && role!==admin && !isSubscriptionActive → FORBIDDEN
  ↓
db.ts:515 → userHasSubscriptionEntitlement(all user rows)
  ↓
resolveSubscriptionEntitlement per row (trial/active + valid period)
```

### Plan quotas (categories / items)

```
category.create / menuItem.create
  ↓
assertRestaurantAccess (tenant)
  ↓
if role !== admin → assertCategoryCreateAllowed / assertMenuItemCreateAllowed
  ↓
resolvePlanLimitsForUser(userId, restaurantId)  ← restaurant-scoped sub resolution
  ↓
getRestaurantStats → compare counts
```

### MRR (admin KPI)

```
admin.getStatistics
  ↓
getAdminStatistics → computeAdminMrr(allSubs, allPlans)
  ↓
filter subscriptionContributesToCommercialRevenue(status)  // active only
  ↓
monthlyEquivalentPlanPrice(sub, plan) from subscription_plans prices
```

### Trial invoice block

```
admin.generateInvoicePDF
  ↓
getCanonicalUserSubscription(userId)
  ↓
assertSubscriptionEligibleForAdminInvoice(sub.status)  // throws if trial
```

---

## SECTION 7 — Source of Entitlement Authority

**Factual conclusion: Candidate E — combined model.**

No single layer is authoritative for all features. Implemented authority is **layered and feature-specific**:

| Layer | Authority scope |
|---|---|
| **`subscription_plans` rows** | Numeric limits (`maxRestaurants`, `maxItemsPerRestaurant`, `maxCategories`) and list prices (MRR, invoices) |
| **`user_subscriptions` rows** | Status, planId, periods, restaurant scope (`restaurantId`, `userId`) |
| **Entitlement resolvers** (`resolveSubscriptionEntitlement`, `resolveTableOrderingEntitlement`, `resolvePlanLimitsForUser`, `pickCanonicalSubscription`, `resolveOrderingSubscriptionRow`) | Runtime decision functions that combine rows + plans + time |
| **Admin role bypasses** | Parallel path: `role === "admin"` skips selected subscription/limit checks (templates, colors, fonts, quotas, tenant access) |
| **Hardcoded constants** | `BASIC_FREE_PLAN_ID = 30001` (ordering); premium template id lists (UI + router); `subscriptionContributesToCommercialRevenue` (active-only) |
| **Tenant guards** | `assertRestaurantAccess` (ownership/admin — not plan-based) |

**Which candidate dominates per feature type:**

- **Quotas:** resolver #11 + `subscription_plans` limits (with Basic fallback when unentitled)
- **Table ordering:** resolver #2 + subscription row + plan id 30001 check
- **Premium UX (templates/colors/fonts):** resolver #17 (`isSubscriptionActive`) OR admin bypass
- **Admin operations:** `assertAdminAccess` (role gate, not subscription)
- **Commercial revenue metrics:** subscription `status` via #21, not entitlement resolvers

---

## SECTION 8 — Initial Findings (facts only)

1. MineuQR uses **seven primary resolver functions** plus **assertion wrappers**; there is no unified `EntitlementService` module.

2. **`resolveSubscriptionEntitlement`** is the root period/status check; most subscription-gated features either call it directly or via `isSubscriptionActive` / `userHasSubscriptionEntitlement`.

3. **Table ordering** uses a **different resolver chain** than quota limits: restaurant-scoped `resolveOrderingSubscriptionRow` vs account-wide `pickCanonicalSubscription` for restaurant count.

4. **Plan catalog `features` JSON is not enforced** at runtime; gates use numeric columns, status, and hardcoded id `30001`.

5. **Basic/Professional/Enterprise seed names do not gate ordering** in code; only plan id `30001` blocks ordering. Error text at `order.create` references Professional/Enterprise tiers without enforcing them in code.

6. **Entitled trials** pass `isSubscriptionActive` and unlock premium templates/colors/fonts, but **do not** contribute to MRR (`subscriptionContributesToCommercialRevenue` excludes `trial`).

7. **Admin bypass** is implemented as **`role === "admin"` conditionals** adjacent to subscription checks in `routers.ts` (six mutation sites) plus client UI flags — not a centralized bypass registry.

8. **No `super_admin` role** exists in schema; Super Admin page uses the same admin role gate.

9. **No `owner` role** exists; owner semantics = `restaurants.userId === ctx.user.id`.

10. **Call waiter** and **request bill** have **no entitlement resolver or enforcement** in the codebase searched.

11. **QR menu, public menu browsing, view tracking** have **no subscription entitlement checks**.

12. **Reports/stats** for restaurant owners require **tenant access only** (`assertRestaurantAccess`), not a paid plan.

13. **Export** as a commercial-gated feature was **not found**.

14. **Frontend and server both enforce** premium templates/colors/fonts; **only server enforces** ordering and quotas.

15. **Multi-restaurant owners** can have **different subscription rows per restaurant**; ordering picks per-restaurant canonical row; restaurant **count limit** uses **one account-wide canonical** subscription.

16. **Unentitled or expired subscriptions** cause `resolvePlanLimitsForUser` to fall back to **Basic-tier limits** (`maxRestaurants: 1`, etc.), effectively restricting users without valid trial/active.

17. **Commercial metrics authority** is **`user_subscriptions.status === "active"`** for MRR, separate from entitlement resolvers used for product features.

---

*End of audit. No recommendations. No fixes. No code changes.*
