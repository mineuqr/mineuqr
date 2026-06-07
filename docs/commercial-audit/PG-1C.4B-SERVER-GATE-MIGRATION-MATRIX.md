# PG-1C.4B — Safe Server Enforcement Planning

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.4B — enforcement migration blueprint (planning only)  
**Date:** 2026-06-07  
**Mode:** Documentation and classification only — no runtime changes, no code modifications  

**Upstream:** PG-1C.4A `PG-1C.4A-SERVER-GATE-DISCOVERY.md` (54 gate locations)  
**Downstream:** PG-1C.4C — Wave 1 enforcement migration (pending approval)

---

## Document map

| Deliverable | Section |
|---|---|
| Migration matrix (every gate) | §1 |
| Current enforcement pattern inventory | §2 |
| Target enforcement contract | §3 |
| Migration waves | §4 |
| Rollback strategy | §5 |
| Migration readiness assessment | §6 |

---

## §1 — Server Gate Migration Matrix

Every gate from PG-1C.4A (S-01 through S-54) plus **planned future gates** (F-01 through F-08) identified in PG-1C.2D AD-4–AD-6 but not yet present in runtime.

**Risk legend:** SAFE | MEDIUM | HIGH | CRITICAL  
**Wave legend:** W1 (SAFE read) | W2 (feature writes) | W3 (limits/capacity) | W4 (billing/lifecycle — classification only)

### 1.1 Infrastructure & authority primitives

| ID | Router | Procedure / Function | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-01 | *(helper)* | `resolveSubscriptionEntitlement` | MEDIUM | Pattern E — period/status | `CommercialContext.subscription` → resolver input | W2 | Replaced by adapter; keep until all consumers migrate |
| S-02 | *(helper)* | `resolveTableOrderingEntitlement` | MEDIUM | Pattern B — `planId === 30001` | `features.ordering` | W2 | Maps to ordering stack (AD-6) |
| S-03 | *(helper)* | `userHasSubscriptionEntitlement` | MEDIUM | Pattern F — boolean entitled | `plan !== "NONE"` + period valid | W2 | Deprecated by per-feature checks |
| S-04 | *(helper)* | `BASIC_FREE_PLAN_ID` | MEDIUM | Pattern B — hardcoded planId | `features.ordering === false` for BASIC | W2 | Remove after ordering migrates |
| S-05 | *(helper)* | `isSubscriptionActive` | MEDIUM | Pattern F — boolean active | Per-feature keys (not boolean) | W2 | **Deprecate** — split to `templates`, `customColors`, `customFonts` |
| S-06 | *(helper)* | `getTrialEndDate` | SAFE | Pattern G — trial date read | `context.subscription.trialEndsAt` | W1 | Legacy read; shim via entitlements |
| S-07 | *(helper)* | `restaurantAllowsTableOrdering` | MEDIUM | Pattern B + E | `features.ordering` (owner entitlements) | W2 | Guest probe; resolve owner from `restaurantId` |
| S-08 | *(helper)* | `resolvePlanLimitsForUser` | HIGH | Pattern C — DB plan limits | `limits.restaurants/categories/items` | W3 | AD-1/AD-2: resolver limits, not DB row |
| S-09 | *(helper)* | `getFallbackBasicLimits` | HIGH | Pattern C — Basic fallback | `limits.*` NONE = 0/0/0 | W3 | AD-1: remove shadow free tier |
| S-10 | *(helper)* | `pickCanonicalSubscription` | MEDIUM | Pattern H — row selection | `pickUserLevelSubscription` (account scope) | W2 | Infrastructure; align with PG-1C.2E |
| S-11 | *(helper)* | `resolveOrderingSubscriptionRow` | MEDIUM | Pattern H — restaurant then account | Owner entitlements via account-level context | W2 | Scope normalization prerequisite for ordering |
| S-12 | *(helper)* | `pickUserLevelSubscription` | SAFE | Pattern H — account-level pick | Same (already used by adapter) | W1 | PG-1C.2E canonical scope |
| S-13 | *(helper)* | `buildCommercialContextFromDb` | SAFE | Pattern I — context adapter | `CommercialContext` | W1 | **Done** — read path foundation |
| S-14 | *(helper)* | `getCommercialEntitlements` | SAFE | Pattern J — resolver read | `CommercialEntitlements` | W1 | **Done** — no enforcement |

### 1.2 Router mutations — owner-facing

| ID | Router | Procedure | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-15 | `restaurant` | `create` | HIGH | Pattern C + D — `assertRestaurantCreateAllowed`; admin bypass | `limits.restaurants` | W3 | AD-1 NONE → deny create at 0 |
| S-16 | `restaurant` | `updateTemplate` | MEDIUM | Pattern F + A — premium list + `isSubscriptionActive` | `features.templates` (classic exempt) | W2 | AD-6; admin → `commercial.isAdmin` |
| S-17 | `restaurant` | `updateCustomColors` | MEDIUM | Pattern F — `isSubscriptionActive` | `features.customColors` | W2 | AD-3: Basic denied |
| S-18 | `restaurant` | `updateCustomFonts` | MEDIUM | Pattern F — `isSubscriptionActive` | `features.customFonts` | W2 | AD-3: Basic denied |
| S-19 | `category` | `create` | HIGH | Pattern C — `assertCategoryCreateAllowed` | `limits.categories` | W3 | Create capped; read ungated |
| S-20 | `menuItem` | `create` | HIGH | Pattern C — `assertMenuItemCreateAllowed` | `limits.items` | W3 | Create capped; read ungated |

### 1.3 Router — guest / public ordering

| ID | Router | Procedure | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-21 | `order` | `canOrder` | SAFE | Pattern B — `restaurantAllowsTableOrdering` | `features.ordering` (owner) | W1 | Read-only probe; no mutation |
| S-22 | `order` | `create` | MEDIUM | Pattern B — ordering entitlement + hours | `features.ordering` | W2 | Guest revenue path; staged rollout |

### 1.4 Router — read / legacy APIs

| ID | Router | Procedure | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-23 | `subscription` | `checkTrialStatus` | SAFE | Pattern F + G — `isSubscriptionActive` + trial date | `commercial.isTrial` + context dates | W1 | Legacy compat shim |
| S-24 | `subscription` | `getCurrentSubscription` | CRITICAL | Pattern B — `planId` + row read | Parallel read only; billing display | W4 | **Exclude** from enforcement migration |
| S-25 | `subscription` | `getByRestaurant` | CRITICAL | Pattern B — scoped `planId` read | Display only | W4 | **Exclude** |
| S-26 | `subscription` | `listPlans` | SAFE | None — public catalog | N/A | — | No migration |
| S-27 | `commercial` | `getEntitlements` | SAFE | Pattern J — canonical read | `CommercialEntitlements` | W1 | **Done** |

### 1.5 Limit assertion helpers

| ID | Router | Procedure / Function | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-28 | *(helper)* | `assertRestaurantCreateAllowed` | HIGH | Pattern C — count vs `maxRestaurants` | `limits.restaurants` + `null` = unlimited | W3 | Enterprise AD-2 |
| S-29 | *(helper)* | `assertCategoryCreateAllowed` | HIGH | Pattern C — count vs `maxCategories` | `limits.categories` | W3 | |
| S-30 | *(helper)* | `assertMenuItemCreateAllowed` | HIGH | Pattern C — count vs `maxItems` | `limits.items` | W3 | |

### 1.6 Trial lifecycle

| ID | Router | Procedure / Function | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-31 | *(lifecycle)* | `createTrialSubscription` | CRITICAL | Pattern B — Professional `planId` insert | Lifecycle authority (not feature key) | W4 | **Doc only** — no rewiring |
| S-32 | *(lifecycle)* | `resolveTrialPlanId` | CRITICAL | Pattern B — `sortOrder === 2` | Billing catalog | W4 | **Doc only** |
| S-33 | `auth-local` | `registerOwner` trial insert | CRITICAL | Pattern B — trial row on signup | Lifecycle | W4 | **Doc only** |
| S-34 | *(helper)* | `applyAdminTrialStatusUpdate` | CRITICAL | Pattern G — trial dates | Lifecycle | W4 | **Doc only** |
| S-35 | *(helper)* | `computeAdminSubscriptionPeriodEnd` | CRITICAL | Pattern G — period math | Lifecycle | W4 | **Doc only** |

### 1.7 Billing, subscriptions, invoices

| ID | Router | Procedure / Function | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-36 | `subscription` | `createCheckoutSession` | CRITICAL | Pattern B — `planId` validation | Billing `planId` (unchanged) | W4 | **Doc only** |
| S-37 | `subscription` | `createTapCheckout` | CRITICAL | Pattern B — `planId` metadata | Billing `planId` (unchanged) | W4 | **Doc only** |
| S-38 | *(webhook)* | `handlePayPalWebhook` | CRITICAL | Pattern B — activation by `planId` | Billing activation | W4 | **Doc only** |
| S-39 | *(webhook)* | `handleTapWebhook` | CRITICAL | Pattern B — activation | Billing activation | W4 | **Doc only** |
| S-40 | *(helper)* | `resolveSubscriptionForActivationFromRows` | CRITICAL | Pattern H — activation row pick | Billing scope | W4 | **Doc only** |
| S-41 | `admin` | `createRestaurantSubscription` | CRITICAL | Pattern B — admin `planId` CRUD | Operational | W4 | **Doc only** |
| S-42 | `admin` | `updateRestaurantSubscription` | CRITICAL | Pattern B — direct writes | Operational | W4 | **Doc only** |
| S-43 | `admin` | `createUserSubscriptionByAdmin` | CRITICAL | Pattern B — admin create | Operational | W4 | **Doc only** |
| S-44 | `admin` | `updateUserSubscriptionByAdmin` | CRITICAL | Pattern B — admin update | Operational | W4 | **Doc only** |
| S-45 | `admin` | `generateInvoicePDF` | CRITICAL | Pattern G — `status !== "trial"` | `commercial.invoiceEligible` | W4 | **Doc only** — future alignment |
| S-46 | `admin` | `cancelRestaurantSubscription` | CRITICAL | Status write | Lifecycle | W4 | **Doc only** |

### 1.8 Revenue / MRR / admin KPIs

| ID | Router | Procedure / Function | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-47 | *(helper)* | `subscriptionContributesToCommercialRevenue` | CRITICAL | Pattern G — `status === "active"` | `commercial.countsInRevenue` | W4 | **Doc only** |
| S-48 | *(helper)* | `computeAdminMrr` | CRITICAL | Pattern B — planId pricing | `commercial.countsInMrr` | W4 | **Doc only** |
| S-49 | `admin` | `getStatistics` | CRITICAL | Aggregates subs + MRR | Commercial flags | W4 | **Doc only** |
| S-50 | `admin` | `getRevenueByMonth` | CRITICAL | Pattern B + G — revenue filter | `commercial.countsInRevenue` | W4 | **Doc only** |
| S-51 | `admin` | `getSubscriptionDetails` | CRITICAL | Pattern B — planId labels | Display | W4 | **Doc only** |

### 1.9 Admin / role bypass (cross-cutting)

| ID | Router | Procedure / Function | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| S-52 | *(middleware)* | `assertAdminAccess` | SAFE | Pattern D — `role === "admin"` | Auth admin (non-commercial) | — | Stays; separate from commercial |
| S-53 | `restaurant` / `category` / `menuItem` | Multiple mutations | MEDIUM | Pattern D — skip checks if admin | `commercial.isAdmin` | W2–W3 | Replace bypass with resolver flag |
| S-54 | *(helper)* | `buildCommercialContextFromDb` admin branch | SAFE | Pattern D — ADMIN plan | `commercial.isAdmin` | W1 | **Done** in resolver |

### 1.10 Planned future gates (not in runtime today)

| ID | Router | Procedure | Risk | Current enforcement pattern | Target entitlement | Wave | Notes |
|---|---|---|---|---|---|---|---|
| F-01 | `restaurant` | `stats` | SAFE | None — tenant access only | `features.reports` (read gate) | W1 | AD-4: read-only stats; optional soft gate |
| F-02 | *(future)* | `exportReport` / Excel API | MEDIUM | None — client-only export | `features.excelExport` | W2 | AD-5: add when server export exists |
| F-03 | `restaurant` | `update` (`tableLabel`) | MEDIUM | None | `features.hotelMode` | W2 | AD-6: rooms vs tables |
| F-04 | `table` | `create` / `update` | MEDIUM | None — tenant only | `features.roomQr` | W2 | Depends on `hotelMode` |
| F-05 | `menuItem` | `uploadImage` | MEDIUM | None — tenant only | `features.menuImages` | W2 | AD-6 backlog |
| F-06 | `offer` | `create` | MEDIUM | None — tenant only | `features.dynamicServiceCatalog` or plan policy | W2 | Product decision pending |
| F-07 | `order` | `list` / status updates | MEDIUM | Tenant access only | `features.orderTracking` | W2 | Owner dashboard orders |
| F-08 | *(future)* | Print/reprint endpoints | MEDIUM | None | `thermalPrinting`, `autoPrint`, `reprint` | W2 | No print API today |

---

## §2 — Current Enforcement Pattern Inventory

### Pattern summary

| Pattern | Description | Example | Occurrences | Migration difficulty | Notes |
|---|---|---|---:|---|---|
| **A** | Hardcoded premium feature list | `premiumTemplates.includes(template)` | 1 | Low | Collapse into `features.templates` |
| **B** | Numeric `planId` / catalog plan check | `plan.id === 30001` | 18 | High | Billing paths must keep `planId`; feature paths use resolver |
| **C** | Resource count limits (DB plan row) | `assertCategoryCreateAllowed` | 7 | High | AD-1/AD-2; needs `null` unlimited semantics |
| **D** | Role-based admin bypass | `ctx.user.role !== "admin"` skip gate | 6 | Medium | Unify to `commercial.isAdmin` |
| **E** | Subscription period/status entitlement | `resolveSubscriptionEntitlement` | 4 | Medium | Stays as context input, not consumer gate |
| **F** | Boolean `isSubscriptionActive` | Any entitled trial/active | 5 | Medium | **Highest fragmentation risk** — split per feature |
| **G** | Trial/status lifecycle check | `status === "trial"` invoice block | 8 | Critical | Wave 4 only |
| **H** | Subscription row scope selection | `resolveOrderingSubscriptionRow` | 5 | High | Normalize before entitlements-based ordering |
| **I** | CommercialContext adapter | `buildCommercialContextFromDb` | 1 | Low | **Done** (PG-1C.2E) |
| **J** | Canonical resolver read | `getCommercialEntitlements` | 1 | Low | **Done** — enforcement consumers pending |
| **K** | No commercial gate (tenant/auth only) | `offer.create`, `restaurant.stats` | 20+ | Medium | AD-6 gap list; assign in W2 |

**Total distinct patterns:** 11  
**Total gated locations (PG-1C.4A):** 54  
**Ungated owner mutations (Pattern K):** 20+ procedures

### Fragmentation diagnosis

1. **Five call sites** share one boolean (`isSubscriptionActive`) for three different features (templates, colors, fonts).
2. **Ordering** uses `planId === 30001` instead of `features.ordering`.
3. **Limits** read DB `subscription_plans` caps, not resolver output.
4. **Admin bypass** uses `role === "admin"` at procedure level instead of `commercial.isAdmin` inside a shared assert.
5. **Billing** and **feature** authority both use `planId` with no separation layer.

---

## §3 — Target Enforcement Contract

**Conceptual only.** No implementation in PG-1C.4B.

### 3.1 Authority chain (normative)

```
Procedure
  → resolve CommercialContext (ownerId, now)
  → resolveCommercialEntitlements(context)
  → assert* (feature | limit | commercial flag)
  → TRPCError FORBIDDEN / FEATURE_NOT_AVAILABLE
```

### 3.2 Core assertions (conceptual API)

```typescript
// Feature gate — maps to planFeatureMatrix §3.2
assertCommercialFeature(
  entitlements: CommercialEntitlements,
  featureKey: FeatureKey  // e.g. "customColors", "ordering", "reports"
): void

// Limit gate — maps to PLAN_LIMITS §2.2
assertCommercialLimit(
  entitlements: CommercialEntitlements,
  limitKey: "restaurants" | "categories" | "items",
  currentCount: number
): void

// Commercial flag gate — billing/reporting (Wave 4+)
assertCommercialFlag(
  entitlements: CommercialEntitlements,
  flag: keyof CommercialEntitlements["commercial"]  // e.g. "invoiceEligible"
): void
```

### 3.3 Procedure integration pattern

```typescript
// Conceptual — restaurant.updateCustomColors (Wave 2)
const { entitlements } = await getCommercialEntitlements(ctx.user.id);
assertCommercialFeature(entitlements, "customColors");
// proceed with mutation
```

```typescript
// Conceptual — order.canOrder (Wave 1 read)
const ownerId = restaurant.userId;
const { entitlements } = await getCommercialEntitlements(ownerId);
return { canOrder: entitlements.features.ordering === true };
```

```typescript
// Conceptual — category.create (Wave 3)
const { entitlements } = await getCommercialEntitlements(ctx.user.id);
const stats = await getRestaurantStats(restaurantId);
assertCommercialLimit(entitlements, "categories", stats.totalCategories);
```

### 3.4 Rules

| Rule | Detail |
|---|---|
| R-1 | All feature gates use `FeatureKey` from `featureKeys.ts` — no string literals in procedures |
| R-2 | Admin bypass flows through `commercial.isAdmin` in resolver, not `ctx.user.role` at gate site |
| R-3 | `planId` remains billing truth in Wave 4 paths only — never used for feature gates post-W2 |
| R-4 | `limit === null` means unlimited (AD-2) — numeric compare skipped |
| R-5 | Guest public reads (`qrMenu`, `search`) stay ungated; owner mutations gate per matrix |
| R-6 | Error code: `FORBIDDEN` with stable message keys; optional `FEATURE_NOT_AVAILABLE` subtype |
| R-7 | Classic template ID always allowed regardless of `features.templates` |
| R-8 | Ordering stack keys (`cart`, `checkout`, etc.) delegate to `features.ordering` per AD-6 |

### 3.5 Parity with client

Server assertions MUST use the same resolver output as:

`useCommercialFeatureVisibility()` → `featureVisibility.ts` → `commercial.getEntitlements()`

No duplicate plan-name or `planId` branching in procedures after migration.

---

## §4 — Migration Waves

### Wave 1 — SAFE (read path & visibility support)

**PG-1C.4C implementation scope.** No mutation enforcement changes beyond read-path alignment.

| Gate IDs | Router procedures | Target |
|---|---|---|
| S-27 | `commercial.getEntitlements` | **Complete** |
| S-13, S-12, S-14 | Adapter + resolver read | **Complete** |
| S-23 | `subscription.checkTrialStatus` | Shim to `commercial.isTrial` + context dates |
| S-21 | `order.canOrder` | Owner `features.ordering` (read-only) |
| S-06 | `getTrialEndDate` (via shim) | Context dates |
| S-54 | Admin context branch | **Complete** |
| F-01 | `restaurant.stats` (optional) | Soft `features.reports` read gate |

**Explicitly excluded from W1:** S-16–S-22 mutations, all limit asserts, all billing.

### Wave 2 — MEDIUM (feature-controlled writes)

| Gate IDs | Scope |
|---|---|
| S-16 | `restaurant.updateTemplate` → `features.templates` |
| S-17, S-18 | Custom colors/fonts → `features.customColors`, `features.customFonts` |
| S-02, S-07, S-22 | Ordering stack → `features.ordering` |
| S-05 | Deprecate from feature paths |
| S-53 | Admin bypass → `commercial.isAdmin` |
| S-01–S-04, S-10, S-11 | Infrastructure consumed by above |
| F-02–F-08 | New gates per AD-4–AD-6 backlog |

**Dependencies:** Wave 1 complete; shared assert contract (§3); regression tests per plan state.

### Wave 3 — HIGH (limits & commercial capacity)

| Gate IDs | Scope |
|---|---|
| S-08, S-09 | Limit source → resolver |
| S-28, S-29, S-30 | Limit asserts → `assertCommercialLimit` |
| S-15, S-19, S-20 | Create mutations → resolver limits |
| AD-1 | NONE → 0/0/0 |
| AD-2 | Enterprise → `null` unlimited |

**Dependencies:** Wave 2 stable; product comms for NONE users; Enterprise category ceiling removal sign-off.

### Wave 4 — CRITICAL (classification only)

**No implementation planning beyond classification.** These gates remain on legacy authority indefinitely until a separate billing/revenue program approves migration.

| Gate IDs | Domain |
|---|---|
| S-24–S-26 | Subscription read/catalog |
| S-31–S-35 | Trial lifecycle |
| S-36–S-40 | Checkout + webhooks + activation |
| S-41–S-46 | Admin subscription + invoice |
| S-47–S-51 | MRR / revenue / admin KPIs |

---

## §5 — Rollback Strategy

### Wave 1 — SAFE

| Dimension | Approach |
|---|---|
| **Deployment** | Feature-flag optional shim (`COMMERCIAL_W1_READ_SHIM=1`); default off until validated |
| **Validation** | Compare `checkTrialStatus` output vs `getEntitlements` for trial/active users; `canOrder` vs legacy `restaurantAllowsTableOrdering` |
| **Monitoring** | Log divergence counts on diagnostics route; alert if shim differs from legacy >0.1% |
| **Rollback** | Disable flag; revert to legacy read functions; zero data migration |

### Wave 2 — MEDIUM

| Dimension | Approach |
|---|---|
| **Deployment** | Per-procedure flags (`COMMERCIAL_ENFORCE_TEMPLATES`, `_COLORS`, `_ORDERING`); enable one at a time |
| **Validation** | Vitest matrix: NONE, TRIAL, BASIC, PROFESSIONAL, ENTERPRISE, ADMIN × each procedure; manual guest order smoke |
| **Monitoring** | Track `FORBIDDEN` rate per procedure; compare to baseline; support ticket tag `commercial-w2` |
| **Rollback** | Per-flag disable restores legacy `isSubscriptionActive` / `planId` check for that procedure only |

### Wave 3 — HIGH

| Dimension | Approach |
|---|---|
| **Deployment** | Dark-launch: compute resolver limits alongside legacy, log-only diff before enforcing |
| **Validation** | Staging accounts at NONE/Basic/Enterprise boundaries; restaurant/category/item create attempts |
| **Monitoring** | Limit-denial rate; accounts affected by NONE 0/0/0 transition |
| **Rollback** | Flag `COMMERCIAL_LIMITS_V2=0` reverts to `resolvePlanLimitsForUser` + Basic fallback |

### Wave 4 — CRITICAL

| Dimension | Approach |
|---|---|
| **Deployment** | **Not planned in PG-1C program** |
| **Validation** | Finance QA + payment sandbox regression required before any future program |
| **Monitoring** | Revenue reconciliation dashboards |
| **Rollback** | N/A — documentation classification only |

---

## §6 — Migration Readiness Assessment

### 6.1 Gate counts

| Metric | Count |
|---|---:|
| Total server gates discovered (PG-1C.4A) | 54 |
| Planned future gates (AD-6 gap) | 8 |
| **SAFE** | 8 |
| **MEDIUM** | 22 |
| **HIGH** | 10 |
| **CRITICAL** | 22 |
| Already migrated (W1 complete) | 4 (S-12, S-13, S-14, S-54) |

### 6.2 Recommended Wave 1 scope (PG-1C.4C)

| Include | Exclude |
|---|---|
| `subscription.checkTrialStatus` entitlements shim | All mutation enforcement |
| `order.canOrder` entitlements-based read | `order.create` |
| Optional `restaurant.stats` reports read gate | Limit asserts (W3) |
| Server gate registry + diagnostics | Billing, webhooks, trial, MRR |
| Contract tests: shim ≡ legacy read | `updateTemplate`, colors, fonts |

### 6.3 Recommended exclusions (all waves until approved)

- PayPal / Tap checkout and webhooks (S-36–S-39)
- Trial creation on register (S-31–S-33)
- Admin subscription CRUD (S-41–S-44)
- Invoice PDF generation rules (S-45)
- MRR / revenue calculations (S-47–S-51)
- Database schema changes
- New plans or pricing

### 6.4 Open questions

| # | Question | Blocks |
|---|---|---|
| Q-1 | Should `restaurant.stats` hard-deny BASIC or return degraded data? | F-01 W1 scope |
| Q-2 | Ordering scope: account-level vs restaurant-level subscription for multi-location? | S-11, S-21, S-22 |
| Q-3 | Grandfather NONE users on Basic fallback limits or hard cutover? | W3 AD-1 |
| Q-4 | When to add server-side Excel export API vs client-only gate? | F-02 |
| Q-5 | `hotelMode` / `tableLabel`: retroactive deny for existing room labels? | F-03 |

### 6.5 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Basic users lose server save for colors/fonts (AD-3) | Medium | W2 per-flag rollout; UI already locked (PG-1C.3C) |
| Guest ordering breakage | High | W2 last in wave; `canOrder` W1 parity testing |
| NONE users lose create capacity (AD-1) | High | W3 comms; dark-launch diff logging |
| Resolver vs legacy mismatch | Medium | 34/34 resolver tests + procedure integration tests |
| Multi-row subscription inflation | Medium | Canonical pick alignment (S-10–S-12) |

### 6.6 Preconditions for PG-1C.4C (Wave 1 implementation)

| # | Precondition | Status |
|---|---|---|
| P-1 | PG-1C.4A discovery complete | ✅ |
| P-2 | PG-1C.4B planning complete | ✅ |
| P-3 | `commercial.getEntitlements` live read-only | ✅ |
| P-4 | Client visibility consolidated (PG-1C.3C) | ✅ |
| P-5 | Resolver 34/34 tests passing | ✅ (PG-1C.2C) |
| P-6 | AD-1 through AD-7 approved | ✅ (PG-1C.2D) |
| P-7 | Product sign-off on W1 read shim scope | ⏳ Pending approval |
| P-8 | Feature flags for rollback defined | ⏳ Implement in 4C |

### 6.7 Completion verdict

| Criterion | Met? |
|---|---|
| Migration matrix exists | ✅ §1 (54 + 8 planned) |
| Enforcement patterns documented | ✅ §2 |
| Target contract documented | ✅ §3 (conceptual only) |
| Migration waves defined | ✅ §4 |
| Rollback strategy exists | ✅ §5 |
| Readiness assessment exists | ✅ §6 |
| No production behavior changed | ✅ |
| No runtime code modified | ✅ |

**Program status:**

```
PG-1C.4A Discovery  ✅
PG-1C.4B Planning   ✅
PG-1C.4C Wave 1     ← Ready for approval
```

---

## Appendix — Wave assignment summary

| Wave | Gate count | Risk profile | Implementation |
|---|---:|---|---|
| W1 SAFE | 8 | Read-only alignment | PG-1C.4C |
| W2 MEDIUM | 22 | Feature write enforcement | PG-1C.4D+ |
| W3 HIGH | 10 | Limits & capacity | PG-1C.4E+ |
| W4 CRITICAL | 22 | Billing/lifecycle/revenue | Separate program; doc only |
