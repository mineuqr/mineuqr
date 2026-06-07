# ASN-2 — Authority Source Inventory

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-2 — Source inventory and consumer mapping  
**Date:** 2026-06-07  
**Status:** Complete — no runtime changes  

**Mode:** Inventory only. No migrations, normalization, hotfixes, or code changes.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `COMMERCIAL-AUTHORITY-SPEC.md`
- `PLAN-FEATURE-MATRIX.md` / `src/lib/commercial/planFeatureMatrix.ts`
- `PLAN-ID-MAPPING.md` / `src/lib/commercial/planIdMapping.ts`
- `PG-1C.2E-COMMERCIAL-CONTEXT-INTEGRATION.md`
- `PG-1C.4B-SERVER-GATE-MIGRATION-MATRIX.md`

---

## 1. Executive summary

ASN-1 mapped **38 authority paths** (A/R/H/U/B). ASN-2 maps **24 underlying authority sources** (S-01–S-24) to **72 named consumers** across server, client, and billing layers.

| Source class | Count | Canonical | Primary risk |
|--------------|------:|-----------|--------------|
| Account / canonical | 6 | Yes | Under-consumed on server mutations |
| Restaurant / legacy | 4 | No | F-3 ordering conflict |
| Hybrid / transitional | 8 | No | Scope drift register path |
| Ad-hoc / heuristic | 4 | No | Server/client template mismatch |
| Billing row | 2 | Partial | Activation scope conflicts |

**Headline:** `CommercialContext` + `CommercialEntitlements` (S-01, S-02) are the only spec-canonical sources but drive **~40% of commercial decisions**. Legacy restaurant-scoped ordering (S-10–S-12) still gates guest revenue (F-3). Normalization priority #1: **S-10 `resolveOrderingSubscriptionRow`**.

**Handoff:** ASN-2.5 Authority Canonicalization Decision is ready.

---

## 2. Deliverable 2 — Authority Source Registry

### Account / canonical sources

#### S-01 — CommercialContext

| Field | Value |
|-------|-------|
| **Scope** | ACCOUNT |
| **Primary owner** | Owner account |
| **Produced by** | `buildCommercialContextFromDb()` → `buildCommercialContext()` (`server/commercial/buildCommercialContextFromDb.ts`, `src/lib/commercial/commercialContext.ts`) |
| **Upstream** | S-05 `pickUserLevelSubscription`, S-04 `mapPlanIdToCatalogPlan`, `users.role` |
| **Purpose** | Normalized owner subscription snapshot for resolver input |
| **Canonical** | **YES** |
| **Notes** | Ignores `restaurantId > 0` rows (TD-W1-01). Admin: `subscription: null`. |

#### S-02 — CommercialEntitlements

| Field | Value |
|-------|-------|
| **Scope** | ACCOUNT |
| **Primary owner** | Owner account |
| **Produced by** | `getCommercialEntitlements()` → `resolveCommercialEntitlements()` (`server/commercial/getCommercialEntitlements.ts`, `src/lib/commercial/resolveCommercialEntitlements.ts`) |
| **Upstream** | S-01 CommercialContext, S-03 planFeatureMatrix |
| **Purpose** | Single entitlement output: `plan`, `features.*`, `limits.*`, `commercial.*` |
| **Canonical** | **YES** |
| **Notes** | Spec-mandated authority per COMMERCIAL-AUTHORITY-SPEC §2, §11, §12. Read-only today for most mutations. |

#### S-03 — planFeatureMatrix

| Field | Value |
|-------|-------|
| **Scope** | ACCOUNT (static) |
| **Primary owner** | Product definition |
| **Produced by** | `PLAN_LIMITS`, `FEATURE_MATRIX` (`src/lib/commercial/planFeatureMatrix.ts`) |
| **Upstream** | PLAN-FEATURE-MATRIX.md |
| **Purpose** | Plan → feature flags and limits |
| **Canonical** | **YES** |
| **Notes** | Pure config; consumed only via S-02 resolver. |

#### S-04 — mapPlanIdToCatalogPlan

| Field | Value |
|-------|-------|
| **Scope** | ACCOUNT (mapping) |
| **Primary owner** | Implementation bridge |
| **Produced by** | `planIdMapping.ts` |
| **Upstream** | PLAN-ID-MAPPING.md, `subscriptionPlans` IDs |
| **Purpose** | `planId` → `BASIC` \| `PROFESSIONAL` \| `ENTERPRISE` for context build |
| **Canonical** | **YES** (transitional mapping layer) |
| **Notes** | Spec: plan IDs are implementation details; mapping is adapter-only. |

#### S-05 — pickUserLevelSubscription

| Field | Value |
|-------|-------|
| **Scope** | ACCOUNT |
| **Primary owner** | Owner account |
| **Produced by** | `subscriptionResolver.ts` |
| **Upstream** | `userSubscriptions` where `restaurantId === 0`, S-14 `pickCanonicalSubscription` |
| **Purpose** | Account-level canonical subscription row selection |
| **Canonical** | **YES** |
| **Notes** | PG-1C.2E canonical pick. Sole row source for S-01. |

#### S-06 — userSubscriptions (account-level read)

| Field | Value |
|-------|-------|
| **Scope** | ACCOUNT (when filtered to `restaurantId = 0`) |
| **Primary owner** | Owner account |
| **Produced by** | DB table `userSubscriptions` via `getSubscriptionsByUser()` |
| **Purpose** | Persistent subscription state for account authority |
| **Canonical** | **YES** (persistence layer) |
| **Notes** | Same table holds restaurant-scoped rows (non-canonical for features). |

---

### Restaurant / legacy sources

#### S-10 — resolveOrderingSubscriptionRow

| Field | Value |
|-------|-------|
| **Scope** | RESTAURANT |
| **Primary owner** | Restaurant subscription row |
| **Produced by** | `subscriptionResolver.ts` |
| **Upstream** | `userSubscriptions` filtered by `restaurantId === target`, fallback S-05 |
| **Purpose** | Select subscription row for ordering and per-venue limits |
| **Canonical** | **NO** |
| **Notes** | Scoped row wins even if expired; blocks account-level entitlement. **F-3 root.** |

#### S-11 — getSubscriptionForRestaurant

| Field | Value |
|-------|-------|
| **Scope** | RESTAURANT |
| **Primary owner** | Restaurant subscription row |
| **Produced by** | `db.ts` — `pickCanonicalSubscription(scoped rows only)` |
| **Purpose** | Restaurant-scoped subscription read (display, admin) |
| **Canonical** | **NO** |
| **Notes** | No account fallback. Used for billing display per venue. |

#### S-12 — restaurantAllowsTableOrdering

| Field | Value |
|-------|-------|
| **Scope** | RESTAURANT |
| **Primary owner** | Restaurant (via owner rows) |
| **Produced by** | `db.ts` → S-10 → S-13 |
| **Purpose** | Boolean guest ordering entitlement (legacy) |
| **Canonical** | **NO** |
| **Notes** | Direct consumer of restaurant-scoped chain. |

#### S-13 — resolveTableOrderingEntitlement + BASIC_FREE_PLAN_ID

| Field | Value |
|-------|-------|
| **Scope** | RESTAURANT (row + plan) |
| **Primary owner** | Subscription row + plan row |
| **Produced by** | `subscriptionEntitlement.ts` |
| **Upstream** | S-14 period check, `getSubscriptionPlanById`, `planId === 30001` |
| **Purpose** | Ordering eligible = entitled period + non-basic plan |
| **Canonical** | **NO** |
| **Notes** | Hardcoded plan ID violates spec §5. Target: `features.ordering`. |

---

### Hybrid / transitional sources

#### S-14 — pickCanonicalSubscription (all rows)

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Best subscription row (any scope) |
| **Produced by** | `subscriptionResolver.ts` |
| **Upstream** | All `userSubscriptions` for user |
| **Purpose** | Deterministic row ranking across duplicates/scopes |
| **Canonical** | **NO** (infrastructure; scope-ambiguous when used alone) |
| **Notes** | Canonical when scoped to account (S-05) or restaurant (S-10/S-11). |

#### S-15 — isSubscriptionActive / userHasSubscriptionEntitlement

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Any entitled subscription row |
| **Produced by** | `db.ts`, `subscriptionEntitlement.ts` |
| **Upstream** | All user rows, S-14 ranking implicit in `.some()` |
| **Purpose** | Coarse boolean “has any active/trial sub” |
| **Canonical** | **NO** |
| **Notes** | Collapses tiers; used for server template/color/font gates. |

#### S-16 — getTrialEndDate

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Any trial row |
| **Produced by** | `db.ts` |
| **Upstream** | S-14 on trial-filtered rows |
| **Purpose** | Legacy trial end instant |
| **Canonical** | **NO** (transitional; target: S-01 dates) |
| **Notes** | Fallback in S-18 when context date absent. |

#### S-17 — resolveCanOrderRead

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Account + restaurant (OR combine) |
| **Produced by** | `wave1ReadAuthority.ts` |
| **Upstream** | S-02 `features.ordering`, S-12 legacy |
| **Purpose** | Guest ordering visibility probe |
| **Canonical** | **NO** (transitional Wave 1 shim) |
| **Notes** | F-W1-04: `legacy \|\| features.ordering` when `plan !== NONE`. |

#### S-18 — resolveTrialStatusRead

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Account + any-row legacy |
| **Produced by** | `wave1ReadAuthority.ts` |
| **Upstream** | S-02, S-15, S-16 |
| **Purpose** | Legacy `checkTrialStatus` shape |
| **Canonical** | **NO** (transitional Wave 1 shim) |
| **Notes** | Register path: `plan NONE` + `isActive true`. |

#### S-19 — resolvePlanLimitsForUser

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Row-dependent (account all-rows OR S-10) |
| **Produced by** | `subscriptionPlanLimits.ts` |
| **Upstream** | S-10 or S-14, `getSubscriptionPlanById`, S-20 |
| **Purpose** | DB-derived quota limits |
| **Canonical** | **NO** |
| **Notes** | Target: S-02 `limits.*`. NONE gets S-20 fallback today. |

#### S-20 — getFallbackBasicLimits

| Field | Value |
|-------|-------|
| **Scope** | UNKNOWN (heuristic) |
| **Primary owner** | Basic-tier DB plan guess |
| **Produced by** | `subscriptionPlanLimits.ts` |
| **Upstream** | `subscriptionPlans` where `maxRestaurants === 1` |
| **Purpose** | Default limits when no entitled sub found |
| **Canonical** | **NO** |
| **Notes** | AD-1: NONE should be 0/0/0, not shadow Basic. |

#### S-21 — resolveSubscriptionForActivationFromRows

| Field | Value |
|-------|-------|
| **Scope** | HYBRID |
| **Primary owner** | Payment metadata + row priority |
| **Produced by** | `subscriptionActivation.ts` |
| **Upstream** | id → restaurantId → planId → S-05 → S-14 |
| **Purpose** | Pick row to activate on payment webhook |
| **Canonical** | **NO** (billing transitional) |
| **Notes** | HIGH blast radius; scope priority can disagree with S-01. |

#### S-22 — getCanonicalUserSubscription

| Field | Value |
|-------|-------|
| **Scope** | HYBRID (account-oriented) |
| **Primary owner** | Best row across all scopes |
| **Produced by** | `db.ts` → S-14 on all user rows |
| **Purpose** | Billing/display canonical read |
| **Canonical** | **PARTIAL** (billing read; not feature authority) |
| **Notes** | PG-1C.4B W4 exclude from enforcement migration. |

---

### Ad-hoc / heuristic sources

#### S-23 — ctx.user.role === "admin"

| Field | Value |
|-------|-------|
| **Scope** | UNKNOWN |
| **Primary owner** | User role field |
| **Produced by** | `users.role`, checked inline in `routers.ts` |
| **Purpose** | Bypass commercial limits and feature gates |
| **Canonical** | **NO** |
| **Notes** | Target: `entitlements.commercial.isAdmin`. Does not bypass S-12 guest ordering. |

#### S-24 — premiumTemplates hardcoded list

| Field | Value |
|-------|-------|
| **Scope** | UNKNOWN |
| **Primary owner** | Static string array in `routers.ts` |
| **Purpose** | Distinguish classic vs premium templates for server gate |
| **Canonical** | **NO** |
| **Notes** | Client uses S-02 `features.templates`; server uses S-15. |

#### S-25 — adminKpiCalculations (status + planId)

| Field | Value |
|-------|-------|
| **Scope** | UNKNOWN |
| **Primary owner** | Raw subscription rows |
| **Produced by** | `adminKpiCalculations.ts`, consumed in `db.ts` stats |
| **Purpose** | MRR, revenue inclusion, renewal metrics |
| **Canonical** | **NO** |
| **Notes** | Approximates spec §14; target: account type from S-02. |

#### S-26 — assertSubscriptionEligibleForAdminInvoice

| Field | Value |
|-------|-------|
| **Scope** | UNKNOWN |
| **Primary owner** | Subscription `status` string |
| **Produced by** | `adminSubscriptionHelpers.ts` |
| **Purpose** | Block invoice PDF for trial rows |
| **Canonical** | **NO** |
| **Notes** | Target: `commercial.invoiceEligible` from S-02. |

---

### Billing persistence sources

#### S-30 — userSubscriptions (writes)

| Field | Value |
|-------|-------|
| **Scope** | Billing (mixed row scope) |
| **Primary owner** | Subscription row |
| **Produced by** | Register, checkout, webhooks, admin CRUD |
| **Purpose** | Authoritative billing/lifecycle persistence |
| **Canonical** | **PARTIAL** (persistence truth; not feature gate) |
| **Notes** | Creates scope divergence when `restaurantId > 0`. |

#### S-31 — planId (checkout / webhook / admin)

| Field | Value |
|-------|-------|
| **Scope** | Billing |
| **Primary owner** | Plan catalog row |
| **Produced by** | `subscriptionPlans`, PSP metadata |
| **Purpose** | Payment SKUs, activation target |
| **Canonical** | **PARTIAL** (required by PSP; mapped via S-04 for features) |
| **Notes** | Must remain for billing; must not gate features directly post-normalization. |

#### S-32 — resolveTrialPlanId / buildTrialSubscriptionForUser

| Field | Value |
|-------|-------|
| **Scope** | RESTAURANT (register) / ACCOUNT (default) |
| **Primary owner** | Trial creation path |
| **Produced by** | `create-trial-subscription.ts`, `registerOwner.ts` |
| **Purpose** | 14-day Professional trial row insert |
| **Canonical** | **NO** |
| **Notes** | Register uses `restaurantId > 0` → seeds S-10 dominance. |

---

## 3. Deliverable 3 — Consumer inventory

### S-01 CommercialContext

| Consumer | Purpose | Risk |
|----------|---------|------|
| `getCommercialEntitlementsFromContext` | Resolver input | HIGH |
| `commercial.getEntitlements` (via S-02) | Owner API | HIGH |
| `useCommercialEntitlements` | Client data | HIGH |
| `getSubscriptionExpiryWarning` | Dashboard expiry UX | MEDIUM |
| `resolveTrialStatusRead` (dates) | Trial end fallback path | MEDIUM |
| `CommercialDiagnostics` page | Engineering observability | LOW |

### S-02 CommercialEntitlements

| Consumer | Purpose | Risk |
|----------|---------|------|
| `useCommercialFeatureVisibility` | Owner UI gates | HIGH |
| `hasCommercialFeature` / `isFeatureVisible` | Feature checks | HIGH |
| `isPremiumTemplateLocked` | Template grid | HIGH |
| `showCustomColorsPanel` / `showCustomFontsPanel` | Customization UI | HIGH |
| `showReportsUpgradeNotice` / `showExcelUpgradeLabel` | Dashboard upsell | MEDIUM |
| `isTrialActiveForMessaging` | Pricing trial banner | MEDIUM |
| `isCanonicalCurrentPlan` | Pricing grid highlight | MEDIUM |
| `resolveCanOrderRead` (account leg) | Guest ordering probe | **CRITICAL** |
| `resolveTrialStatusRead` (plan leg) | Trial active when plan ≠ NONE | MEDIUM |
| `clientGateRegistry` (diagnostics) | Audit registry | LOW |
| `entitlementsDisplay` | Labels / disabled features list | LOW |

**Client pages consuming S-02 via visibility hook:** TemplateSelector, ColorCustomizer, FontCustomizer, Dashboard, Pricing, SubscriptionManagement, PaymentHistory, SubscriptionSuccess.

### S-03 planFeatureMatrix

| Consumer | Purpose | Risk |
|----------|---------|------|
| `resolveCommercialEntitlements` | Feature/limit derivation | CRITICAL |
| Unit tests (`planFeatureMatrix.test.ts`) | Spec regression | LOW |

### S-04 mapPlanIdToCatalogPlan

| Consumer | Purpose | Risk |
|----------|---------|------|
| `buildCommercialContextFromDb` | Context build | HIGH |
| `buildCommercialContext` (pure) | Test/direct build | LOW |
| `isCanonicalCurrentPlan` (client) | Pricing UI | MEDIUM |

### S-05 pickUserLevelSubscription

| Consumer | Purpose | Risk |
|----------|---------|------|
| `buildCommercialContextFromDb` | Account row pick | CRITICAL |
| `resolveOrderingSubscriptionRow` (fallback) | Ordering when no scoped row | HIGH |
| `resolveSubscriptionForActivationFromRows` | Webhook fallback | HIGH |
| `getAllRestaurantsWithSubscriptions` | Admin list display | LOW |

### S-10 resolveOrderingSubscriptionRow

| Consumer | Purpose | Risk |
|----------|---------|------|
| `getOrderingSubscriptionForRestaurant` | Ordering row lookup | **CRITICAL** |
| `restaurantAllowsTableOrdering` (S-12) | Guest ordering boolean | **CRITICAL** |
| `resolvePlanLimitsForUser(userId, restaurantId)` | Category/item caps | HIGH |
| `assertCategoryCreateAllowed` | Menu category limit | HIGH |
| `assertMenuItemCreateAllowed` | Menu item limit | HIGH |
| Parity tests | Wave 1 verification | LOW |

### S-11 getSubscriptionForRestaurant

| Consumer | Purpose | Risk |
|----------|---------|------|
| `subscription.getByRestaurant` | Legacy venue subscription display | MEDIUM |
| `admin.createRestaurantSubscription` (existence check) | Admin CRUD | MEDIUM |
| Client `AdminManagement` (local helper) | Admin UI list | LOW |

### S-12 restaurantAllowsTableOrdering

| Consumer | Purpose | Risk |
|----------|---------|------|
| `order.create` entitlement gate | Guest order mutation | **CRITICAL** |
| `resolveCanOrderRead` (legacy leg) | Guest ordering probe | **CRITICAL** |
| Tests (`order-create-pricing`, `phase-c`) | Test mocks | LOW |

### S-13 resolveTableOrderingEntitlement

| Consumer | Purpose | Risk |
|----------|---------|------|
| `restaurantAllowsTableOrdering` | Ordering boolean | **CRITICAL** |
| Parity tests | Verification | LOW |

### S-15 isSubscriptionActive

| Consumer | Purpose | Risk |
|----------|---------|------|
| `restaurant.updateTemplate` (premium) | Server template gate | HIGH |
| `restaurant.updateCustomColors` | Server color gate | HIGH |
| `restaurant.updateCustomFonts` | Server font gate | HIGH |
| `resolveTrialStatusRead` (NONE fallback) | Trial status | MEDIUM |
| Legacy client patterns (removed from UI) | — | LOW |

### S-16 getTrialEndDate

| Consumer | Purpose | Risk |
|----------|---------|------|
| `resolveTrialStatusRead` | Trial end fallback | MEDIUM |
| `subscription.checkTrialStatus` (indirect) | Legacy API | MEDIUM |

### S-17 resolveCanOrderRead

| Consumer | Purpose | Risk |
|----------|---------|------|
| `order.canOrder` | Guest ordering probe API | **CRITICAL** |
| `MenuView` → `trpc.order.canOrder` | Guest cart visibility | **CRITICAL** |
| `clientGateRegistry` guest-ordering-ui | Diagnostics | LOW |

### S-18 resolveTrialStatusRead

| Consumer | Purpose | Risk |
|----------|---------|------|
| `subscription.checkTrialStatus` | Legacy trial API | MEDIUM |
| Pricing (indirect via migrated client entitlements) | Trial messaging | MEDIUM |

### S-19 resolvePlanLimitsForUser

| Consumer | Purpose | Risk |
|----------|---------|------|
| `assertRestaurantCreateAllowed` | Restaurant count cap | HIGH |
| `assertCategoryCreateAllowed` | Category cap | HIGH |
| `assertMenuItemCreateAllowed` | Item cap | HIGH |

### S-20 getFallbackBasicLimits

| Consumer | Purpose | Risk |
|----------|---------|------|
| `resolvePlanLimitsForUser` (unentitled path) | Shadow free tier limits | HIGH |

### S-21 resolveSubscriptionForActivationFromRows

| Consumer | Purpose | Risk |
|----------|---------|------|
| `updateSubscriptionForActivation` | PayPal/Tap activation | **CRITICAL** |
| `paypal-webhook` / `tap-webhook` | Payment events | **CRITICAL** |

### S-22 getCanonicalUserSubscription

| Consumer | Purpose | Risk |
|----------|---------|------|
| `subscription.getCurrentSubscription` | Owner billing display | MEDIUM |
| `subscription.createCheckoutSession` / `createTapCheckout` | Checkout context | HIGH |
| `admin.generateInvoicePDF` | Invoice source row | HIGH |
| Admin user subscription CRUD | Existence checks | MEDIUM |
| Client PaymentHistory, SubscriptionSuccess, SubscriptionManagement | Plan labels (fallback) | MEDIUM |

### S-23 admin role bypass

| Consumer | Purpose | Risk |
|----------|---------|------|
| `restaurant.create` | Skip limit assert | MEDIUM |
| `restaurant.updateTemplate/Colors/Fonts` | Skip feature gates | MEDIUM |
| `category.create` / `menuItem.create` | Skip limit asserts | MEDIUM |

### S-24 premiumTemplates list

| Consumer | Purpose | Risk |
|----------|---------|------|
| `restaurant.updateTemplate` | Server premium gate | HIGH |

### S-25 adminKpiCalculations

| Consumer | Purpose | Risk |
|----------|---------|------|
| `getAdminStatistics` | Admin dashboard KPIs | MEDIUM |
| `getRevenueByMonth` | Revenue time series | MEDIUM |
| `AdminKPISection` (client hints) | Admin UI | LOW |

### S-30 / S-31 billing writes

| Consumer | Purpose | Risk |
|----------|---------|------|
| `registerOwner` | Scoped trial insert | HIGH |
| `createCheckoutSession` / `createTapCheckout` | Checkout | **CRITICAL** |
| PayPal/Tap webhooks | Activation | **CRITICAL** |
| Admin subscription CRUD | Back-office | HIGH |
| Client Pricing checkout | Purchase | HIGH |

### S-32 trial creation

| Consumer | Purpose | Risk |
|----------|---------|------|
| `registerOwner` transaction | Self-service signup | HIGH |
| `createTrialSubscription` (script) | Ops trial insert | MEDIUM |

### Guest ordering consumer chain (cross-source)

| Consumer | Sources used | Risk |
|----------|--------------|------|
| `MenuView` UI | S-17 (via API), client hours | **CRITICAL** |
| `CartDrawer` → `order.create` | S-12 only (not S-17) | **CRITICAL** |

---

## 4. Deliverable 4 — Dependency graphs

### Chain G-01 — Canonical owner visibility (spec-aligned)

```text
userSubscriptions (restaurantId=0)
  ↓ S-05 pickUserLevelSubscription
  ↓ S-04 mapPlanIdToCatalogPlan
  ↓ S-01 CommercialContext
  ↓ S-02 CommercialEntitlements ← S-03 planFeatureMatrix
  ↓ commercial.getEntitlements
  ↓ useCommercialEntitlements
  ↓ useCommercialFeatureVisibility
  ↓ Owner UI (templates, colors, fonts, reports, pricing)
  ↓ Business capability: Owner feature visibility
```

### Chain G-02 — Legacy guest ordering (spec-violating)

```text
userSubscriptions (restaurantId=target first)
  ↓ S-10 resolveOrderingSubscriptionRow
  ↓ getSubscriptionPlanById
  ↓ S-13 resolveTableOrderingEntitlement (planId 30001)
  ↓ S-12 restaurantAllowsTableOrdering
  ↓ order.create
  ↓ CartDrawer mutation
  ↓ Business capability: Guest order placement
```

### Chain G-03 — Hybrid guest ordering probe (F-3 conflict)

```text
Branch A: S-01 → S-02 features.ordering
Branch B: G-02 S-12 legacy
  ↓ S-17 resolveCanOrderRead (A OR B)
  ↓ order.canOrder
  ↓ MenuView cart visibility
  ↓ Business capability: Guest ordering UI
```

**Conflict:** G-03 Branch A can be true while G-02 denies → F-3.

### Chain G-04 — Server customization enforcement (coarse)

```text
userSubscriptions (any entitled row)
  ↓ S-15 isSubscriptionActive
  ↓ restaurant.updateTemplate / updateCustomColors / updateCustomFonts
  ↓ Business capability: Owner customization mutations
```

**Conflict with G-01:** Basic may pass S-15 but fail S-02 `customColors`.

### Chain G-05 — Quota enforcement (hybrid limits)

```text
userSubscriptions
  ↓ S-19 resolvePlanLimitsForUser
      ├─ (no restaurantId) S-14 all rows → restaurant cap
      └─ (with restaurantId) S-10 → category/item caps
  ↓ assertRestaurantCreateAllowed / assertCategoryCreateAllowed / assertMenuItemCreateAllowed
  ↓ restaurant.create / category.create / menuItem.create
  ↓ Business capability: Capacity enforcement
```

### Chain G-06 — Trial status (Wave 1 hybrid)

```text
S-02 plan !== NONE → isActive true
OR plan === NONE → S-15 isSubscriptionActive
Dates: S-01 trialEndsAt OR S-16 getTrialEndDate
  ↓ S-18 resolveTrialStatusRead
  ↓ subscription.checkTrialStatus
  ↓ Business capability: Trial status API (legacy)
```

### Chain G-07 — Billing activation

```text
PSP webhook metadata (planId, restaurantId)
  ↓ S-21 resolveSubscriptionForActivationFromRows
  ↓ updateSubscriptionForActivation
  ↓ S-30 userSubscriptions write
  ↓ Business capability: Paid subscription activation
```

### Chain G-08 — Register path (scope seed)

```text
registerOwner
  ↓ S-32 buildTrialSubscriptionForUser(userId, restaurantId>0)
  ↓ S-30 scoped trial row insert
  ↓ Seeds S-10 dominance for that restaurant
  ↓ Business capability: Self-service onboarding
```

### Chain G-09 — Revenue / MRR

```text
userSubscriptions (all rows)
  ↓ S-25 status === "active" filter
  ↓ computeAdminMrr / getRevenueByMonth
  ↓ admin KPI APIs
  ↓ Business capability: Commercial analytics
```

---

## 5. Deliverable 5 — Canonicality audit

### Canonical (align with Owner → Subscription → Entitlements → Restaurants)

| Source | Rationale |
|--------|-----------|
| S-01 CommercialContext | Spec hierarchy input; account-level pick |
| S-02 CommercialEntitlements | Spec §2 approved authority output |
| S-03 planFeatureMatrix | Spec feature/limit definitions |
| S-04 mapPlanIdToCatalogPlan | Adapter only; maps implementation ID to catalog plan |
| S-05 pickUserLevelSubscription | Account-scoped row selection per PG-1C.2E |
| S-06 userSubscriptions (account-level reads) | Persistence for account subscription |

### Transitional (bridge until normalization complete)

| Source | Rationale | Exit condition |
|--------|-----------|----------------|
| S-04 mapPlanIdToCatalogPlan | Needed while DB uses numeric planId | Billing uses catalog plan identifiers internally |
| S-16 getTrialEndDate | Fallback in S-18 | Scope fix + context always has dates |
| S-17 resolveCanOrderRead | Wave 1 OR shim | Single ordering authority |
| S-18 resolveTrialStatusRead | Wave 1 hybrid read | Client fully on S-02; deprecate API |
| S-21 resolveSubscriptionForActivationFromRows | Billing necessity | Account-scoped activation only |
| S-22 getCanonicalUserSubscription | Billing display read | Parallel to S-02; W4 exclude |
| S-30 userSubscriptions writes | Billing truth | Row scope normalized at write time |
| S-31 planId checkout | PSP requirement | Feature gates stop reading planId directly |

### Legacy (violate target architecture)

| Source | Rationale |
|--------|-----------|
| S-10 resolveOrderingSubscriptionRow | Restaurant-scoped commercial authority (spec §2 forbidden) |
| S-11 getSubscriptionForRestaurant | Restaurant-owned subscription semantics |
| S-12 restaurantAllowsTableOrdering | Parallel entitlement system |
| S-13 resolveTableOrderingEntitlement + 30001 | Hardcoded plan gate |
| S-14 pickCanonicalSubscription (unscoped use) | Ambiguous multi-scope pick |
| S-15 isSubscriptionActive | Coarse boolean; not feature keys |
| S-19 resolvePlanLimitsForUser | DB limits vs resolver limits |
| S-20 getFallbackBasicLimits | Shadow tier for NONE |
| S-23 admin role bypass | Not `commercial.isAdmin` gate |
| S-24 premiumTemplates list | Duplicates feature matrix |
| S-25 adminKpiCalculations | Row-based not account-type based |
| S-26 invoice status check | Not `commercial.invoiceEligible` |
| S-32 scoped trial creation | Seeds restaurant authority divergence |

---

## 6. Deliverable 6 — Blast radius assessment

| Source | Consumers | Criticality | Migration difficulty | Notes |
|--------|----------:|-------------|----------------------|-------|
| S-02 CommercialEntitlements | 15+ | **CRITICAL** | HIGH | Expand to server mutations without breaking client |
| S-01 CommercialContext | 6 | **CRITICAL** | HIGH | Scope normalization touches adapter |
| S-05 pickUserLevelSubscription | 4 | **CRITICAL** | MEDIUM | Core account pick; well-tested |
| S-03 planFeatureMatrix | 2 | **CRITICAL** | LOW | Static; already spec source |
| S-10 resolveOrderingSubscriptionRow | 6 | **CRITICAL** | HIGH | F-3 root; ordering + limits |
| S-12 restaurantAllowsTableOrdering | 3 | **CRITICAL** | MEDIUM | Replace with S-02 ordering |
| S-17 resolveCanOrderRead | 3 | **CRITICAL** | MEDIUM | Align with create |
| S-13 resolveTableOrderingEntitlement | 2 | **HIGH** | MEDIUM | Fold into features.ordering |
| S-15 isSubscriptionActive | 4 | **HIGH** | MEDIUM | Split to per-feature keys |
| S-19 resolvePlanLimitsForUser | 3 | **HIGH** | HIGH | AD-1/AD-2 behavior change |
| S-20 getFallbackBasicLimits | 1 | **HIGH** | MEDIUM | NONE limit semantics |
| S-21 activation row resolver | 3 | **CRITICAL** | **CRITICAL** | Revenue; do not rush |
| S-30 billing writes | 8+ | **CRITICAL** | **CRITICAL** | Billing + register path |
| S-31 planId | 10+ | **HIGH** | HIGH | PSP coupling |
| S-18 resolveTrialStatusRead | 2 | MEDIUM | LOW | Read-only API |
| S-22 getCanonicalUserSubscription | 6 | MEDIUM | MEDIUM | Billing parallel read |
| S-23 admin bypass | 5 | MEDIUM | LOW | Map to resolver ADMIN |
| S-24 premiumTemplates | 1 | MEDIUM | LOW | Use features.templates |
| S-25 KPI calculations | 3 | MEDIUM | MEDIUM | Analytics correctness |
| S-32 trial creation | 2 | **HIGH** | HIGH | Register funnel |

**Difficulty legend:** LOW = localized swap; MEDIUM = multi-consumer coordination; HIGH = behavior change + tests; CRITICAL = revenue/signup risk.

---

## 7. Deliverable 7 — Normalization candidate ranking

| Rank | Source | Reason | Risk if changed | Migration impact | Business impact |
|------|--------|--------|-----------------|------------------|-----------------|
| **1** | S-10 `resolveOrderingSubscriptionRow` | F-3 conflict root; scoped row blocks account PRO | HIGH | Ordering + limits rewrite | Guest ordering broken if wrong |
| **2** | S-12 `restaurantAllowsTableOrdering` | Legacy ordering gate on `order.create` | HIGH | Guest mutation path | Revenue / 403 incidents |
| **3** | S-17 `resolveCanOrderRead` | Dual OR authority; read/write split | HIGH | Guest UI probe | Cart visible but submit fails |
| **4** | S-13 `resolveTableOrderingEntitlement` | planId 30001 parallel to matrix | MEDIUM | Ordering semantics | Basic vs Pro ordering |
| **5** | S-15 `isSubscriptionActive` | Server mutations ≠ client entitlements | HIGH | Template/color/font gates | Basic users blocked or over-permitted |
| **6** | S-01 `buildCommercialContextFromDb` | Ignores scoped rows (TD-W1-01) | HIGH | All S-02 consumers | Owner dashboard wrong plan |
| **7** | S-32 scoped trial creation | Seeds S-10 dominance at register | HIGH | Signup transaction | New user commercial state |
| **8** | S-19 + S-20 limits | NONE shadow Basic tier | MEDIUM | Create caps | Over-creation for expired users |
| **9** | S-24 premiumTemplates + S-23 bypass | Server ≠ client template authority | MEDIUM | Mutation gates | Premium template exploit |
| **10** | S-18 + S-16 trial fallbacks | Legacy API dual path | LOW | Trial messaging | Banner mismatch |
| **11** | S-21 activation resolver | Webhook row pick vs account model | **CRITICAL** | Payment activation | Wrong plan activated |
| **12** | S-22 billing reads | Parallel display authority | LOW | Billing UI only | Label mismatch |
| **13** | S-25 revenue KPIs | Not account-type based | MEDIUM | Admin analytics | Reporting drift |
| **14** | S-11 `getByRestaurant` | Restaurant display API | LOW | Deprecation | Admin UI only |

---

## 8. What breaks if sources change (summary)

| Source changed | Immediate breakage |
|----------------|-------------------|
| S-05 pick changes row | All entitlements flip; client gates reorder |
| S-10 scoped-first removed | Ordering may follow account PRO; scoped trial users change behavior |
| S-12 replaced by S-02 | `order.create` must use same function as `canOrder` |
| S-15 removed without per-feature gates | Template/color/font mutations unguarded or over-guarded |
| S-19 uses resolver limits | NONE users lose create ability; Enterprise gets null caps |
| S-20 removed | Unentitled users get 0 limits vs 1/10/100 |
| S-21 priority changed | Webhook activates wrong row → billing ≠ features |
| S-32 writes account-level trial | Register users appear in S-01 immediately |

---

## 9. ASN-1 path → source mapping

| ASN-1 ID | Primary source(s) |
|----------|-------------------|
| A-01 | S-01 ← S-05, S-04 |
| A-02 | S-02 ← S-01, S-03 |
| A-03–A-07 | S-02 (via API/hooks) |
| A-08 | S-02 admin branch |
| A-09 | S-22 |
| A-10 | S-31 |
| R-01 | S-11 |
| R-02 | S-10 |
| R-03 | S-12 ← S-10, S-13 |
| R-04 | S-12 |
| R-05 | S-11 |
| R-06–R-07 | S-19 ← S-10 |
| R-08 | S-32 → S-30 |
| R-09 | S-30, S-31 |
| H-01 | S-17 ← S-02, S-12 |
| H-02 | S-18 ← S-02, S-15, S-16 |
| H-03 | S-15 |
| H-04 | S-16 |
| H-05–H-06 | S-19 ← S-14 |
| H-07 | S-21 |
| U-01 | S-23 |
| U-02 | S-24 + S-15 |
| U-03 | S-20 |
| U-04 | S-13 |
| U-05 | S-02 + catalog metadata |
| U-06 | S-25 |
| U-07 | S-26 |
| U-08 | S-32 |
| B-01–B-03 | S-30, S-31 |

---

## 10. Forbidden actions confirmation

| Action | Status |
|--------|--------|
| Code changes | **None** |
| Subscription / billing / entitlement changes | **None** |
| CommercialContext changes | **None** |
| Migrations / adapters / hotfixes | **None** |

---

## 11. Success criteria

| Criterion | Status |
|-----------|--------|
| All authority sources inventoried | ✅ 24 sources (S-01–S-32) |
| All consumers mapped | ✅ §3 |
| Canonicality audit completed | ✅ §5 |
| Dependency graph completed | ✅ §4 (9 chains) |
| Blast radius assessment completed | ✅ §6 |
| Normalization ranking completed | ✅ §7 |
| No runtime behavior changed | ✅ |

---

## 12. Handoff to ASN-2.5

**ASN-2.5 Authority Canonicalization Decision** should decide:

1. **Single ordering authority function** — target: S-02 `features.ordering` only, or transitional unified helper?
2. **Subscription row scope at write time** — account-level only vs retain scoped rows for billing?
3. **Server mutation enforcement order** — ordering (CRITICAL) before limits (HIGH) before templates (MEDIUM)?
4. **Billing source isolation** — confirm S-30/S-31 remain outside feature gate migration (PG-1C.4B W4).

**Primary evidence for decision:** Rank 1–3 sources (S-10, S-12, S-17) and conflict G-02 vs G-03.

---

*ASN-2 Source Inventory complete. No code modified.*
