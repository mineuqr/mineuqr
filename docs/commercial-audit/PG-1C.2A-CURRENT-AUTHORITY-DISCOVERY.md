# PG-1C.2A — Commercial Authority Discovery

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.2A — identify every current source of commercial authority before implementing the Commercial Authority Layer  
**Date:** 2026-06-05  
**Mode:** Read-only audit — no code changes, no migrations, no refactors  

**Related baselines:** PG-1A entitlement/plan audits, PG-1C.1A `COMMERCIAL-AUTHORITY-SPEC.md`, PG-1C.1B `docs/commercial-spec/PLAN-FEATURE-MATRIX.md`

---

## Scope

This document inventories every runtime location that currently influences:

- Plan behavior
- Feature access
- Entitlements
- Restaurant limits
- Trial behavior
- Subscription state
- Billing eligibility
- Revenue inclusion/exclusion
- Admin bypasses
- Feature flags
- Plan-specific UI visibility

**Search targets used:** `plan`, `planType`, `subscription`, `subscriptionStatus`, `entitlement`, `feature`, `featureFlag`, `trial`, `trialEndAt`, `maxRestaurants`, `restaurantLimit`, `isAdmin`, `admin`, `enterprise`, `professional`, `basic`, `invoice`, `revenue`, `MRR`, `billing`.

**Feature flags:** No `featureFlag` / `feature_flag` symbols exist in the codebase. Commercial gating is implemented via subscription status, plan ID, role checks, and hardcoded feature lists — not a feature-flag system.

---

## Authority Type Legend

| Type | Meaning |
|------|---------|
| **FEATURE_AUTHORITY** | Grants or denies a product capability (ordering, templates, customization, etc.) |
| **LIMIT_AUTHORITY** | Enforces numeric quotas (restaurants, categories, menu items) |
| **TRIAL_AUTHORITY** | Creates, resolves, or evaluates trial lifecycle |
| **BILLING_AUTHORITY** | Checkout, activation, invoicing, MRR/revenue inclusion |
| **ADMIN_AUTHORITY** | Admin role bypass or admin-only commercial operations |
| **UI_AUTHORITY** | Client-side visibility, locks, warnings, or analytics display (may duplicate server rules) |

---

## 1. Core Entitlement & Resolution (Server)

| # | File | Function | Purpose | Authority Type |
|---|------|----------|---------|----------------|
| 1 | `server/subscriptionEntitlement.ts` | `BASIC_FREE_PLAN_ID` (30001) | Hardcoded Basic plan ID; blocks table ordering for this plan | FEATURE_AUTHORITY |
| 2 | `server/subscriptionEntitlement.ts` | `resolveSubscriptionEntitlement` | Canonical period/status gate: trial uses `trialEndsAt`, active uses `currentPeriodEnd`; canceled/expired denied | FEATURE_AUTHORITY |
| 3 | `server/subscriptionEntitlement.ts` | `resolveTableOrderingEntitlement` | Table ordering: entitled subscription + plan ≠ Basic (30001) | FEATURE_AUTHORITY |
| 4 | `server/subscriptionEntitlement.ts` | `userHasSubscriptionEntitlement` | Any row entitled now (used by account-level active check) | FEATURE_AUTHORITY |
| 5 | `server/subscriptionResolver.ts` | `subscriptionEntitledNow` | Delegates to `resolveSubscriptionEntitlement` for ranking | FEATURE_AUTHORITY |
| 6 | `server/subscriptionResolver.ts` | `subscriptionPeriodEndInstant` | Period end for trial vs active (ranking ties) | TRIAL_AUTHORITY |
| 7 | `server/subscriptionResolver.ts` | `subscriptionCanonicalRank` | Priority: entitled trial/active → lapsed trial/active → canceled/expired | FEATURE_AUTHORITY |
| 8 | `server/subscriptionResolver.ts` | `compareSubscriptionsCanonical` | Deterministic sort when multiple subscription rows compete | FEATURE_AUTHORITY |
| 9 | `server/subscriptionResolver.ts` | `pickCanonicalSubscription` | Single canonical row from a set (account or restaurant scope) | FEATURE_AUTHORITY |
| 10 | `server/subscriptionResolver.ts` | `pickUserLevelSubscription` | Canonical pick among `restaurantId = 0` rows | FEATURE_AUTHORITY |
| 11 | `server/subscriptionResolver.ts` | `resolveOrderingSubscriptionRow` | Ordering scope: restaurant row first, then user-level row | FEATURE_AUTHORITY |
| 12 | `server/subscriptionActivation.ts` | `resolveSubscriptionForActivationFromRows` | Payment/webhook target row: id → restaurant → planId → user-level → canonical | BILLING_AUTHORITY |
| 13 | `server/db.ts` | `getCanonicalUserSubscription` | Account-level canonical subscription for owner APIs | FEATURE_AUTHORITY |
| 14 | `server/db.ts` | `getSubscriptionForRestaurant` | Restaurant-scoped canonical subscription | FEATURE_AUTHORITY |
| 15 | `server/db.ts` | `getOrderingSubscriptionForRestaurant` | Subscription row used for table ordering resolution | FEATURE_AUTHORITY |
| 16 | `server/db.ts` | `isSubscriptionActive` | Account-level “any entitled trial/active” boolean | FEATURE_AUTHORITY |
| 17 | `server/db.ts` | `getTrialEndDate` | Trial end from canonical trial row | TRIAL_AUTHORITY |
| 18 | `server/db.ts` | `restaurantAllowsTableOrdering` | Composes ordering subscription + plan + `resolveTableOrderingEntitlement` | FEATURE_AUTHORITY |
| 19 | `server/db.ts` | `resolveSubscriptionForActivation` | DB wrapper for activation row pick | BILLING_AUTHORITY |
| 20 | `server/db.ts` | `updateSubscriptionForActivation` | Updates single activation target row (never all user rows) | BILLING_AUTHORITY |

---

## 2. Plan Limits (Server)

| # | File | Function | Purpose | Authority Type |
|---|------|----------|---------|----------------|
| 21 | `server/subscriptionPlanLimits.ts` | `DEFAULT_LIMITS` | Hardcoded fallback `{ maxRestaurants: 1, maxItemsPerRestaurant: 100, maxCategories: 10 }` | LIMIT_AUTHORITY |
| 22 | `server/subscriptionPlanLimits.ts` | `getFallbackBasicLimits` | When unentitled: plan with `maxRestaurants === 1`, else lowest tier from DB | LIMIT_AUTHORITY |
| 23 | `server/subscriptionPlanLimits.ts` | `resolvePlanLimitsForUser` | Canonical limits from entitled sub + plan; account vs restaurant-scoped pick | LIMIT_AUTHORITY |
| 24 | `server/subscriptionPlanLimits.ts` | `assertRestaurantCreateAllowed` | Blocks create when `restaurants.length >= maxRestaurants` | LIMIT_AUTHORITY |
| 25 | `server/subscriptionPlanLimits.ts` | `assertCategoryCreateAllowed` | Blocks category create at `maxCategories` | LIMIT_AUTHORITY |
| 26 | `server/subscriptionPlanLimits.ts` | `assertMenuItemCreateAllowed` | Blocks item create at `maxItemsPerRestaurant` | LIMIT_AUTHORITY |
| 27 | `drizzle/schema.ts` | `subscriptionPlans` columns | DB defaults: `maxRestaurants` 1, `maxItemsPerRestaurant` 100, `maxCategories` 10 | LIMIT_AUTHORITY |
| 28 | `server/seed-plans.mjs` | plan seed array | Seeds Basic/Professional/Enterprise limits and prices into `subscription_plans` | LIMIT_AUTHORITY |

---

## 3. Trial Lifecycle (Server)

| # | File | Function | Purpose | Authority Type |
|---|------|----------|---------|----------------|
| 29 | `server/create-trial-subscription.ts` | `TRIAL_DAYS` (14) | Self-service trial duration | TRIAL_AUTHORITY |
| 30 | `server/create-trial-subscription.ts` | `TRIAL_PLAN_SORT_ORDER` (2) | Trial maps to Professional tier via `sortOrder` | TRIAL_AUTHORITY |
| 31 | `server/create-trial-subscription.ts` | `ORDERING_FREE_PLAN_ID` (30001) | Excludes Basic from trial plan resolution | TRIAL_AUTHORITY |
| 32 | `server/create-trial-subscription.ts` | `resolveTrialPlanId` | Resolves Professional plan ID from catalog | TRIAL_AUTHORITY |
| 33 | `server/create-trial-subscription.ts` | `buildTrialSubscriptionPayload` | Builds 14-day trial row with `status: "trial"` | TRIAL_AUTHORITY |
| 34 | `server/create-trial-subscription.ts` | `buildTrialSubscriptionForUser` | Resolves plan + builds payload | TRIAL_AUTHORITY |
| 35 | `server/create-trial-subscription.ts` | `createTrialSubscription` | Inserts trial row on signup paths | TRIAL_AUTHORITY |
| 36 | `server/auth-local/registerOwner.ts` | register transaction | Inserts `buildTrialSubscriptionForUser` on owner registration | TRIAL_AUTHORITY |
| 37 | `server/adminSubscriptionHelpers.ts` | `ADMIN_TRIAL_DAYS` (14) | Admin-created trial period default | TRIAL_AUTHORITY |
| 38 | `server/adminSubscriptionHelpers.ts` | `computeAdminSubscriptionPeriodEnd` | Period end for admin subs (trial = +14 days) | TRIAL_AUTHORITY |
| 39 | `server/adminSubscriptionHelpers.ts` | `buildAdminSubscriptionInsert` | Admin trial rows get `trialEndsAt` aligned with period end | TRIAL_AUTHORITY |
| 40 | `server/adminSubscriptionHelpers.ts` | `applyAdminTrialStatusUpdate` | Sets `trialEndsAt` when admin sets status to trial | TRIAL_AUTHORITY |

---

## 4. Billing, Revenue & Invoices (Server)

| # | File | Function | Purpose | Authority Type |
|---|------|----------|---------|----------------|
| 41 | `server/adminKpiCalculations.ts` | `subscriptionContributesToCommercialRevenue` | Only `status === "active"` counts toward MRR/revenue (trials excluded) | BILLING_AUTHORITY |
| 42 | `server/adminKpiCalculations.ts` | `monthlyEquivalentPlanPrice` | Normalizes yearly plans to monthly for MRR | BILLING_AUTHORITY |
| 43 | `server/adminKpiCalculations.ts` | `computeAdminMrr` | Sums MRR from paid active subs only | BILLING_AUTHORITY |
| 44 | `server/adminKpiCalculations.ts` | `computeRenewalRate` | Active + trial over total subs | BILLING_AUTHORITY |
| 45 | `server/adminKpiCalculations.ts` | `computeChurnRate` | Canceled + expired over total subs | BILLING_AUTHORITY |
| 46 | `server/db.ts` | `getAdminStatistics` | Admin KPI aggregate: active/trial counts, MRR via `computeAdminMrr`, by-plan breakdown | BILLING_AUTHORITY |
| 47 | `server/db.ts` | `getRevenueByMonth` | Monthly revenue buckets; filters via `subscriptionContributesToCommercialRevenue` | BILLING_AUTHORITY |
| 48 | `server/db.ts` | `getSubscriptionDetails` | Admin subscription detail export (all rows) | BILLING_AUTHORITY |
| 49 | `server/adminSubscriptionHelpers.ts` | `assertSubscriptionEligibleForAdminInvoice` | Blocks invoice generation for `status === "trial"` | BILLING_AUTHORITY |
| 50 | `server/paypal-webhook.ts` | webhook handler | Activates subscription on payment: `planId`, clears trial, sets active period | BILLING_AUTHORITY |
| 51 | `server/tap-webhook.ts` | webhook handler | Same activation path via Tap metadata | BILLING_AUTHORITY |

---

## 5. Admin Role & Bypasses (Server)

| # | File | Function | Purpose | Authority Type |
|---|------|----------|---------|----------------|
| 52 | `server/_core/assertAdminAccess.ts` | `assertAdminAccess` | Requires `ctx.user.role === "admin"` for admin procedures | ADMIN_AUTHORITY |
| 53 | `server/_core/trpc.ts` | `adminProcedure` | Middleware: admin role gate | ADMIN_AUTHORITY |
| 54 | `server/restaurantAccess.ts` | `assertRestaurantAccess` | Tenant guard; admins bypass ownership check | ADMIN_AUTHORITY |
| 55 | `server/_core/emailVerificationPolicy.ts` | `isEmailVerificationRequired` | Admins exempt from email verification requirement | ADMIN_AUTHORITY |
| 56 | `server/routers.ts` | `restaurant.create` | Skips `assertRestaurantCreateAllowed` when `role === "admin"` | ADMIN_AUTHORITY |
| 57 | `server/routers.ts` | `restaurant.updateTemplate` | Skips `isSubscriptionActive` when `role === "admin"` | ADMIN_AUTHORITY |
| 58 | `server/routers.ts` | `restaurant.updateCustomColors` | Skips subscription check for admin | ADMIN_AUTHORITY |
| 59 | `server/routers.ts` | `restaurant.updateCustomFonts` | Skips subscription check for admin | ADMIN_AUTHORITY |
| 60 | `server/routers.ts` | `category.create` | Skips `assertCategoryCreateAllowed` for admin | ADMIN_AUTHORITY |
| 61 | `server/routers.ts` | `menuItem.create` | Skips `assertMenuItemCreateAllowed` for admin | ADMIN_AUTHORITY |
| 62 | `server/routers.ts` | `admin.*` procedures | ~20 admin mutations/queries gated by `assertAdminAccess` (stats, subs, invoices, users) | ADMIN_AUTHORITY |
| 63 | `server/adminSubscriptionHelpers.ts` | `resolveAdminRestaurantOwnerUserId` | Admin restaurant creation owner resolution | ADMIN_AUTHORITY |

---

## 6. Router Enforcement Points (Server)

| # | File | Function / Procedure | Purpose | Authority Type |
|---|------|----------------------|---------|----------------|
| 64 | `server/routers.ts` | `restaurant.updateTemplate` | Hardcoded `premiumTemplates` list; requires `isSubscriptionActive` unless admin | FEATURE_AUTHORITY |
| 65 | `server/routers.ts` | `restaurant.updateCustomColors` | Paid customization gate via `isSubscriptionActive` | FEATURE_AUTHORITY |
| 66 | `server/routers.ts` | `restaurant.updateCustomFonts` | Paid font customization gate via `isSubscriptionActive` | FEATURE_AUTHORITY |
| 67 | `server/routers.ts` | `category.create` | Plan category limit enforcement | LIMIT_AUTHORITY |
| 68 | `server/routers.ts` | `menuItem.create` | Plan menu item limit enforcement | LIMIT_AUTHORITY |
| 69 | `server/routers.ts` | `restaurant.create` | Plan restaurant limit enforcement | LIMIT_AUTHORITY |
| 70 | `server/routers.ts` | `subscription.listPlans` | Public plan catalog (prices, limits from DB) | FEATURE_AUTHORITY |
| 71 | `server/routers.ts` | `subscription.getCurrentSubscription` | Owner account canonical sub + plan | FEATURE_AUTHORITY |
| 72 | `server/routers.ts` | `subscription.getByRestaurant` | Restaurant-scoped sub + plan (differs from account canonical) | FEATURE_AUTHORITY |
| 73 | `server/routers.ts` | `subscription.checkTrialStatus` | Returns `isSubscriptionActive` + `getTrialEndDate` | TRIAL_AUTHORITY |
| 74 | `server/routers.ts` | `subscription.createCheckoutSession` | PayPal checkout; validates plan exists and price | BILLING_AUTHORITY |
| 75 | `server/routers.ts` | `subscription.createTapCheckout` | Tap checkout; attaches canonical sub metadata | BILLING_AUTHORITY |
| 76 | `server/routers.ts` | `admin.generateInvoicePDF` | Invoice creation; calls `assertSubscriptionEligibleForAdminInvoice` | BILLING_AUTHORITY |
| 77 | `server/routers.ts` | `admin.createUserSubscriptionByAdmin` | Admin creates sub with trial/active status and period | TRIAL_AUTHORITY |
| 78 | `server/routers.ts` | `admin.updateUserSubscriptionByAdmin` | Admin edits plan/status/trial fields | TRIAL_AUTHORITY |
| 79 | `server/routers.ts` | `order.canOrder` | Public ordering eligibility via `restaurantAllowsTableOrdering` | FEATURE_AUTHORITY |
| 80 | `server/routers.ts` | `order.create` | Server-side ordering gate + restaurant operational checks | FEATURE_AUTHORITY |

---

## 7. Admin Data Aggregation (Server — Commercial Read Models)

| # | File | Function | Purpose | Authority Type |
|---|------|----------|---------|----------------|
| 81 | `server/db.ts` | `getAllRestaurantsWithSubscriptions` | Joins restaurant → owner subs; picks restaurant row then user-level | BILLING_AUTHORITY |
| 82 | `server/db.ts` | `getAllUsersWithSubscriptions` | **Non-canonical** `allSubs.find(s => s.userId === u.id)` for admin user list | BILLING_AUTHORITY |

---

## 8. Client UI Authority

| # | File | Function / Component | Purpose | Authority Type |
|---|------|----------------------|---------|----------------|
| 83 | `client/src/pages/TemplateSelector.tsx` | `isSubscribed` | `checkTrialStatus.isActive \|\| role === "admin"` — unlocks premium UI | UI_AUTHORITY |
| 84 | `client/src/pages/TemplateSelector.tsx` | template grid | `isLocked = template.isPremium && !isSubscribed` | UI_AUTHORITY |
| 85 | `client/src/components/MenuTemplates.tsx` | `TEMPLATES[].isPremium` | Hardcoded premium template catalog (7 premium, 1 free) | UI_AUTHORITY |
| 86 | `client/src/components/ColorCustomizer.tsx` | `canCustomizeColors` | `isSubscribed \|\| isAdmin` before save UI | UI_AUTHORITY |
| 87 | `client/src/components/FontCustomizer.tsx` | `canCustomizeFonts` | `isSubscribed \|\| isAdmin` before save UI | UI_AUTHORITY |
| 88 | `client/src/pages/MenuView.tsx` | `canOrder` / `canPlaceOrder` | Uses `order.canOrder` + hours/closure (server is source of truth for entitlement) | UI_AUTHORITY |
| 89 | `client/src/pages/Dashboard.tsx` | `subscriptionWarning` | Client-side expiry warning from `getByRestaurant` (7-day window) | UI_AUTHORITY |
| 90 | `client/src/pages/Dashboard.tsx` | `ReportsTab` / `exportMonthlyExcel` | Excel export has **no** subscription/plan gate (presentation only) | UI_AUTHORITY |
| 91 | `client/src/pages/Pricing.tsx` | trial banner + checkout | Displays trial status; initiates checkout mutations | UI_AUTHORITY |
| 92 | `client/src/pages/SubscriptionManagement.tsx` | subscription display | Shows `getCurrentSubscription` status and period | UI_AUTHORITY |
| 93 | `client/src/pages/PaymentHistory.tsx` | plan name display | Reads current subscription plan | UI_AUTHORITY |
| 94 | `client/src/pages/SubscriptionSuccess.tsx` | post-payment UI | Polls `getCurrentSubscription` after checkout | UI_AUTHORITY |
| 95 | `client/src/lib/admin/computeAdminKPIs.ts` | `computeAdminKPIs` | Client recomputes active restaurants/expiring from subscription status on restaurant list | UI_AUTHORITY |
| 96 | `client/src/components/admin/layout/AdminKPISection.tsx` | MRR display | Renders `kpis.estimatedMrr` from server stats | UI_AUTHORITY |
| 97 | `client/src/pages/Statistics.tsx` | admin analytics | MRR, trial counts, subscriptions-by-plan charts | UI_AUTHORITY |
| 98 | `client/src/pages/AdminManagement.tsx` | subscription admin UI | Create/edit/cancel subs; invoice triggers; status filters | UI_AUTHORITY |
| 99 | `client/src/_core/hooks/useAuthGate.ts` | `isAdmin`, `showAdminAllowed` | Route visibility for admin surfaces | ADMIN_AUTHORITY |
| 100 | `client/src/lib/queryRuntime.ts` | `adminQueriesEnabled` | Enables admin tRPC queries when admin authenticated | ADMIN_AUTHORITY |
| 101 | `client/src/components/landing/LandingNavbar.tsx` | admin nav links | Shows admin entry when `role === "admin"` | ADMIN_AUTHORITY |

---

## Commercial Authority Inventory

### Total authority locations

| Category | Count |
|----------|------:|
| Core entitlement & resolution (server) | 20 |
| Plan limits (server + schema + seed) | 8 |
| Trial lifecycle (server) | 12 |
| Billing, revenue & invoices (server) | 11 |
| Admin role & bypasses (server) | 12 |
| Router enforcement (server) | 17 |
| Admin data aggregation (server) | 2 |
| Client UI authority | 19 |
| **Total documented locations** | **101** |

*Tests (`*.test.ts`) mirror many of these rules but are excluded from runtime authority counts.*

---

### Duplicate authority locations

| Duplicate cluster | Locations | Risk |
|-------------------|-----------|------|
| **Account “active subscription” boolean** | `resolveSubscriptionEntitlement` → `userHasSubscriptionEntitlement` → `isSubscriptionActive` → `subscription.checkTrialStatus` → client `isSubscribed` | Same concept exposed through 5 paths; client and server can diverge if APIs use different subscription scope |
| **Subscription row selection** | `pickCanonicalSubscription`, `resolveOrderingSubscriptionRow`, `getSubscriptionForRestaurant`, `getCanonicalUserSubscription`, `getAllUsersWithSubscriptions` (non-canonical `find`) | Hybrid restaurant-scoped vs account-scoped model; admin user list uses first matching row, not canonical pick |
| **Premium template allowlist** | `server/routers.ts` `premiumTemplates` array, `client/.../MenuTemplates.tsx` `isPremium`, `server/templates.test.ts` | Three copies; adding a template requires coordinated edits |
| **Basic plan ID constant** | `BASIC_FREE_PLAN_ID` (exported), `ORDERING_FREE_PLAN_ID` (private duplicate in trial module) | Same ID (30001) defined twice under different names |
| **Trial duration constant** | `TRIAL_DAYS` (14), `ADMIN_TRIAL_DAYS` (14) | Duplicated magic number in self-service vs admin paths |
| **Template/color/font gating** | Server mutations (`isSubscriptionActive`) + client (`isSubscribed \|\| isAdmin`) | UI can show unlocked state if client logic differs; server still enforces on save |
| **Dashboard vs template subscription API** | Dashboard uses `getByRestaurant`; TemplateSelector uses `checkTrialStatus` (account-level) | Per-restaurant vs account-level mismatch on multi-location accounts |
| **MRR / active counts** | `computeAdminMrr` (server), `getAdminStatistics`, client `computeAdminKPIs` (re-derives active restaurants from status) | Client KPI strip partially re-implements server counting rules |
| **Table ordering plan rule** | Only `plan.id === 30001` blocked; Professional trial on plan 30002 **can** order | Plan identity by numeric ID, not named tier enum |

---

### Hardcoded plan checks

| Location | Check | Notes |
|----------|-------|-------|
| `server/subscriptionEntitlement.ts` | `plan.id === BASIC_FREE_PLAN_ID` (30001) | Only explicit plan-tier feature gate in server |
| `server/create-trial-subscription.ts` | `p.id !== ORDERING_FREE_PLAN_ID` (30001) | Excludes Basic from trial assignment |
| `server/create-trial-subscription.ts` | `p.sortOrder === TRIAL_PLAN_SORT_ORDER` (2) | Trial → Professional by sort order, not plan name |
| `server/routers.ts` | `premiumTemplates.includes(...)` | 7 template IDs hardcoded; not driven by plan feature matrix |
| `client/src/components/MenuTemplates.tsx` | `isPremium: true/false` per template | UI catalog independent of DB plan `features` JSON |
| `server/subscriptionPlanLimits.ts` | `p.maxRestaurants === 1` | Identifies “basic tier” by limit heuristic, not plan ID or name |

**Not found:** No runtime references to string plan types (`BASIC`, `PROFESSIONAL`, `ENTERPRISE`) or `planType` field — all logic uses numeric `planId`, `sortOrder`, or limit heuristics.

---

### Hardcoded limits

| Location | Values | When applied |
|----------|--------|--------------|
| `server/subscriptionPlanLimits.ts` `DEFAULT_LIMITS` | 1 restaurant, 100 items, 10 categories | No plans in DB |
| `drizzle/schema.ts` `subscriptionPlans` defaults | Same as above | Schema default on insert |
| `server/seed-plans.mjs` | Basic 1/100/10; Pro 5/500/25; Enterprise higher | Seed/catalog source (runtime reads DB) |
| Trial plan | Inherits Professional limits from resolved plan row | Via `resolveTrialPlanId` → plan limits in `resolvePlanLimitsForUser` |

**Unlimited limits:** No `null` unlimited convention in current code; limits are always numeric from plan row or fallback.

---

### Commercial risks

| ID | Risk | Severity | Evidence |
|----|------|----------|----------|
| R1 | **No single commercial authority function** — 101 scattered locations vs target `resolveCommercialEntitlements()` | High | This inventory |
| R2 | **Hybrid subscription scope** — account-level (`restaurantId=0`) vs per-restaurant rows resolved differently per feature | High | `resolveOrderingSubscriptionRow` vs `getByRestaurant` vs `getCurrentSubscription` |
| R3 | **Basic plan ordering gap** — only plan 30001 blocked; entitled Basic on other IDs or mis-seeded plans could order | Medium | `resolveTableOrderingEntitlement` |
| R4 | **Trial gets Professional features including ordering** — trial rows use Professional `planId`; MRR excludes trials but feature gates treat trial as entitled | Medium | `create-trial-subscription.ts` + `isSubscriptionActive` |
| R5 | **MRR counts subscription rows, not unique owners** — multi-row owners inflate MRR | High | `computeAdminMrr` iterates all `user_subscriptions` rows |
| R6 | **Admin user subscription join is non-canonical** — `getAllUsersWithSubscriptions` uses first `find` by userId | Medium | `server/db.ts` ~L980 |
| R7 | **Client/server duplicate gates** — premium UI can disagree with enforcement edge cases | Medium | TemplateSelector + routers |
| R8 | **Feature matrix not implemented** — 22 feature keys in PG-1C.1B spec; runtime uses ad hoc checks (templates list, ordering plan ID, limits only) | High | No `feature`/`entitlement` key lookups in runtime |
| R9 | **Excel/report export ungated** — Reports tab export has no plan check (may be intentional presentation) | Low | `Dashboard.tsx` ReportsTab |
| R10 | **Plan catalog/pricing drift** — seed script prices differ from PG-1B snapshot ($19/$35/$59 seed vs $39/$99 live snapshot in PG-1B.2) | Medium | `seed-plans.mjs` vs commercial snapshot |
| R11 | **Admin bypass is broad** — admin skips all limit asserts and subscription feature gates on mutations | Medium | `routers.ts` role checks |
| R12 | **Revenue-by-month uses `createdAt` bucket** — not recurring MRR logic; can misstate commercial trends | Medium | `getRevenueByMonth` |
| R13 | **No feature-flag layer** — cannot toggle commercial rules without code deploy | Low | Zero `featureFlag` references |

---

## Summary for PG-1C.2 Implementation

Current commercial authority is **distributed** across:

1. **Entitlement module** (`subscriptionEntitlement.ts`, `subscriptionResolver.ts`) — period validity and Basic ordering block  
2. **Limits module** (`subscriptionPlanLimits.ts`) — quota enforcement with Basic fallback  
3. **Trial module** (`create-trial-subscription.ts`, admin helpers, register flow)  
4. **Billing module** (`adminKpiCalculations.ts`, webhooks, invoice guard)  
5. **Router inline gates** — premium templates, admin bypasses, ordering  
6. **Client UI mirrors** — locks, warnings, admin KPI presentation  

There is **no** centralized `resolveCommercialEntitlements()`, **no** plan-name enum in logic, **no** feature-flag system, and **no** owner-centric single-subscription enforcement at runtime — matching gaps identified in PG-1A.6 and the approved PG-1C.1A target spec.

**Next step (out of scope for PG-1C.2A):** PG-1C.2 — implement Commercial Authority Layer per `COMMERCIAL-AUTHORITY-SPEC.md` and `PLAN-FEATURE-MATRIX.md`.

---

*Audit only. No implementation.*
