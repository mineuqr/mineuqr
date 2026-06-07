# PG-1C.4A — Server Gate Discovery & Enforcement Planning

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.4A — discover and classify all remaining server-side commercial gates  
**Date:** 2026-06-07  
**Mode:** Audit only — no runtime changes, no enforcement changes, no billing impact, no code modifications  

**Upstream artifacts:**

- PG-1C.2A `PG-1C.2A-CURRENT-AUTHORITY-DISCOVERY.md` (101 legacy authority locations)
- PG-1C.2C `PG-1C.2C-AUTHORITY-VERIFICATION.md` (6 runtime mismatches)
- PG-1C.2D `PG-1C.2D-RUNTIME-ALIGNMENT.md` (AD-1 through AD-7)
- PG-1C.2E `PG-1C.2E-COMMERCIAL-CONTEXT-INTEGRATION.md` (`commercial.getEntitlements`)
- PG-1C.3A–3C client visibility consolidation (complete)

**Evidence:** Read-only codebase search across `server/**/*` for `isSubscriptionActive`, `planId`, trial/status checks, role bypasses, premium templates, limits, and feature restrictions. No tests executed (audit-only deliverable).

---

## 1. Executive Summary

| Dimension | Finding |
|---|---|
| **Canonical read path** | `commercial.getEntitlements` (PG-1C.2E) is live and read-only — does **not** gate mutations |
| **Legacy enforcement hub** | `server/subscriptionEntitlement.ts` + `server/subscriptionPlanLimits.ts` + `server/db.ts` + `server/routers.ts` |
| **Active mutation gates** | **11** owner-facing enforcement points in `routers.ts` (templates, customization, limits, ordering) |
| **Billing / lifecycle gates** | **15+** locations (checkout, webhooks, admin CRUD, trial creation, invoice eligibility, MRR/revenue) |
| **21-key matrix coverage** | **3 fully enforced**, **5 partially enforced**, **13 not enforced** on server |
| **Client vs server gap** | Client visibility consolidated (PG-1C.3C); server still uses coarse `isSubscriptionActive` and `planId === 30001` |

**Headline:** Server commercial authority is **fragmented** across boolean subscription checks, numeric plan IDs, DB plan rows, and admin role bypasses. The resolver layer is spec-complete but **not wired into mutation paths**. PG-1C.4A produces the migration map; implementation belongs to PG-1C.4B+.

**Risk posture:**

| Classification | Count (server gates) | Share |
|---|---:|---:|
| SAFE_TO_MIGRATE | 4 | 15% |
| MEDIUM_RISK | 14 | 52% |
| HIGH_RISK | 9 | 33% |

---

## 2. Server Gate Inventory

### 2.1 Core helpers & resolution (authority primitives)

These are not procedure gates themselves but **every mutation gate delegates to them**.

| ID | File | Function | Gate purpose | Current logic |
|---|---|---|---|---|
| S-01 | `server/subscriptionEntitlement.ts` | `resolveSubscriptionEntitlement` | Period-valid trial/active check | `trial` → `trialEndsAt`; `active` → `currentPeriodEnd`; canceled/expired denied |
| S-02 | `server/subscriptionEntitlement.ts` | `resolveTableOrderingEntitlement` | Table ordering eligibility | Entitled subscription **and** `plan.id !== 30001` |
| S-03 | `server/subscriptionEntitlement.ts` | `userHasSubscriptionEntitlement` | Account-level entitled-any-row | `rows.some(resolveSubscriptionEntitlement.isEntitled)` |
| S-04 | `server/subscriptionEntitlement.ts` | `BASIC_FREE_PLAN_ID` | Hardcoded Basic plan | Constant `30001` |
| S-05 | `server/db.ts` | `isSubscriptionActive` | Boolean “any entitled sub” | Delegates to S-03 across all user rows |
| S-06 | `server/db.ts` | `getTrialEndDate` | Trial end for legacy API | Canonical trial row `trialEndsAt` |
| S-07 | `server/db.ts` | `restaurantAllowsTableOrdering` | Guest ordering probe | `resolveOrderingSubscriptionRow` → plan → S-02 |
| S-08 | `server/subscriptionPlanLimits.ts` | `resolvePlanLimitsForUser` | Quota source | Entitled sub + DB plan limits; else `getFallbackBasicLimits()` (1/10/100) |
| S-09 | `server/subscriptionPlanLimits.ts` | `getFallbackBasicLimits` | Unentitled fallback | Basic-tier DB row or `DEFAULT_LIMITS` |
| S-10 | `server/subscriptionResolver.ts` | `pickCanonicalSubscription` | Row selection | Deterministic rank across duplicate rows |
| S-11 | `server/subscriptionResolver.ts` | `resolveOrderingSubscriptionRow` | Ordering scope | Restaurant row first, then account-level (`restaurantId = 0`) |
| S-12 | `server/subscriptionResolver.ts` | `pickUserLevelSubscription` | Account-level pick | Used by `buildCommercialContextFromDb` (PG-1C.2E) |
| S-13 | `server/commercial/buildCommercialContextFromDb.ts` | `buildCommercialContextFromDb` | Canonical context adapter | `pickUserLevelSubscription` + `mapPlanIdToCatalogPlan`; admin → ADMIN plan |
| S-14 | `server/commercial/getCommercialEntitlements.ts` | `getCommercialEntitlements` | Read-only entitlements | Context → `resolveCommercialEntitlements` — **no enforcement** |

### 2.2 Router mutation gates (`server/routers.ts`)

| ID | Procedure | Gate purpose | Current logic | Admin bypass |
|---|---|---|---|---|
| S-15 | `restaurant.create` | Restaurant count limit | `assertRestaurantCreateAllowed` unless `role === "admin"` | Yes |
| S-16 | `restaurant.updateTemplate` | Premium template lock | `premiumTemplates.includes(template)` → `isSubscriptionActive` | Yes (`role === "admin"`) |
| S-17 | `restaurant.updateCustomColors` | Color customization | `isSubscriptionActive` (any entitled tier) | Yes |
| S-18 | `restaurant.updateCustomFonts` | Font customization | `isSubscriptionActive` (any entitled tier) | Yes |
| S-19 | `category.create` | Category count limit | `assertCategoryCreateAllowed` unless admin | Yes |
| S-20 | `menuItem.create` | Menu item count limit | `assertMenuItemCreateAllowed` unless admin | Yes |
| S-21 | `order.canOrder` | Guest ordering visibility | `restaurantAllowsTableOrdering` | N/A (public read) |
| S-22 | `order.create` | Guest order placement | `restaurantAllowsTableOrdering` + restaurant hours/closure | N/A (public) |

**No commercial gate found** on: `restaurant.update` (incl. `tableLabel` hotel/rooms), offers CRUD, tables CRUD, order list/status, menu item update/delete, image uploads, reports/statistics queries.

### 2.3 Router read / legacy APIs (`server/routers.ts`)

| ID | Procedure | Gate purpose | Current logic |
|---|---|---|---|
| S-23 | `subscription.checkTrialStatus` | Legacy trial probe | `isSubscriptionActive` + `getTrialEndDate` |
| S-24 | `subscription.getCurrentSubscription` | Billing/display read | `getCanonicalUserSubscription` + plan row |
| S-25 | `subscription.getByRestaurant` | Scoped subscription read | `getSubscriptionForRestaurant` + plan row |
| S-26 | `subscription.listPlans` | Public catalog | No gate |
| S-27 | `commercial.getEntitlements` | Canonical read (PG-1C.2E) | `getCommercialEntitlements` — read-only |

### 2.4 Limit assertion helpers (`server/subscriptionPlanLimits.ts`)

| ID | Function | Gate purpose | Current logic |
|---|---|---|---|
| S-28 | `assertRestaurantCreateAllowed` | Block restaurant create at cap | `restaurants.length >= limits.maxRestaurants` |
| S-29 | `assertCategoryCreateAllowed` | Block category create at cap | `stats.totalCategories >= limits.maxCategories` |
| S-30 | `assertMenuItemCreateAllowed` | Block item create at cap | `stats.totalItems >= limits.maxItemsPerRestaurant` |

Limits sourced from S-08; Enterprise uses DB magic numbers (999/9999/100), not resolver `null`.

### 2.5 Trial lifecycle (server)

| ID | File | Function | Gate purpose | Current logic |
|---|---|---|---|---|
| S-31 | `server/create-trial-subscription.ts` | `createTrialSubscription` | Self-service trial insert | 14-day trial, Professional `planId` via `sortOrder === 2` |
| S-32 | `server/create-trial-subscription.ts` | `resolveTrialPlanId` | Trial plan selection | Excludes `30001`; picks Professional tier |
| S-33 | `server/auth-local/registerOwner.ts` | register transaction | Trial on signup | Inserts `buildTrialSubscriptionForUser` |
| S-34 | `server/adminSubscriptionHelpers.ts` | `applyAdminTrialStatusUpdate` | Admin trial rows | Sets `trialEndsAt` / `currentPeriodEnd` |
| S-35 | `server/adminSubscriptionHelpers.ts` | `computeAdminSubscriptionPeriodEnd` | Admin period computation | Trial = 14 days; monthly/yearly offsets |

### 2.6 Billing, subscriptions, invoices (HIGH)

| ID | File / procedure | Gate purpose | Current logic |
|---|---|---|---|
| S-36 | `subscription.createCheckoutSession` | PayPal checkout | Validates `planId` exists; no entitlement pre-check |
| S-37 | `subscription.createTapCheckout` | Tap checkout | Same; embeds `plan_id` in metadata |
| S-38 | `server/paypal-webhook.ts` | `handlePayPalWebhook` | Payment activation | `updateSubscriptionForActivation` with `planId` |
| S-39 | `server/tap-webhook.ts` | `handleTapWebhook` | Tap activation | `updateSubscriptionForActivation` / `updateSubscriptionById` |
| S-40 | `server/subscriptionActivation.ts` | `resolveSubscriptionForActivationFromRows` | Activation row pick | id → restaurant → planId → user-level → canonical |
| S-41 | `admin.createRestaurantSubscription` | Admin subscription create | `buildAdminSubscriptionInsert` with `planId` |
| S-42 | `admin.updateRestaurantSubscription` | Admin subscription update | Direct `planId` / `status` writes |
| S-43 | `admin.createUserSubscriptionByAdmin` | User-level admin create | Same pattern |
| S-44 | `admin.updateUserSubscriptionByAdmin` | User-level admin update | Same pattern |
| S-45 | `admin.generateInvoicePDF` | Invoice generation | `assertSubscriptionEligibleForAdminInvoice` — blocks `trial` |
| S-46 | `admin.cancelRestaurantSubscription` | Cancellation | Status write; email side-effect |

### 2.7 Revenue / MRR / admin KPIs (HIGH)

| ID | File | Function | Gate purpose | Current logic |
|---|---|---|---|---|
| S-47 | `server/adminKpiCalculations.ts` | `subscriptionContributesToCommercialRevenue` | Revenue inclusion | `status === "active"` only (trials excluded) |
| S-48 | `server/adminKpiCalculations.ts` | `computeAdminMrr` | MRR aggregation | Paid active rows × plan price |
| S-49 | `server/db.ts` | `getAdminStatistics` | Admin dashboard stats | Counts active+trial; MRR via S-48 |
| S-50 | `server/db.ts` | `getRevenueByMonth` | Revenue time series | S-47 filter + `planId` pricing |
| S-51 | `server/db.ts` | `getSubscriptionDetails` | Admin subscription list | Raw rows + `planId` labels |

### 2.8 Admin / role bypass (cross-cutting)

| ID | File | Function | Gate purpose | Current logic |
|---|---|---|---|---|
| S-52 | `server/_core/assertAdminAccess.ts` | `assertAdminAccess` | Admin-only procedures | `ctx.user.role === "admin"` |
| S-53 | `server/routers.ts` | Multiple mutations | Commercial bypass | `ctx.user.role !== "admin"` skips limit/feature checks |
| S-54 | `server/commercial/buildCommercialContextFromDb.ts` | Admin shortcut | Resolver admin plan | `role === "admin"` → ADMIN entitlements |

### 2.9 Middleware & non-commercial guards (out of scope for migration)

| ID | File | Function | Notes |
|---|---|---|---|
| — | `server/_core/trpc.ts` | `verifiedProcedure` | Email verification — not commercial |
| — | `server/restaurantAccess.ts` | `assertRestaurantAccess` | Tenant isolation — not commercial |
| — | `server/_core/emailVerificationPolicy.ts` | `assertEmailVerificationSatisfied` | Auth policy |

---

## 3. Risk Classification

### SAFE_TO_MIGRATE (4)

Read-only or low-blast-radius replacements that can delegate to `getCommercialEntitlements` / resolver without changing billing rows.

| ID | Location | Rationale |
|---|---|---|
| S-27 | `commercial.getEntitlements` | **Already migrated** — canonical read path |
| S-23 | `subscription.checkTrialStatus` | Legacy read API; can proxy to entitlements `commercial.isTrial` + context dates |
| S-21 | `order.canOrder` | Read-only guest probe; can use `features.ordering` from restaurant owner's entitlements |
| S-16 | `restaurant.updateTemplate` (premium only) | Narrow feature gate; maps cleanly to `features.templates` (classic always allowed) |

### MEDIUM_RISK (14)

Feature access and operational limits — behavior changes for Basic/NONE/Enterprise users per AD-1–AD-5.

| ID | Location | Risk driver |
|---|---|---|
| S-05 | `isSubscriptionActive` | Coarse boolean — collapses tiers; used by S-16–S-18 |
| S-17 | `restaurant.updateCustomColors` | AD-3: Basic currently passes; matrix denies |
| S-18 | `restaurant.updateCustomFonts` | AD-3: same |
| S-02 | `resolveTableOrderingEntitlement` | AD-6: planId check ≠ full ordering feature matrix |
| S-07 | `restaurantAllowsTableOrdering` | Guest-facing; wrong gate breaks menu ordering |
| S-22 | `order.create` | Revenue-impacting guest flow |
| S-08–S-09 | `resolvePlanLimitsForUser` / fallback | AD-1: NONE gets Basic fallback today |
| S-28–S-30 | `assert*CreateAllowed` | AD-1/AD-2: limit semantics change for NONE/Enterprise |
| S-15 | `restaurant.create` | Limit enforcement entry point |
| S-19 | `category.create` | Limit enforcement |
| S-20 | `menuItem.create` | Limit enforcement |
| S-13 | `buildCommercialContextFromDb` | Adapter must stay aligned when gates migrate |
| S-10–S-12 | Subscription row pickers | Scope divergence (account vs restaurant) affects ordering vs entitlements |
| S-53 | Admin bypass pattern | Must map to `commercial.isAdmin` in resolver, not ad-hoc `role` checks |

### HIGH_RISK (9)

Billing, subscription lifecycle, revenue accounting — **do not rewire in early waves**.

| ID | Location | Risk driver |
|---|---|---|
| S-36–S-37 | Checkout mutations | Payment provider contracts; `planId` is billing truth |
| S-38–S-39 | PayPal / Tap webhooks | Production revenue activation |
| S-40 | Activation row resolution | Wrong row → wrong subscription upgraded |
| S-31–S-35 | Trial lifecycle | Signup funnel; 14-day Professional trial |
| S-41–S-44 | Admin subscription CRUD | Operational back-office; direct DB authority |
| S-45 | `assertSubscriptionEligibleForAdminInvoice` | Invoice / `commercial.invoiceEligible` |
| S-47–S-51 | MRR / revenue / admin stats | Financial reporting; trial exclusion rules |

---

## 4. Feature Mapping

### 4.1 Legacy logic → target feature key

| Current logic | Target feature key(s) | Gate IDs | Notes |
|---|---|---|---|
| `isSubscriptionActive(userId)` | `templates` (premium only), `customColors`, `customFonts` | S-16–S-18 | Boolean is too coarse — split per feature |
| `premiumTemplates.includes(...)` + active sub | `templates` | S-16 | Classic template should remain ungated |
| `plan.id === 30001` deny | `ordering` (+ implicit `cart`, `checkout`, `requestBill`, `callWaiter`, `orderTracking`) | S-02, S-07, S-22 | Ordering stack partially covered |
| `resolvePlanLimitsForUser` → DB plan row | `limits.restaurants` / `limits.categories` / `limits.items` | S-08, S-28–S-30 | Not feature keys — limit namespace |
| `getFallbackBasicLimits()` when unentitled | `limits.*` with NONE = 0/0/0 | S-09 | AD-1 alignment |
| `ctx.user.role === "admin"` bypass | `commercial.isAdmin` | S-53, S-54 | Resolver already models ADMIN |
| `status === "trial"` invoice block | `commercial.invoiceEligible` | S-45 | Not a feature key |
| `subscriptionContributesToCommercialRevenue` | `commercial.countsInMrr`, `commercial.countsInRevenue` | S-47–S-50 | Commercial flags, not features |
| `checkTrialStatus` read API | `commercial.isTrial` + context dates | S-23 | Messaging / legacy compat |
| No server gate | `reports`, `excelExport` | — | Client-only today; no server export API |
| No server gate | `hotelMode`, `roomQr` | — | `tableLabel` enum ungated on `restaurant.update` |
| No server gate | `thermalPrinting`, `autoPrint`, `reprint` | — | No print procedures found |
| No server gate | `dynamicServiceCatalog` | — | No dedicated server gate |
| No server gate | `menuImages` | — | Upload gated by tenant access only |
| Public menu routes | `qrMenu`, `search`, `categories` (read) | — | Guest read intentionally open |

### 4.2 Unmapped gates (no direct feature key)

| Gate | Classification | Recommended handling |
|---|---|---|
| Trial creation (`createTrialSubscription`, register) | Lifecycle / TRIAL authority | Keep on subscription tables; feed resolver via context adapter only |
| Checkout + webhooks | Billing authority | Keep `planId`; do not replace with feature keys |
| Admin subscription CRUD | Operational authority | Admin tooling; out of owner feature matrix |
| `resolveOrderingSubscriptionRow` scope | Infrastructure | Normalize scope before entitlements-based ordering (AD-6) |
| MRR / revenue aggregation | `commercial.*` flags | Migrate reporting to resolver flags in Wave 4 only |
| `subscription.getCurrentSubscription` | Display / billing | Retain for invoices; parallel canonical read via `commercial.getEntitlements` |

---

## 5. Enforcement Coverage

Comparison against the **21-key feature matrix** (`src/lib/commercial/featureKeys.ts` + `planFeatureMatrix.ts`).

| Feature key | Server enforced | Partial | Not enforced | Legacy mechanism |
|---|---|---|---|---|
| `qrMenu` | — | — | ✓ | Public routes always on |
| `categories` | — | ✓ | — | Create limited by `assertCategoryCreateAllowed`; read ungated |
| `menuImages` | — | — | ✓ | Tenant access only |
| `search` | — | — | ✓ | Public |
| `ordering` | ✓ | — | — | `resolveTableOrderingEntitlement` / `order.create` |
| `cart` | — | ✓ | — | Implicit via `order.create` (no separate cart API) |
| `checkout` | — | ✓ | — | Same as ordering |
| `requestBill` | — | — | ✓ | No server gate |
| `callWaiter` | — | — | ✓ | No server gate |
| `orderTracking` | — | — | ✓ | Order list uses tenant access only |
| `thermalPrinting` | — | — | ✓ | No server gate |
| `autoPrint` | — | — | ✓ | No server gate |
| `reprint` | — | — | ✓ | No server gate |
| `reports` | — | — | ✓ | No server API gate (client Excel/stats ungated) |
| `excelExport` | — | — | ✓ | Client-side export only |
| `hotelMode` | — | — | ✓ | `tableLabel` rooms/tables ungated |
| `roomQr` | — | — | ✓ | Tables CRUD ungated |
| `dynamicServiceCatalog` | — | — | ✓ | No server gate |
| `templates` | — | ✓ | — | Premium templates via `isSubscriptionActive` (not per-tier) |
| `customColors` | — | ✓ | — | `isSubscriptionActive` over-grants Basic |
| `customFonts` | — | ✓ | — | `isSubscriptionActive` over-grants Basic |

**Limit keys** (not in 21-key list but normative in matrix §2.2):

| Limit | Enforced | Notes |
|---|---|---|
| `restaurants` | ✓ | `assertRestaurantCreateAllowed` |
| `categories` | ✓ | `assertCategoryCreateAllowed` |
| `items` | ✓ | `assertMenuItemCreateAllowed` |
| Enterprise `null` (unlimited) | ✗ | DB magic numbers used instead (AD-2) |
| NONE `0/0/0` | ✗ | Basic fallback limits used (AD-1) |

### Coverage summary

| Status | Feature keys | Count |
|---|---|---:|
| **Fully enforced** | `ordering` (+ de facto order stack) | 1 (+4 implicit) |
| **Partially enforced** | `templates`, `customColors`, `customFonts`, `categories`, `cart`, `checkout` | 6 |
| **Not enforced** | Remaining 14 keys | 14 |

**Mismatch vs resolver (from PG-1C.2C):** Server enforcement is **weaker and coarser** than `resolveCommercialEntitlements` for Basic customization, NONE limits, Enterprise unlimited, and reports/excel/hotel features.

---

## 6. Migration Waves

Aligned with PG-1C.2D AD-1–AD-7. **PG-1C.4A defines scope only — no implementation.**

### Wave 1 — SAFE gates (read path & diagnostics)

| Item | Scope | Dependencies | Blockers | Rollback risk |
|---|---|---|---|---|
| Canonical read | `commercial.getEntitlements` (**done**) | PG-1C.2E adapter | None | None — read-only |
| Legacy read shim | Repoint `subscription.checkTrialStatus` to entitlements | Client already on hook | Clients still calling legacy endpoint | Low — additive response fields |
| Guest ordering probe | `order.canOrder` reads owner `features.ordering` | Per-restaurant owner resolution | Ordering scope (restaurant vs account row) | Low — read-only |
| Diagnostics | Server-side gate registry (mirror PG-1C.3C client registry) | This audit | None | None |

### Wave 2 — Feature enforcement

| Item | Scope | Dependencies | Blockers | Rollback risk |
|---|---|---|---|---|
| Templates | S-16 → `features.templates` | `getCommercialEntitlements` in procedure | Admin bypass consolidation | Medium — Basic/NONE premium lock |
| Custom colors/fonts | S-17–S-18 → `features.customColors` / `customFonts` | AD-3 | Active Basic users lose save access | Medium — support comms |
| Ordering | S-02, S-07, S-22 → `features.ordering` | Scope normalization (S-11) | Guest order breakage | **High** within wave — staged rollout |
| Reports / Excel | New server checks if export APIs added | Currently client-only | No server export endpoint today | Low until API exists |
| Hotel / rooms | Gate `tableLabel: rooms` on `features.hotelMode` | Product decision on existing room users | Ungated today | Medium |
| Replace `isSubscriptionActive` in mutations | Remove S-05 from feature paths | Shared `assertCommercialFeature()` helper | 6 call sites | Medium |

### Wave 3 — Operational limits

| Item | Scope | Dependencies | Blockers | Rollback risk |
|---|---|---|---|---|
| NONE limits | S-09 → resolver `0/0/0` (AD-1) | Wave 2 feature helper | Owners on fallback Basic quotas | **High** — conversion impact |
| Enterprise unlimited | S-08 → `null` semantics (AD-2) | `limit === null → allow` in assert helpers | DB seed unchanged | Medium |
| Limit source | Stop reading DB plan caps for authority | `resolveCommercialEntitlements.limits` | Enterprise DB drift | Medium |
| Categories/items/restaurants | S-28–S-30 use resolver limits | Waves 1–2 complete | Multi-row subscription inflation | Medium |

### Wave 4 — Billing / revenue / subscription lifecycle

| Item | Scope | Dependencies | Blockers | Rollback risk |
|---|---|---|---|---|
| Checkout | S-36–S-37 | Keep `planId` as billing truth | Payment providers | **Critical** |
| Webhooks | S-38–S-39 | Activation tests | Production revenue | **Critical** |
| Trial lifecycle | S-31–S-35, S-33 | Signup funnel | Trial = Professional planId convention | **Critical** |
| Admin subscription CRUD | S-41–S-44 | Back-office ops | Admin workflows | High |
| Invoice eligibility | S-45 → `commercial.invoiceEligible` | Wave 4 billing stable | Trial invoice edge cases | High |
| MRR / revenue | S-47–S-51 → resolver commercial flags | Reporting QA | Financial dashboards | **Critical** |

**Recommended sequencing:** Wave 1 (complete) → Wave 2 (feature gates) → Wave 3 (limits) → Wave 4 (billing/revenue). Do **not** parallelize Wave 4 with Wave 2/3.

---

## 7. Go / No-Go Recommendation

### Wave 1 (server read path)

**GO** — `commercial.getEntitlements` is deployed read-only. Optional shims (`checkTrialStatus`, `order.canOrder`) are safe follow-ups.

### Wave 2 (feature enforcement)

**CONDITIONAL GO** — Proceed after:

1. Shared server helper: `assertCommercialFeature(ctx, key)` wrapping `getCommercialEntitlements` (mirror client `featureVisibility.ts`).
2. Regression tests for Basic customization denial (AD-3) and ordering (AD-6).
3. Explicit product sign-off on Basic user behavior change.
4. Client PG-1C.3C complete (**done**) so UI and server align.

**NO-GO** for big-bang replacement of `isSubscriptionActive` without per-feature mapping.

### Wave 3 (limits)

**CONDITIONAL GO** — Blocked until Wave 2 stable. Requires AD-1 communication plan (NONE users lose create capacity).

### Wave 4 (billing / revenue)

**NO-GO for migration sprint** — Keep legacy `planId` and webhook activation paths until Waves 2–3 are production-stable. Revenue/MRR rewiring is a separate program with finance QA.

### Overall PG-1C.4A verdict

| Criterion | Met? |
|---|---|
| Complete map of server-side commercial authority | ✓ 54 gate locations inventoried |
| No runtime changes | ✓ Audit-only |
| No enforcement changes | ✓ No code modified |
| No billing impact | ✓ No billing paths touched |
| Feature mapping to 21-key matrix | ✓ §4–§5 |
| Migration wave plan | ✓ §6 |

**Next task (out of scope for 4A):** PG-1C.4B — implement `server/commercial/assertCommercialFeature.ts` and migrate Wave 2 gates (templates, customColors, customFonts, ordering) behind `getCommercialEntitlements`.

---

## Appendix A — Search evidence

Patterns searched in `server/**/*.{ts,tsx}`:

| Pattern | Primary hits |
|---|---|
| `isSubscriptionActive` | `db.ts`, `routers.ts` (4 mutations + checkTrialStatus) |
| `planId` | `routers.ts` (checkout, admin CRUD), webhooks, `buildCommercialContextFromDb` |
| `subscription status` / trial | `subscriptionEntitlement.ts`, `create-trial-subscription.ts`, admin helpers |
| `role === "admin"` commercial bypass | `routers.ts` (limits + customization + templates) |
| `premiumTemplates` | `routers.ts` `updateTemplate` |
| `assert*Allowed` | `subscriptionPlanLimits.ts` → category/menuItem/restaurant create |
| `restaurantAllowsTableOrdering` | `db.ts`, `order.canOrder`, `order.create` |
| `30001` / BASIC | `subscriptionEntitlement.ts`, `create-trial-subscription.ts` |

## Appendix B — Relationship to client consolidation (PG-1C.3C)

Client visibility now flows through `useCommercialFeatureVisibility()` → `featureVisibility.ts`. Server mutations listed in §2.2 still use legacy checks. **Until Wave 2**, Basic users may see stricter UI (locked colors) while server still allows saves — or the reverse for reports/excel (UI label only, server ungated). PG-1C.4B should close these gaps per AD-3–AD-5.
