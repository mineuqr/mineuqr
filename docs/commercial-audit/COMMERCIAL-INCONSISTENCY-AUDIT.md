# COMMERCIAL-INCONSISTENCY-AUDIT.md

**PG-1A.6 — Commercial Inconsistency Audit**  
**Mode:** Read-only comparison (approved model vs runtime)  
**Branch:** main  
**Date:** 2026-06-05  

No code, schema, commits, fixes, or implementation proposals were performed.

**Evidence base:** PG-1A.1 (`PLAN-SOURCE-OF-TRUTH-AUDIT.md`), PG-1A.2 (`ENTITLEMENT-RESOLUTION-AUDIT.md`), PG-1A.3 (`COMMERCIAL-DATA-MODEL-AUDIT.md`), PG-1A.4 (`SUBSCRIPTION-SCOPE-AUDIT.md`), PG-1A.5 (`COMMERCIAL-FLOW-AUDIT.md`), plus spot verification in source files cited below.

---

## Approved Commercial Model (Reference Baseline)

```
Owner → Subscription → Plan → Entitlements → Restaurants
```

| Tier / role | Approved rules |
|---|---|
| **Basic** | 1 restaurant; QR menu; **no ordering** |
| **Professional** | Up to 5 restaurants; ordering; cart; table ordering; commercial features |
| **Enterprise** | Unlimited restaurants |
| **Trial** | Professional features; 14 days; no MRR; no revenue; no invoices |
| **Admin** | No revenue; no billing; no subscription requirement; unlimited access |

---

## SECTION 1 — Plan Model Consistency

| Rule | Expected | Actual | Rating | Evidence |
|---|---|---|---|---|
| Basic: 1 restaurant | `maxRestaurants = 1` | Enforced via `resolvePlanLimitsForUser` → plan row when entitled | **CONSISTENT** | `server/seed-plans.mjs:20`, `subscriptionPlanLimits.ts:46–67` (PG-1A.1) |
| Basic: QR menu | Public menu available | No subscription gate on public menu routes | **CONSISTENT** | PG-1A.2 Section 2 matrix |
| Basic: no ordering | Ordering blocked on Basic | Ordering blocked only when `plan.id === 30001` (`BASIC_FREE_PLAN_ID`), **not** when on seeded Basic plan | **INCONSISTENT** | `subscriptionEntitlement.ts:134–140`; PG-1A.1 lines 61–62 |
| Professional: up to 5 restaurants | `maxRestaurants = 5` | Enforced from plan row when entitled | **CONSISTENT** | `seed-plans.mjs:40` |
| Professional: ordering / cart / table ordering | Enabled for Professional+ | Any entitled non-`30001` plan (includes Basic catalog plan) | **INCONSISTENT** | Same ordering gate as above; PG-1A.2 |
| Professional: commercial features | Tier-specific feature set | Premium templates/colors/fonts gated by **any** entitled trial/active sub, not Professional-only | **PARTIAL** | `routers.ts:236–293`; PG-1A.2 |
| Enterprise: unlimited restaurants | Unlimited | Seed value `maxRestaurants: 999` | **PARTIAL** | `seed-plans.mjs:61` |
| Enterprise: unlimited items | Unlimited | Seed `maxItemsPerRestaurant: 9999` (numeric cap, not unbounded) | **PARTIAL** | `seed-plans.mjs:62` |
| Plan definitions in catalog | Basic / Professional / Enterprise drive all gates | Numeric limits from DB; ordering uses hardcoded `30001`; `features` JSON not enforced | **PARTIAL** | PG-1A.1; no runtime read of `plan.features` |
| Plan enforcement via catalog names | Tier name determines features | Code uses `planId`, `sortOrder`, and `30001` constant — not tier names | **INCONSISTENT** | PG-1A.1, PG-1A.2 |
| Separate free ordering tier (`30001`) | Not in approved 3-tier model | Exists in code, excluded from trials, blocks ordering | **INCONSISTENT** | `create-trial-subscription.ts:13`, `subscriptionEntitlement.ts:7` |
| Pricing UI feature lists | Match enforced entitlements | UI renders `plan.features` from DB; runtime ignores that JSON | **INCONSISTENT** | `Pricing.tsx:385–428`; PG-1A.1 |
| Error message vs enforcement | Message matches gate logic | `order.create` cites "Professional or Enterprise" but gate is `plan.id !== 30001` | **INCONSISTENT** | `routers.ts:1685` vs `subscriptionEntitlement.ts:134` |

---

## SECTION 2 — Subscription Model Consistency

### Expected chain

```
Owner → Subscription → Plan → Entitlements → Restaurants
```

### Actual chain (PG-1A.3, PG-1A.4)

```
User
├─ Restaurants (restaurants.userId)           [parallel ownership]
├─ Subscriptions (user_subscriptions.userId)  [user-owned, optional restaurantId scope]
│   └─ Plan (planId)
└─ Invoices (userId + subscriptionId)
```

| Aspect | Expected | Actual | Rating |
|---|---|---|---|
| Subscription owned by owner/user | Owner holds subscription | `user_subscriptions.userId` owns row | **CONSISTENT** (if Owner = user account) |
| Subscription precedes restaurants in hierarchy | Sub → restaurants | Register creates user + restaurant + sub in one transaction; restaurant row does not reference subscription | **PARTIAL** |
| Restaurant owned by subscription | Restaurants derive from sub | Restaurants owned by `userId`; subscription optionally scoped by `restaurantId` | **INCONSISTENT** |
| One subscription per owner | Single commercial relationship | Multiple `user_subscriptions` rows per user allowed | **INCONSISTENT** |
| Scope model | Single understandable model | Hybrid: account-level (`0`) vs restaurant-scoped (`>0`) with feature-specific resolution | **INCONSISTENT** | PG-1A.4 Section 8 |
| Additional restaurants create subscription | Sub expands with venues | `restaurant.create` inserts restaurant only; no new sub row | **PARTIAL** (entitlements inherited via resolvers) | PG-1A.5 Section 3 |
| Payment activates existing row | Upgrade same commercial relationship | Webhook UPDATE on existing row; `restaurantId` unchanged | **CONSISTENT** | PG-1A.5 Section 4 |

### Deviations summary

1. **Restaurants do not hang under subscription** — parallel entities under user.
2. **Scope tag `restaurantId`** is not reflected in approved linear hierarchy.
3. **Multi-row subscriptions** possible; canonical pick resolves ambiguity per call site.

### Ambiguities

- Approved "Owner" maps to `users` row, not a distinct entity — consistent if defined that way.
- Whether one subscription should cover all restaurants vs per-restaurant subs — approved model implies one sub → many restaurants; runtime allows both patterns.

---

## SECTION 3 — Trial Model Consistency

| Rule | Expected | Actual | Rating | Evidence |
|---|---|---|---|---|
| Trial grants Professional features | Professional tier | `resolveTrialPlanId()` → `sortOrder === 2` (Professional) | **CONSISTENT** | `create-trial-subscription.ts:19–27` (PG-1A.1, LAUNCH-5B) |
| Trial duration 14 days | 14 days | `TRIAL_DAYS = 14`; `trialEndsAt` set accordingly | **CONSISTENT** | `create-trial-subscription.ts:7,35–48` |
| Trial excluded from MRR | No MRR | `subscriptionContributesToCommercialRevenue` → `status === "active"` only | **CONSISTENT** | `adminKpiCalculations.ts:4–5` |
| Trial excluded from revenue metrics | No revenue | Same helper used in MRR and `getRevenueByMonth` | **CONSISTENT** | `db.ts:828`, PG-1A.5 Section 6 |
| Trial excluded from invoices | No invoices | `assertSubscriptionEligibleForAdminInvoice` rejects `status === "trial"` | **CONSISTENT** | `adminSubscriptionHelpers.ts:204–213` |
| Trial expiry behavior | Clear trial end state | Runtime deny via `trialEndsAt`; DB `status` may remain `"trial"` | **PARTIAL** | PG-1A.5 Section 2 |
| Auto transition trial → expired | (Implied clean lifecycle) | No job sets `status = "expired"` on lapse | **INCONSISTENT** | PG-1A.5 Section 2 |
| Trial scope at registration | Account-level trial | Register creates **restaurant-scoped** trial (`restaurantId = new restaurant`) | **PARTIAL** | `registerOwner.ts:149–153`; PG-1A.4 |
| Trial ordering access | Professional ordering | Trial on Professional plan → ordering allowed (non-30001) | **CONSISTENT** with runtime (not with Basic-no-ordering product rule) | PG-1A.2 |

---

## SECTION 4 — Entitlement Consistency

| Feature | Expected (approved model) | Actual | Rating |
|---|---|---|---|
| **Restaurant limits** | Basic 1 / Pro 5 / Enterprise unlimited | Numeric `maxRestaurants` from entitled plan; Enterprise = 999 | **PARTIAL** |
| **Ordering** | Basic: off; Pro/Enterprise: on | Off only for plan `30001`; Basic catalog plan can order if entitled | **INCONSISTENT** |
| **Cart** | Follows ordering tier | Shown when `canPlaceOrder`; server enforces same ordering gate | **INCONSISTENT** (inherits ordering mismatch) |
| **Table ordering** | Pro+ feature | Same as ordering; error text says Pro/Enterprise | **INCONSISTENT** |
| **Templates (premium)** | Commercial / Pro feature | Any entitled trial/active; admin bypass | **PARTIAL** |
| **Colors** | Commercial / Pro feature | Same as templates | **PARTIAL** |
| **Fonts** | Commercial / Pro feature | Same as templates | **PARTIAL** |
| **Call waiter** | Implied in marketing / platform story | No resolver or API gate found | **INCONSISTENT** (capability absent) |
| **Request bill** | Implied in marketing | No enforcement found | **INCONSISTENT** (capability absent) |
| **Reports** | Pro lists "Monthly Reports" in seed | `restaurant.stats` — tenant access only, no plan gate | **INCONSISTENT** |
| **Exports** | Not defined in approved tier list | No commercial export gate found | **N/A / INCONSISTENT** if assumed commercial |

### Resolver reference (actual)

| Feature | Resolver chain | Scope |
|---|---|---|
| Restaurant create limit | `assertRestaurantCreateAllowed` → `resolvePlanLimitsForUser(userId)` | Account-wide canonical |
| Ordering | `restaurantAllowsTableOrdering` → `resolveOrderingSubscriptionRow` → `resolveTableOrderingEntitlement` | Scoped + fallback to `0` |
| Premium UX | `isSubscriptionActive` → `userHasSubscriptionEntitlement` | Any row; scope ignored |
| Category/item limits | `assert*Allowed` → `resolvePlanLimitsForUser(userId, restaurantId)` | Scoped + fallback |

Sources: PG-1A.2 Sections 2–3, PG-1A.4 Section 3.

---

## SECTION 5 — Admin Model Consistency

| Rule | Expected | Actual | Rating | Evidence |
|---|---|---|---|---|
| No revenue (admin accounts) | Admin users not counted in commercial revenue | MRR filters by `subscription.status === "active"` only — **no `users.role` exclusion** | **INCONSISTENT** | `adminKpiCalculations.ts:33–42`; PG-1A.5 Section 6 |
| No billing (admin accounts) | Admins not billed | Admin **operators** generate invoices for subscribers; admin **users** can hold subscription rows and be invoiced like any user | **PARTIAL** | `routers.ts:1191–1254` |
| No subscription requirement | Unlimited access without sub | `role === "admin"` bypasses limits and premium gates on mutations | **CONSISTENT** | `routers.ts:119–120,237–238,264–265,291–292,371–372,449–450`; PG-1A.2 Section 4 |
| Unlimited access | Full platform access | Bypass on restaurant limits, categories, items, templates, colors, fonts, tenant access | **CONSISTENT** | PG-1A.2 |
| Unlimited ordering (admin) | Unlimited access includes ordering | **No admin bypass** on `restaurantAllowsTableOrdering` / `order.create` | **INCONSISTENT** | PG-1A.2; `routers.ts:1683–1686` |
| Admin restaurant create | Unlimited | Skips `assertRestaurantCreateAllowed` | **CONSISTENT** | `routers.ts:119–120` |
| Admin in subscriber KPI counts | N/A | Admin subscriptions counted in `totalSubscribers`, `activeSubscribers` if rows exist | **PARTIAL** | `db.ts:782–797` |

---

## SECTION 6 — MRR & Revenue Consistency

| Rule | Expected | Actual | Rating | Evidence |
|---|---|---|---|---|
| Trial exclusion from MRR | Excluded | `status === "active"` only | **CONSISTENT** | `adminKpiCalculations.ts:4–5` |
| Admin exclusion from MRR | Admin not in MRR | No role filter on subscribers | **INCONSISTENT** | PG-1A.5 Section 6 |
| One MRR unit per paying owner | Single subscription per owner | Each `active` row summed independently | **INCONSISTENT** | PG-1A.4 Section 5; PG-1A.5 Section 6 |
| Scope handling in MRR | Predictable per owner | `restaurantId` ignored in MRR | **INCONSISTENT** with hybrid scope model | `computeAdminMrr` |
| Revenue month attribution | Current MRR / billing period | `getRevenueByMonth` buckets by subscription `createdAt` month | **INCONSISTENT** | `db.ts:826–829`; PG-1A.5 |
| Invoice-based revenue | (Not specified) | MRR does not read `invoices` table | **N/A** | PG-1A.5 Section 5 |
| Expired status in MRR | Excluded | Excluded (`active` only) | **CONSISTENT** | `adminKpiCalculations.ts:4` |
| Lapsed trial still `status=trial` | Excluded from MRR | Excluded (status gate, not period gate) | **CONSISTENT** for MRR; **PARTIAL** for KPI semantics | PG-1A.5 Section 2 |
| `activeSubscribers` KPI | Paying only | Counts `active` **or** `trial` | **PARTIAL** (label vs trial inclusion) | `db.ts:782` |

---

## SECTION 7 — Scope Model Consistency

| Area | Expected (single model) | Actual (hybrid) | Rating |
|---|---|---|---|
| One subscription scope rule | Account-level sub covers all restaurants | Mix of `restaurantId=0` and scoped rows; resolution varies by feature | **INCONSISTENT** |
| Register trial scope | Account trial | Restaurant-scoped trial at register | **INCONSISTENT** |
| Display per restaurant | Same sub shown everywhere | `getByRestaurant` strict; admin list uses scoped+fallback | **INCONSISTENT** |
| Ordering entitlement | Follows owner subscription | Scoped-first + user-level fallback | **PARTIAL** (documented hybrid) |
| Restaurant count limits | From owner subscription | Account-wide canonical (ignores per-restaurant scope) | **PARTIAL** |
| Payment activation | Updates owner sub | Updates one row; scope unchanged | **CONSISTENT** |
| Invoice linkage | Owner subscription | Canonical user sub (any scope) | **PARTIAL** |
| Immutable scope after create | (Not specified) | `restaurantId` never updated | **CONSISTENT** internally; may conflict with upgrade expectations |

**Consistent areas:** Scope immutability; payment updates same row; documented resolver functions behave deterministically (PG-1A.4).

**Ambiguous areas:** Whether second restaurant should inherit account-level or scoped trial; which sub "counts" for dashboard vs pricing page.

**Conflicting areas:** Strict vs fallback queries for same user (`getSubscriptionForRestaurant` vs `getAllRestaurantsWithSubscriptions`).

---

## SECTION 8 — UI Consistency Audit

| Screen | UI behavior | Backend behavior | Match? |
|---|---|---|---|
| **Pricing** (`Pricing.tsx`) | Lists plans from DB `features` JSON; trial banner via `checkTrialStatus`; current plan via `getCurrentSubscription` | Features JSON not enforced; trial from any entitled row; canonical account-wide sub | **PARTIAL** |
| **Dashboard** (restaurant detail) | Subscription expiry via `subscription.getByRestaurant` | Strict scoped query — null if only account-level sub | **INCONSISTENT** |
| **TemplateSelector** | Locks premium templates using `checkTrialStatus` + admin flag | Server uses `isSubscriptionActive`; admin bypass | **CONSISTENT** (dual layer) |
| **ColorCustomizer / FontCustomizer** | `isSubscribed \|\| isAdmin` | Server `isSubscriptionActive` + admin bypass | **CONSISTENT** |
| **MenuView / Cart** | Cart when `canOrder` + hours | Server ordering gate (`30001` rule) | **PARTIAL** (UI doesn't explain tier) |
| **SubscriptionSuccess** | Polls `getCurrentSubscription` after payment | Activation via webhook only | **PARTIAL** (timing dependency) |
| **PaymentHistory** | `invoice.list` + `getCurrentSubscription` | Matches backend | **CONSISTENT** |
| **AdminManagement** | MRR KPI, create sub, generate invoice, restaurant+sub onboarding | Matches admin routes | **CONSISTENT** |
| **Statistics** | MRR from `admin.getStatistics` | `computeAdminMrr` rules | **CONSISTENT** with backend (including backend inconsistencies) |
| **Landing / locales** (`en.json`) | Claims ordering, service requests, analytics | Ordering gated; call waiter/request bill not implemented | **INCONSISTENT** |
| **order.create error** | Arabic message: Professional or Enterprise | Code: any plan except `30001` | **INCONSISTENT** |

---

## SECTION 9 — Severity Matrix

| ID | Inconsistency | Severity | Layer |
|---|---|---|---|
| I-01 | Basic plan can access ordering when entitled (only `30001` blocked) | **P0** | Entitlement / Plan |
| I-02 | MRR double-counts multiple `active` rows per user | **P0** | Reporting |
| I-03 | Approved tier names ≠ ordering enforcement (`30001` vs Basic/Pro) | **P0** | Plan / Entitlement |
| I-04 | `plan.features` shown in Pricing but not enforced | **P1** | Plan / UI |
| I-05 | Call waiter / request bill marketed, not implemented | **P1** | Entitlement / UI |
| I-06 | Admin role not excluded from MRR if admin has active subscription | **P1** | Reporting / Admin |
| I-07 | Hybrid scope: Dashboard `getByRestaurant` vs account-level subs | **P1** | Scope / UI |
| I-08 | Enterprise "unlimited" = 999 / 9999 caps | **P2** | Plan |
| I-09 | Trial `status` stays `trial` after period lapse (no auto-expired) | **P2** | Subscription |
| I-10 | Premium features not tier-specific (any entitled sub) | **P2** | Entitlement |
| I-11 | Reports not gated despite seed/marketing claims | **P2** | Entitlement / Plan |
| I-12 | `getRevenueByMonth` uses `createdAt`, not recurring MRR semantics | **P2** | Reporting |
| I-13 | Register creates restaurant-scoped trial vs account-level expectation | **P2** | Scope / Subscription |
| I-14 | Admin unlimited access excludes ordering bypass | **P2** | Admin / Entitlement |
| I-15 | Dual plan universe: seed catalog + hardcoded `30001` | **P2** | Plan |
| I-16 | Multiple subscriptions per user vs single-owner model | **P2** | Subscription |
| I-17 | `order.create` error message misstates gate | **P3** | UI |
| I-18 | `activeSubscribers` KPI includes trials | **P3** | Reporting |
| I-19 | Tap webhook may not update `planId`/`trialEndsAt` on activation | **P3** | Subscription (flow) |
| I-20 | `generateInvoicePDF` ignores input `subscriptionId` | **P3** | Reporting / Admin |
| I-21 | Approved hierarchy Owner→Sub→Restaurants vs User-parallel model | **P3** | Subscription (documentation) |
| I-22 | Locale marketing feature list ≠ enforced entitlements | **P3** | UI |

No solutions attached — classification only.

---

## SECTION 10 — Root Cause Analysis

| Origin layer | Inconsistencies driven | Evidence |
|---|---|---|
| **Plan layer** | I-03, I-04, I-08, I-11, I-15; Basic ordering mismatch | Separate `30001` constant vs seed tiers; `features` JSON unused; Enterprise numeric caps (`PG-1A.1`) |
| **Subscription layer** | I-09, I-13, I-16, I-19; trial lifecycle | No expiry job; multi-row model; register scoped trial (`PG-1A.5`) |
| **Entitlement layer** | I-01, I-05, I-10, I-11; ordering and premium gates | Single ordering rule on plan id; premium = any entitled sub; missing call waiter/bill (`PG-1A.2`) |
| **Scope layer** | I-07, I-13; hybrid resolution | Three resolution modes (strict / fallback / account-wide) (`PG-1A.4`) |
| **Admin layer** | I-06, I-14; bypass partial | Bypass registry in `routers.ts` excludes ordering and MRR (`PG-1A.2`, `PG-1A.5`) |
| **Reporting layer** | I-02, I-06, I-12, I-18, I-20 | MRR sums rows not owners; no role filter; cohort revenue by `createdAt` (`PG-1A.5` Section 6) |
| **Hybrid interaction** | I-07, I-02, I-13; cross-layer | Scope + MRR + UI queries compose conflicting user-visible state (`PG-1A.4`, `PG-1A.5`) |
| **UI / marketing layer** | I-04, I-05, I-17, I-22 | Pricing/landing copy not wired to resolvers (`Pricing.tsx`, `en.json`) |

### Primary root-cause pattern (factual)

The approved model assumes **tier-named plans drive all feature gates** under a **single owner subscription**. Runtime implements **numeric plan limits** + **one hardcoded ordering exception (`30001`)** + **hybrid scope resolution** + **admin ad-hoc bypasses**, with **reporting that counts subscription rows not owners**.

That structural split — not any single bug — produces most **P0/P1** inconsistencies above.

---

## Consistency Summary Matrix

| Domain | CONSISTENT | PARTIAL | INCONSISTENT |
|---|---|---|---|
| Plan limits (restaurants/items/categories) | 3 | 2 | 3 |
| Plan feature assignment (ordering, commercial) | 1 | 2 | 5 |
| Subscription ownership | 2 | 3 | 3 |
| Trial (commercial rules) | 5 | 2 | 1 |
| Entitlements (feature matrix) | 0 | 4 | 6 |
| Admin model | 2 | 2 | 2 |
| MRR / revenue | 3 | 2 | 4 |
| Scope model | 2 | 3 | 4 |
| UI vs backend | 4 | 4 | 4 |

---

## Audit Cross-References

| Topic | Primary audit doc | Key sections |
|---|---|---|
| Plan catalog & `30001` | PG-1A.1 | §1, §4 |
| Resolver inventory | PG-1A.2 | §1, §2, §7 |
| Ownership model | PG-1A.3 | §2, §3, §9 |
| Scope hybrid | PG-1A.4 | §4, §5, §8 |
| Lifecycle flows | PG-1A.5 | §1–6, §9 |

---

*End of audit. No recommendations. No fixes. No code changes.*
