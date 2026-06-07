# PG-1C.2C — Authority Verification

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.2C — verify the Commercial Authority Layer against current runtime behavior and produce a replacement strategy  
**Date:** 2026-06-07  
**Mode:** Read-only audit — no code changes, no router rewiring, no billing rewiring, no database changes  

**Upstream artifacts:**

- PG-1C.1A `COMMERCIAL-AUTHORITY-SPEC.md`
- PG-1C.1B `docs/commercial-spec/PLAN-FEATURE-MATRIX.md`
- PG-1C.2A `docs/commercial-audit/PG-1C.2A-CURRENT-AUTHORITY-DISCOVERY.md`
- PG-1C.2B `src/lib/commercial/` (foundation layer)

**Evidence run:** `npx vitest run src/lib/commercial` — **34/34 tests passed** (2026-06-07).

---

## 1. Verification Summary

| Dimension | Result | Evidence |
|---|---|---|
| Resolver conforms to PLAN-FEATURE-MATRIX | **PASS** | 34 unit tests; matrix rows match spec §2.2, §3.2, §4 |
| Feature key coverage (`featureKeys.ts` → `planFeatureMatrix.ts`) | **PASS** | 21/21 keys present in every plan row; `getFeaturesForPlan` iterates `FEATURE_KEYS` |
| Unlimited limits (`null`) for Enterprise/Admin | **PASS** | `planFeatureMatrix.test.ts` asserts `null` for both plans on all three limit keys |
| Resolver vs legacy runtime alignment | **PARTIAL** | 6 material mismatches documented in §2 and §6 |
| Legacy authority inventory classified | **COMPLETE** | 101 locations from PG-1C.2A classified in §4 |
| Ready as **single runtime authority** | **NOT READY** | Pure resolver is spec-complete; runtime rewiring, DB adapter, and mismatch remediation are prerequisites |

**Headline finding:** The foundation layer (`resolveCommercialEntitlements` + `planFeatureMatrix`) is a faithful implementation of the approved commercial contract. It is **not yet safe** to replace the 101 legacy authority locations without an input adapter (numeric `planId` → `catalogPlan`), subscription-scope normalization, and explicit regression handling for the mismatches below.

---

## 2. Resolver vs Runtime Comparison

For each supported commercial state, this section documents resolver output, matrix expectation, current runtime behavior, and deltas.

**Runtime reference modules:** `server/subscriptionEntitlement.ts`, `server/subscriptionPlanLimits.ts`, `server/db.ts`, `server/routers.ts`, `server/adminKpiCalculations.ts`, `client/src/pages/TemplateSelector.tsx`.

### 2.1 NONE

| Field | Resolver output | Matrix expectation | Current runtime | Difference |
|---|---|---|---|---|
| `plan` | `NONE` | NONE account state | No entitled subscription row (or canceled/expired/lapsed period) | Aligned on detection |
| `accountType` | `NONE` | NONE | Implicit — no `isSubscriptionActive` | Aligned |
| `limits` | `{ restaurants: 0, categories: 0, items: 0 }` | §2.2 zero caps | `getFallbackBasicLimits()` → **1 / 10 / 100** when unentitled (`subscriptionPlanLimits.ts`) | **MISMATCH** — runtime grants Basic-tier quotas to unentitled owners |
| `features.qrMenu` / `search` | `true` | Y / Y (guest read) | Public menu routes remain accessible | Aligned |
| `features.templates` | `false` | N | `isSubscriptionActive` false → premium templates blocked server-side; classic allowed | Aligned for templates |
| `features.ordering` | `false` | N | `restaurantAllowsTableOrdering` → false (no entitled sub) | Aligned |
| `commercial.*` | All participation flags `false` | §4.3 | `subscriptionContributesToCommercialRevenue` → false | Aligned |
| Expired active period | `plan: NONE`, `status: "active"` preserved | Treat as NONE for owner actions | `resolveSubscriptionEntitlement` → `isEntitled: false` | Aligned on entitlement; limits still fall back to Basic |

**Risk:** Migrating limit enforcement to resolver NONE (0/0/0) will **block restaurant creation** for currently-unentitled owners who today receive Basic fallback limits.

---

### 2.2 TRIAL

| Field | Resolver output | Matrix expectation | Current runtime | Difference |
|---|---|---|---|---|
| `plan` | `TRIAL` | Account state, not catalog plan | Trial row with Professional `planId` (30002 via `sortOrder === 2`) | Aligned on feature outcome; resolver uses named state |
| `accountType` | `TRIAL` | TRIAL | `isSubscriptionActive` → true when period-valid | Aligned |
| `limits` | `5 / 25 / 500` | Mirrors Professional | From Professional plan row in DB | Aligned |
| `features` | Full Professional set (ordering, reports, hotel, customization) | §3.2 all Y except N/A | Ordering via non-30001 plan; templates/colors/fonts via `isSubscriptionActive` | Aligned |
| `commercial.isTrial` | `true` | true | Implicit via `status === "trial"` | Aligned |
| `commercial.countsInMrr/Revenue` | `false` | Excluded | `subscriptionContributesToCommercialRevenue` → only `active` | Aligned |
| `commercial.invoiceEligible` | `false` | Not eligible | `assertSubscriptionEligibleForAdminInvoice("trial")` blocks | Aligned |
| Expired trial | `plan: NONE`, `status: "trial"` retained | NONE for owner actions | `resolveSubscriptionEntitlement` → not entitled | Aligned |

**Risk:** Low for trial itself. Subscription-scope divergence (account vs restaurant row) can cause trial entitlement to differ per API path — not a resolver defect, but a wiring risk.

---

### 2.3 BASIC

| Field | Resolver output | Matrix expectation | Current runtime | Difference |
|---|---|---|---|---|
| `plan` | `BASIC` | Paid catalog plan | Active row with `planId === 30001` | Aligned when plan ID maps correctly |
| `accountType` | `PAYING` | PAYING when active | Treated as entitled subscriber | Aligned |
| `limits` | `1 / 10 / 100` | §2.2 | DB plan row 30001: 1 / 100 / 10 | Aligned (field order differs in code: items vs categories) |
| `features.ordering` | `false` | N | `resolveTableOrderingEntitlement` blocks `plan.id === 30001` | Aligned |
| `features.templates` | `true` | Y | `isSubscriptionActive` → premium templates allowed | Aligned |
| `features.customColors` | `false` | N | `isSubscriptionActive` → **allowed** (`routers.ts` `updateCustomColors`) | **MISMATCH** — Basic subscribers can customize colors/fonts today |
| `features.customFonts` | `false` | N | Same as colors | **MISMATCH** |
| `features.reports` / `excelExport` | `false` | N | Reports tab / Excel export have **no plan gate** (`Dashboard.tsx`) | **MISMATCH** — UI exposes reports without server enforcement |
| `commercial.countsInMrr/Revenue` | `true` | Included | `status === "active"` included in MRR | Aligned per row; multi-row inflation risk remains (see §6) |

---

### 2.4 PROFESSIONAL

| Field | Resolver output | Matrix expectation | Current runtime | Difference |
|---|---|---|---|---|
| `plan` | `PROFESSIONAL` | Paid catalog plan | Active row `planId === 30002` | Aligned |
| `accountType` | `PAYING` | PAYING | Entitled active subscriber | Aligned |
| `limits` | `5 / 25 / 500` | §2.2 | DB plan 30002: 5 / 500 / 25 | Aligned |
| `features` | Full operational set enabled | §3.2 all Y | Ordering allowed; limits enforced; templates/colors/fonts via `isSubscriptionActive` | Largely aligned |
| `commercial` | `isPaid: true`, `isEnterprise: false`, revenue flags true | §4 | MRR/revenue included for `active` | Aligned at row level |

**Minor gap:** Feature keys `hotelMode`, `roomQr`, `dynamicServiceCatalog`, `thermalPrinting`, etc. have **no dedicated server gates** in runtime — access is implicit via ordering entitlement or unrestricted mutation paths.

---

### 2.5 ENTERPRISE

| Field | Resolver output | Matrix expectation | Current runtime | Difference |
|---|---|---|---|---|
| `plan` | `ENTERPRISE` | Paid catalog plan | Active row `planId === 30003` | Aligned |
| `limits.restaurants` | `null` (unlimited) | `null` per §2.3 | DB: **999** (`COMMERCIAL-DATA-SNAPSHOT.md` §6) | **MISMATCH** — magic number vs canonical `null` |
| `limits.categories` | `null` | `null` | DB: **100** | **MISMATCH** |
| `limits.items` | `null` | `null` | DB: **9999** | **MISMATCH** |
| `features` | Same as Professional | All Y | Full access when entitled | Aligned on features |
| `commercial.isEnterprise` | `true` | true | Not checked in runtime (no enterprise-specific gates) | New capability in resolver only |

**Risk:** Replacing `resolvePlanLimitsForUser` with resolver output will change Enterprise enforcement semantics. Consumers must implement `limit === null → allow` before cutover; until then, DB numeric caps remain authoritative.

---

### 2.6 ADMIN

| Field | Resolver output | Matrix expectation | Current runtime | Difference |
|---|---|---|---|---|
| `plan` | `ADMIN` | Operational account type | `ctx.user.role === "admin"` bypasses | Aligned on outcome |
| `accountType` | `ADMIN` | ADMIN | Role check, not subscription | Aligned |
| `limits` | `null / null / null` | Unlimited | Skips `assertRestaurantCreateAllowed`, category/item asserts | Aligned (behavioral unlimited) |
| `features` | All `true` | All Y | Bypasses subscription checks on mutations | Aligned |
| `commercial` | `isAdmin: true`, revenue/MRR/invoice all `false` | §6 outside commercial | Admin excluded from MRR via not having paying rows; admin actions don't bill admin | Aligned |
| Subscription ignored | Yes — admin wins over any sub snapshot | §6 | Admin bypass even if subscription present | Aligned |

---

### 2.7 Resolver output reference (valid inputs, `now = 2026-06-01T12:00:00Z`)

Condensed snapshot from `resolveCommercialEntitlements` (see `src/lib/commercial/__tests__/resolveCommercialEntitlements.test.ts` for full assertions):

| State | `accountType` | `plan` | `limits (R/C/I)` | `ordering` | `templates` | `customColors` | `countsInRevenue` |
|---|---|---|---|:---:|:---:|:---:|:---:|
| NONE | NONE | NONE | 0 / 0 / 0 | N | N | N | N |
| TRIAL | TRIAL | TRIAL | 5 / 25 / 500 | Y | Y | Y | N |
| BASIC | PAYING | BASIC | 1 / 10 / 100 | N | Y | N | Y |
| PROFESSIONAL | PAYING | PROFESSIONAL | 5 / 25 / 500 | Y | Y | Y | Y |
| ENTERPRISE | PAYING | ENTERPRISE | null / null / null | Y | Y | Y | Y |
| ADMIN | ADMIN | ADMIN | null / null / null | Y | Y | Y | N |

---

## 3. Matrix Coverage Audit

### 3.1 Feature keys

**Source:** `src/lib/commercial/featureKeys.ts` — **21 keys**.

| # | Key | In `FEATURE_MATRIX` (all 6 plans)? | Resolves via `getFeaturesForPlan`? |
|---|---|:---:|:---:|
| 1 | `qrMenu` | Y | Y |
| 2 | `categories` | Y | Y |
| 3 | `menuImages` | Y | Y |
| 4 | `search` | Y | Y |
| 5 | `ordering` | Y | Y |
| 6 | `cart` | Y | Y |
| 7 | `checkout` | Y | Y |
| 8 | `requestBill` | Y | Y |
| 9 | `callWaiter` | Y | Y |
| 10 | `orderTracking` | Y | Y |
| 11 | `thermalPrinting` | Y | Y |
| 12 | `autoPrint` | Y | Y |
| 13 | `reprint` | Y | Y |
| 14 | `reports` | Y | Y |
| 15 | `excelExport` | Y | Y |
| 16 | `hotelMode` | Y | Y |
| 17 | `roomQr` | Y | Y |
| 18 | `dynamicServiceCatalog` | Y | Y |
| 19 | `templates` | Y | Y |
| 20 | `customColors` | Y | Y |
| 21 | `customFonts` | Y | Y |

**Result:** **21/21 keys covered.** `getFeaturesForPlan` builds output by reducing over `FEATURE_KEYS`, so new keys cannot be omitted silently.

### 3.2 Limits

| Plan | `limits.restaurants` | `limits.categories` | `limits.items` | Matrix §2.2 match |
|---|---:|---:|---:|:---:|
| TRIAL | 5 | 25 | 500 | Y |
| BASIC | 1 | 10 | 100 | Y |
| PROFESSIONAL | 5 | 25 | 500 | Y |
| ENTERPRISE | `null` | `null` | `null` | Y |
| ADMIN | `null` | `null` | `null` | Y |
| NONE | 0 | 0 | 0 | Y |

**Unlimited standard:** Only Enterprise and Admin use `null`. Test: `uses null for Enterprise and Admin unlimited caps only`.

**Trial/Professional parity:** `PLAN_LIMITS.TRIAL === PLAN_LIMITS.PROFESSIONAL` — verified by test.

### 3.3 Commercial flags

All six plans define complete `CommercialFlags` (7 fields) via `PLAN_COMMERCIAL_FLAGS` + `PLAN_COMMERCIAL_PARTICIPATION`. Test coverage confirms boolean presence for every plan.

### 3.4 Coverage gaps (matrix vs runtime enforcement)

The matrix defines 21 features; runtime enforces only a subset directly:

| Feature area | Matrix defined | Runtime enforced today |
|---|---|---|
| Ordering stack | Y/N per plan | `resolveTableOrderingEntitlement` (plan 30001 block only) |
| Templates | Y/N per plan | `premiumTemplates` list + `isSubscriptionActive` |
| Custom colors/fonts | Y/N per plan | `isSubscriptionActive` (any entitled, not plan-specific) |
| Restaurant/category/item limits | Per plan | `subscriptionPlanLimits.ts` from DB plan row |
| Reports / Excel | Y/N per plan | **Not gated** on server |
| Hotel / offers / printing | Y/N per plan | **Not gated** by plan-specific checks |

**Conclusion:** Matrix coverage in the **authority layer code is complete**. Runtime **consumer coverage is ~30%** of matrix keys — the remaining keys are spec-ready but not yet wired.

---

## 4. Legacy Authority Classification

All **101** locations from PG-1C.2A, classified for replacement risk.

**Legend:**

- **SAFE_TO_REPLACE** — UI visibility, display-only, or client gates where server already enforces; low revenue impact; easy rollback.
- **MEDIUM_RISK** — Server feature/limit/trial checks; behavior change affects owners; requires integration tests.
- **HIGH_RISK** — Billing, revenue, subscription lifecycle, webhooks, invoice generation; financial/reporting impact.

### 4.1 Core entitlement & resolution (20)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 1 | `subscriptionEntitlement.ts` `BASIC_FREE_PLAN_ID` | MEDIUM_RISK | Ordering gate; must map to `features.ordering` |
| 2 | `resolveSubscriptionEntitlement` | MEDIUM_RISK | Period logic duplicated in resolver; canonical pick still needed |
| 3 | `resolveTableOrderingEntitlement` | MEDIUM_RISK | Feature gate; Basic mismatch already documented |
| 4 | `userHasSubscriptionEntitlement` | MEDIUM_RISK | Feeds `isSubscriptionActive` |
| 5 | `subscriptionEntitledNow` | MEDIUM_RISK | Resolver ranking dependency |
| 6 | `subscriptionPeriodEndInstant` | MEDIUM_RISK | Tie-break logic not in resolver input |
| 7 | `subscriptionCanonicalRank` | MEDIUM_RISK | Multi-row selection |
| 8 | `compareSubscriptionsCanonical` | MEDIUM_RISK | Multi-row selection |
| 9 | `pickCanonicalSubscription` | MEDIUM_RISK | Account-level authority pick |
| 10 | `pickUserLevelSubscription` | MEDIUM_RISK | Account-level filter |
| 11 | `resolveOrderingSubscriptionRow` | MEDIUM_RISK | Restaurant-scoped override |
| 12 | `resolveSubscriptionForActivationFromRows` | HIGH_RISK | Payment activation target selection |
| 13 | `getCanonicalUserSubscription` | MEDIUM_RISK | Owner API subscription source |
| 14 | `getSubscriptionForRestaurant` | MEDIUM_RISK | Restaurant-scoped read |
| 15 | `getOrderingSubscriptionForRestaurant` | MEDIUM_RISK | Ordering scope composition |
| 16 | `isSubscriptionActive` | MEDIUM_RISK | Used by templates/colors/fonts |
| 17 | `getTrialEndDate` | MEDIUM_RISK | Trial UI |
| 18 | `restaurantAllowsTableOrdering` | MEDIUM_RISK | Public ordering gate |
| 19 | `resolveSubscriptionForActivation` | HIGH_RISK | Billing activation |
| 20 | `updateSubscriptionForActivation` | HIGH_RISK | Billing state mutation |

### 4.2 Plan limits (8)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 21 | `DEFAULT_LIMITS` | MEDIUM_RISK | Fallback constants |
| 22 | `getFallbackBasicLimits` | MEDIUM_RISK | NONE vs Basic mismatch |
| 23 | `resolvePlanLimitsForUser` | MEDIUM_RISK | Core limit resolver |
| 24 | `assertRestaurantCreateAllowed` | MEDIUM_RISK | Owner mutation gate |
| 25 | `assertCategoryCreateAllowed` | MEDIUM_RISK | Quota gate |
| 26 | `assertMenuItemCreateAllowed` | MEDIUM_RISK | Quota gate |
| 27 | `drizzle/schema.ts` plan defaults | HIGH_RISK | Schema/catalog source of truth |
| 28 | `seed-plans.mjs` | HIGH_RISK | Catalog seed; Enterprise magic numbers |

### 4.3 Trial lifecycle (12)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 29–35 | `create-trial-subscription.ts` (7 symbols) | HIGH_RISK | Trial creation + plan ID resolution |
| 36 | `registerOwner.ts` trial insert | HIGH_RISK | Signup commercial state |
| 37–40 | `adminSubscriptionHelpers.ts` trial helpers (4) | HIGH_RISK | Admin trial mutations |

### 4.4 Billing, revenue & invoices (11)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 41 | `subscriptionContributesToCommercialRevenue` | HIGH_RISK | Revenue inclusion rule |
| 42 | `monthlyEquivalentPlanPrice` | HIGH_RISK | MRR calculation |
| 43 | `computeAdminMrr` | HIGH_RISK | MRR aggregate |
| 44 | `computeRenewalRate` | HIGH_RISK | KPI |
| 45 | `computeChurnRate` | HIGH_RISK | KPI |
| 46 | `getAdminStatistics` | HIGH_RISK | Admin dashboard aggregates |
| 47 | `getRevenueByMonth` | HIGH_RISK | Revenue time series |
| 48 | `getSubscriptionDetails` | MEDIUM_RISK | Read-only export |
| 49 | `assertSubscriptionEligibleForAdminInvoice` | HIGH_RISK | Invoice eligibility |
| 50 | `paypal-webhook.ts` | HIGH_RISK | Payment activation |
| 51 | `tap-webhook.ts` | HIGH_RISK | Payment activation |

### 4.5 Admin role & bypasses (12)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 52 | `assertAdminAccess` | MEDIUM_RISK | Security gate (non-commercial) |
| 53 | `adminProcedure` | MEDIUM_RISK | Security middleware |
| 54 | `assertRestaurantAccess` admin bypass | MEDIUM_RISK | Tenant + admin |
| 55 | `isEmailVerificationRequired` admin exempt | SAFE_TO_REPLACE | Non-commercial |
| 56–61 | `routers.ts` admin skip asserts (6) | MEDIUM_RISK | Must map to `commercial.isAdmin` |
| 62 | `admin.*` procedures | MEDIUM_RISK | Operational |
| 63 | `resolveAdminRestaurantOwnerUserId` | MEDIUM_RISK | Admin tooling |

### 4.6 Router enforcement (17)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 64 | `restaurant.updateTemplate` | MEDIUM_RISK | `features.templates` |
| 65 | `restaurant.updateCustomColors` | MEDIUM_RISK | `features.customColors` |
| 66 | `restaurant.updateCustomFonts` | MEDIUM_RISK | `features.customFonts` |
| 67 | `category.create` | MEDIUM_RISK | `limits.categories` |
| 68 | `menuItem.create` | MEDIUM_RISK | `limits.items` |
| 69 | `restaurant.create` | MEDIUM_RISK | `limits.restaurants` |
| 70 | `subscription.listPlans` | SAFE_TO_REPLACE | Public catalog read |
| 71 | `subscription.getCurrentSubscription` | MEDIUM_RISK | Owner status API |
| 72 | `subscription.getByRestaurant` | MEDIUM_RISK | Scoped read — divergence risk |
| 73 | `subscription.checkTrialStatus` | MEDIUM_RISK | Client gate feeder |
| 74 | `subscription.createCheckoutSession` | HIGH_RISK | Billing |
| 75 | `subscription.createTapCheckout` | HIGH_RISK | Billing |
| 76 | `admin.generateInvoicePDF` | HIGH_RISK | Invoice creation |
| 77 | `admin.createUserSubscriptionByAdmin` | HIGH_RISK | Admin sub create |
| 78 | `admin.updateUserSubscriptionByAdmin` | HIGH_RISK | Admin sub edit |
| 79 | `order.canOrder` | MEDIUM_RISK | `features.ordering` |
| 80 | `order.create` | MEDIUM_RISK | `features.checkout` |

### 4.7 Admin data aggregation (2)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 81 | `getAllRestaurantsWithSubscriptions` | HIGH_RISK | Commercial join model |
| 82 | `getAllUsersWithSubscriptions` | HIGH_RISK | Non-canonical pick — MRR skew |

### 4.8 Client UI authority (19)

| # | Location | Classification | Rationale |
|---:|---|---|---|
| 83 | `TemplateSelector.tsx` `isSubscribed` | SAFE_TO_REPLACE | UI lock; server enforces on save |
| 84 | `TemplateSelector.tsx` template grid lock | SAFE_TO_REPLACE | UI only |
| 85 | `MenuTemplates.tsx` `isPremium` | SAFE_TO_REPLACE | Catalog display |
| 86 | `ColorCustomizer.tsx` `canCustomizeColors` | SAFE_TO_REPLACE | UI; server enforces |
| 87 | `FontCustomizer.tsx` `canCustomizeFonts` | SAFE_TO_REPLACE | UI; server enforces |
| 88 | `MenuView.tsx` ordering UI | SAFE_TO_REPLACE | Server `canOrder` is truth |
| 89 | `Dashboard.tsx` subscription warning | SAFE_TO_REPLACE | Display only |
| 90 | `Dashboard.tsx` ReportsTab Excel | MEDIUM_RISK | Ungated export — UI should match `features.excelExport` |
| 91 | `Pricing.tsx` | SAFE_TO_REPLACE | Marketing/checkout entry |
| 92 | `SubscriptionManagement.tsx` | SAFE_TO_REPLACE | Display |
| 93 | `PaymentHistory.tsx` | SAFE_TO_REPLACE | Display |
| 94 | `SubscriptionSuccess.tsx` | SAFE_TO_REPLACE | Post-checkout polling |
| 95 | `computeAdminKPIs.ts` | MEDIUM_RISK | Partial re-implementation of server KPIs |
| 96 | `AdminKPISection.tsx` | SAFE_TO_REPLACE | Renders server MRR |
| 97 | `Statistics.tsx` | SAFE_TO_REPLACE | Admin analytics display |
| 98 | `AdminManagement.tsx` | MEDIUM_RISK | Admin sub CRUD UI |
| 99 | `useAuthGate.ts` | SAFE_TO_REPLACE | Route visibility |
| 100 | `queryRuntime.ts` | SAFE_TO_REPLACE | Admin query enablement |
| 101 | `LandingNavbar.tsx` | SAFE_TO_REPLACE | Admin nav link |

### 4.9 Classification summary

| Classification | Count | % |
|---|---:|---:|
| SAFE_TO_REPLACE | 18 | 17.8% |
| MEDIUM_RISK | 58 | 57.4% |
| HIGH_RISK | 25 | 24.8% |
| **Total** | **101** | **100%** |

---

## 5. Replacement Waves

### Wave 1 — Client / UI gates

| Attribute | Detail |
|---|---|
| **Scope** | #83–89, #91–94, #96–97, #99–101 (18 SAFE locations); introduce read-only `useCommercialEntitlements()` client hook fed by new `subscription.getEntitlements` procedure (future) |
| **Risk** | Low — server remains authoritative; UI-only drift reduction |
| **Dependencies** | Server adapter that exposes resolver output to authenticated owners; no billing changes |
| **Exit criteria** | Template/color/font locks derive from `features.*` flags; no behavior change on mutations |

### Wave 2 — Template and feature restrictions

| Attribute | Detail |
|---|---|
| **Scope** | #64–66 (template/color/font mutations), #85 premium catalog, `templates.test.ts`; align #90 Reports Excel with `features.excelExport` |
| **Risk** | Medium — Basic subscribers lose color/font customization (spec-correct); reports export may newly gate |
| **Dependencies** | Wave 1 entitlements API; explicit product sign-off on Basic customization regression |
| **Exit criteria** | `features.templates`, `features.customColors`, `features.customFonts`, `features.excelExport` drive gates; remove `premiumTemplates` hardcoded list |

### Wave 3 — Server-side authorization

| Attribute | Detail |
|---|---|
| **Scope** | #1–20 entitlement/resolver modules, #21–26 limits, #52–61 admin bypass mapping, #67–69 quota asserts, #71–73 subscription reads, #79–80 ordering; replace `isSubscriptionActive` with `features.*` checks |
| **Risk** | High operational impact — NONE limit change, Enterprise `null` semantics, subscription-scope normalization |
| **Dependencies** | `planId` → `catalogPlan` mapper; canonical subscription picker feeding resolver input; `limit === null` enforcement helper; regression suite for all plan states |
| **Exit criteria** | No direct `planId === 30001` checks; `resolveCommercialEntitlements` is sole feature/limit authority |

### Wave 4 — Billing / revenue / subscription metrics

| Attribute | Detail |
|---|---|
| **Scope** | #12, #19–20, #27–28, #29–40, #41–51, #74–78, #81–82; MRR/revenue uses `commercial.countsInMrr` / `countsInRevenue` at **owner** granularity |
| **Risk** | Critical — financial reporting, payment webhooks, invoice eligibility |
| **Dependencies** | Wave 3 complete; owner-level deduplication for MRR; data migration for Enterprise DB limits optional (display vs authority) |
| **Exit criteria** | KPIs match spec §4.3; trials/admin/none excluded; one active subscription per owner enforced |

---

## 6. Risk Assessment

### 6.1 Resolver mismatches (behavioral)

| ID | Mismatch | Severity | Migration note |
|---|---|---|---|
| M1 | NONE limits: resolver `0/0/0` vs runtime Basic fallback `1/10/100` | **High** | Product decision: block vs grace-period create |
| M2 | Enterprise limits: resolver `null` vs DB `999/9999/100` | **High** | Enforce `null` in code; DB values become display-only |
| M3 | Basic `customColors`/`customFonts`: resolver N vs runtime Y | **Medium** | Wave 2 will remove access for Basic users |
| M4 | Reports/Excel: resolver N for Basic vs ungated UI | **Medium** | Wave 2 server + UI gate |
| M5 | Expired trial/active: resolver NONE but DB status unchanged | **Low** | Aligns with spec §5.3; ensure error codes (`TRIAL_EXPIRED`) |
| M6 | `isSubscriptionActive` conflates trial/basic/professional for customization | **Medium** | Replace with per-feature flags |

### 6.2 Missing infrastructure (not resolver defects)

| Gap | Impact |
|---|---|
| No `planId` → `catalogPlan` adapter | Cannot wire resolver to DB rows |
| No owner-level subscription snapshot builder | Input contract unused at runtime |
| Restaurant-scoped subscription rows | `resolveOrderingSubscriptionRow` not represented in resolver input |
| No `TRIAL_EXPIRED` / `FEATURE_NOT_AVAILABLE` emission from resolver | Error mapping belongs in consumer layer (spec §5.6) |

### 6.3 Missing runtime feature enforcement

14 of 21 feature keys have no dedicated server consumer today (`cart`, `checkout`, `requestBill`, `callWaiter`, `orderTracking`, printing stack, `hotelMode`, `roomQr`, `dynamicServiceCatalog`, `reports`, etc.). Wiring the resolver without adding consumers creates false confidence — gates must be added as part of Wave 2–3.

### 6.4 Legacy authority conflicts

| Conflict | Locations | Resolution |
|---|---|---|
| Account vs restaurant subscription scope | #11, #14–15, #72, #81 | Normalize to owner-level input before resolver |
| Duplicate “active subscription” boolean | #2–4, #16, #73, #83 | Deprecate `isSubscriptionActive` in favor of entitlements object |
| Premium template tripartite list | #64, #85, tests | Single `features.templates` + template metadata |
| MRR row iteration vs owner account | #43, #82 | Wave 4 owner deduplication |
| Enterprise unlimited as 999 | #28, snapshot §6 | Do not read numeric caps for authority when plan is Enterprise |

### 6.5 Commercial regressions during migration

| Regression scenario | Trigger | Mitigation |
|---|---|---|
| Basic owners lose color/font customization | Wave 2 | Release note; optional grandfather period |
| Unentitled owners cannot create first restaurant | Wave 3 NONE limits | Staged rollout; monitor support tickets |
| Enterprise owner blocked at 999 restaurants | Wave 3 if `null` not implemented | Mandatory `null` check helper before assert |
| MRR drop or spike | Wave 4 owner dedup | Parallel run old vs new KPI for one billing cycle |
| Trial user sees locked UI but server allows | Wave 1 before server | Ship client hook only after API stable |
| Payment webhook activates wrong row | Wave 4 | Keep activation path unchanged until resolver-fed pick validated |

---

## 7. Go / No-Go Recommendation

### 7.1 Component verdicts

| Component | Verdict | Rationale |
|---|---|---|
| `planFeatureMatrix.ts` | **GO** | Complete matrix; 21/21 keys; limits match PLAN-FEATURE-MATRIX §2–§4 |
| `resolveCommercialEntitlements.ts` | **GO** | Pure resolver passes 29 tests; period/status logic matches spec §5.3–§5.5 intent |
| Unit test suite | **GO** | 34/34 passing — evidence of contract conformance |
| Runtime replacement (all 101 locations) | **NO-GO** | No adapter, no wiring, 6 behavioral mismatches, 14 unenforced feature keys |
| Wave 1 (UI-only, read-only entitlements API) | **CONDITIONAL GO** | Proceed after minimal server endpoint returns resolver output; no mutation path changes |

### 7.2 Overall recommendation

**NO-GO for declaring the resolver the single commercial authority source in production today.**

**GO for phased migration** using the wave plan in §5, beginning with a thin **entitlements read API** that:

1. Loads canonical owner subscription (account-level pick from PG-1C.2A #9–10).
2. Maps `planId` 30001/30002/30003 → `BASIC` / `PROFESSIONAL` / `ENTERPRISE`.
3. Calls `resolveCommercialEntitlements({ ownerId, role, subscription, now })`.
4. Returns the §8 contract to clients and internal consumers.

**Prerequisites before Wave 3 cutover:**

- [ ] Resolve M1 (NONE limits policy) with product owner
- [ ] Implement `limit === null` enforcement (M2)
- [ ] Add per-feature server gates for ordering stack at minimum (M3–M4)
- [ ] Parallel-run resolver vs legacy for integration test matrix (all 6 states)

**Success criteria met by this audit:**

- [x] Resolver verified per supported state with documented deltas
- [x] Matrix coverage verified (features + limits + `null` unlimited)
- [x] 101 legacy locations classified
- [x] Replacement waves with scope, risk, dependencies
- [x] Risk assessment with regression scenarios
- [x] Evidence-based Go/No-Go for single authority promotion

The Commercial Authority Layer **foundation is spec-ready**. Promoting it to **runtime single source of truth** requires the adapter and wave migration above — estimated **25 HIGH_RISK** and **58 MEDIUM_RISK** touchpoints before billing paths may move.

---

*Audit only. No implementation. No schema changes. No migrations.*
