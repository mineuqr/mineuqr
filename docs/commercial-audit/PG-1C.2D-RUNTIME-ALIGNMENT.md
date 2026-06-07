# PG-1C.2D — Runtime Alignment

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.2D — align runtime assumptions with the commercial contract before authority migration waves  
**Date:** 2026-06-07  
**Mode:** Analysis and alignment only — no runtime changes, no authority replacement, no router rewiring, no billing rewiring, no schema changes  

**Upstream artifacts:**

- PG-1C.1A `COMMERCIAL-AUTHORITY-SPEC.md`
- PG-1C.1B `docs/commercial-spec/PLAN-FEATURE-MATRIX.md`
- PG-1C.2A `PG-1C.2A-CURRENT-AUTHORITY-DISCOVERY.md`
- PG-1C.2B `src/lib/commercial/`
- PG-1C.2C `PG-1C.2C-AUTHORITY-VERIFICATION.md`
- PG-1C.2D `docs/commercial-spec/PLAN-ID-MAPPING.md` (companion deliverable)

---

## 1. Alignment Summary

PG-1C.2C confirmed the resolver is specification-correct. PG-1C.2D resolves the six runtime mismatches with **explicit canonical decisions** that supersede legacy behavior. All decisions defer implementation to migration waves; no code changes in this phase.

| ID | Mismatch | Canonical decision | Implementation wave |
|---|---|---|---|
| AD-1 | NONE limits | Authority `0/0/0` | Wave 3 |
| AD-2 | Enterprise unlimited | Authority `null`; DB numbers display-only | Wave 3 |
| AD-3 | Basic customization | `customColors` / `customFonts` denied for BASIC | Wave 2 |
| AD-4 | Reports access | `reports` denied for BASIC; gate owner stats UI/API | Wave 2 |
| AD-5 | Excel export access | `excelExport` denied for BASIC; gate client export | Wave 2 |
| AD-6 | Feature enforcement coverage | All 21 keys enforced per matrix before Wave 3 complete | Wave 2–3 |
| AD-7 | planId → catalogPlan | Official mapping in `PLAN-ID-MAPPING.md` | Wave 1 (adapter) |

**Wave 1 verdict:** **SAFE TO BEGIN** after approval of this document and `PLAN-ID-MAPPING.md`, provided Wave 1 scope remains **read-only** (entitlements API + client display). No mutation-path or billing changes in Wave 1.

---

## 2. Runtime Alignment Decisions

Each mismatch documents current runtime behavior, commercial contract behavior, the approved canonical behavior, and rationale.

---

### AD-1: NONE Limits

| Dimension | Detail |
|---|---|
| **Current runtime** | `resolvePlanLimitsForUser` falls back to `getFallbackBasicLimits()` when no entitled subscription — **1 restaurant / 10 categories / 100 items** (`server/subscriptionPlanLimits.ts`). Unentitled owners can create one restaurant and populate it within Basic quotas. |
| **Commercial contract** | PLAN-FEATURE-MATRIX §2.2: NONE → `restaurantLimit: 0`, `categoryLimit: 0`, `itemLimit: 0`. §1.7: owner mutations gated; public guest menu may remain visible. |
| **Canonical behavior** | **Adopt contract.** NONE accounts receive `limits: { restaurants: 0, categories: 0, items: 0 }`. Owner create/mutate paths deny when at or above limit. Existing restaurant content and public QR menus remain readable (guest `qrMenu` / `search` stay enabled). |
| **Rationale** | Fallback limits were a development convenience that contradict the owner-centric model: no commercial relationship means no commercial quotas. Granting Basic-tier capacity to NONE accounts creates a shadow free tier not defined in PG-1C.1A. Zero limits force explicit trial or paid conversion before owner expansion. |

**Transition note:** Owners who today operate under fallback limits without a subscription will lose create capacity at Wave 3. Communicate before cutover; no grandfathering unless product explicitly reverses this decision.

---

### AD-2: Enterprise Unlimited Handling

| Dimension | Detail |
|---|---|
| **Current runtime** | Limits read from `subscription_plans` row 30003: **999 restaurants / 9999 items / 100 categories** (`COMMERCIAL-DATA-SNAPSHOT.md` §6). `assertRestaurantCreateAllowed` compares `count >= maxRestaurants` with numeric 999. |
| **Commercial contract** | PLAN-FEATURE-MATRIX §2.3: Enterprise (and Admin) use **`null` = unlimited**. Forbidden: magic numbers 999/9999 in entitlement output. Enforcement: `if (limit === null) → allow`. |
| **Canonical behavior** | **Authority layer uses `null`.** `resolveCommercialEntitlements` output for ENTERPRISE already correct. Runtime limit consumers MUST check `null` before numeric compare. DB columns remain unchanged (display/marketing legacy); they MUST NOT be read for authority after Wave 3. |
| **Rationale** | Magic numbers create false ceilings (e.g. 100 categories on Enterprise contradicts "unlimited" marketing copy) and drift risk when DB seed changes. `null` is the single unlimited sentinel across authority, tests, and spec. |

**Transition note:** Enterprise owners above 100 categories today are within DB cap but below true unlimited intent — Wave 3 removes the 100-category ceiling. No schema migration required.

---

### AD-3: Basic Customization Permissions

| Dimension | Detail |
|---|---|
| **Current runtime** | `restaurant.updateCustomColors` and `restaurant.updateCustomFonts` gate on `isSubscriptionActive(userId)` — any entitled trial/active subscriber passes, **including Basic (30001)**. Client mirrors via `isSubscribed \|\| isAdmin` (`ColorCustomizer.tsx`, `FontCustomizer.tsx`). |
| **Commercial contract** | PLAN-FEATURE-MATRIX §3.2: BASIC → `customColors: N`, `customFonts: N`. PROFESSIONAL+ and TRIAL → Y. |
| **Canonical behavior** | **Adopt contract.** Gate on `features.customColors` and `features.customFonts`. Basic active subscribers denied. Trial and Professional/Enterprise allowed. Admin bypass via `commercial.isAdmin`. |
| **Rationale** | Customization is a Professional-tier differentiator per PG-1C.1A §7. The `isSubscriptionActive` boolean collapses tiers and over-grants Basic. Per-feature flags align server, client, and matrix. |

**Transition note:** Active Basic subscribers who customized colors/fonts will retain saved data but lose save access after Wave 2 unless they upgrade. Display of existing customizations on public menu may continue (content, not capability).

---

### AD-4: Reports Access

| Dimension | Detail |
|---|---|
| **Current runtime** | `restaurant.stats` returns sales statistics with only `assertRestaurantAccess` — **no plan gate** (`routers.ts`). Dashboard `ReportsTab` renders stats for all owners with restaurant access. |
| **Commercial contract** | PLAN-FEATURE-MATRIX §3.2: BASIC → `reports: N`. PROFESSIONAL+ / TRIAL / ADMIN → Y. NONE → N for owner management. |
| **Canonical behavior** | **Adopt contract.** Owner-facing reports require `features.reports === true`. Deny with `FEATURE_NOT_AVAILABLE` when false. Guest/public paths unaffected. |
| **Rationale** | Reports are an operational Professional feature. Ungated stats undermine tier value and create inconsistency with marketing plan descriptions. Server gate is required (UI-only hiding is insufficient per PG-1C.2C §3.4). |

---

### AD-5: Excel Export Access

| Dimension | Detail |
|---|---|
| **Current runtime** | `Dashboard.tsx` `ReportsTab` exposes `exportMonthlyExcel` with **no subscription or plan check** — any owner with dashboard access can download XLSX. |
| **Commercial contract** | PLAN-FEATURE-MATRIX §3.2: BASIC → `excelExport: N`. PROFESSIONAL+ / TRIAL / ADMIN → Y. |
| **Canonical behavior** | **Adopt contract.** Excel export button and any future export API require `features.excelExport === true`. Pair with AD-4 — export is a strict subset of reports capability. |
| **Rationale** | Export is separately keyed in the matrix to allow future unbundling. Today both must gate together for Basic. Client-only hiding in Wave 1 is acceptable; server export endpoint (if added) must enforce in Wave 2. |

---

### AD-6: Feature Enforcement Coverage

| Dimension | Detail |
|---|---|
| **Current runtime** | ~7 of 21 feature keys have any server-side plan/subscription check. Most capabilities rely on auth + restaurant access only. Ordering uses a single `planId === 30001` exception. Templates/colors/fonts use `isSubscriptionActive`. Limits use DB plan row. |
| **Commercial contract** | PLAN-FEATURE-MATRIX §5.4: `IF features[featureKey] !== true → FEATURE_NOT_AVAILABLE`. All 21 keys defined in §3.1. Ordering stack and hotel stack dependency rules in §3.1. |
| **Canonical behavior** | **Full matrix enforcement is the target state before Wave 3 completes.** Each feature key maps to at least one consumer (server mutation or public guest gate). Dependency rules: ordering stack keys require `features.ordering`; `roomQr` requires `features.hotelMode`. Phased delivery: Wave 2 covers templates, customization, reports, excel; Wave 3 covers ordering stack, limits, hotel, offers, images, categories. |
| **Rationale** | Partial enforcement caused PG-1C.2C's "false confidence" risk — a correct resolver changes nothing if consumers ignore output. Explicit inventory (§4) defines the gap list. Waves MUST close gaps before deprecating legacy authority. |

**Interim rule (Wave 1 only):** Read-only entitlements exposure does not require enforcement. Wave 1 may display flags without acting on them.

---

### AD-7: planId → catalogPlan Dependency

| Dimension | Detail |
|---|---|
| **Current runtime** | All commercial logic uses numeric `planId`, `sortOrder`, or `plan.id === 30001`. No `catalogPlan` enum in server code. Resolver input expects `catalogPlan: CatalogPlan` but nothing produces it. |
| **Commercial contract** | COMMERCIAL-AUTHORITY-SPEC §5: plans are business definitions; commercial logic must never depend on numeric IDs. PLAN-ID-MAPPING.md defines the translation. |
| **Canonical behavior** | **Single mapping module** per `PLAN-ID-MAPPING.md §3.1`. Adapter builds `CommercialContext` with mapped `catalogPlan` before calling resolver. Legacy constants deprecated per wave. |
| **Rationale** | Hardcoded IDs caused I-01/I-03 inconsistencies in PG-1A audits. Named catalog plans survive ID renumbering and seed changes. |

---

## 3. CommercialContext Contract

The **CommercialContext** is the normative input adapter between runtime data (user, subscription row, clock) and `resolveCommercialEntitlements()`. It is not yet implemented; this section is the design contract for PG-1C.2E / Wave 1.

### 3.1 Purpose

| Responsibility | Owner |
|---|---|
| Load canonical owner subscription | Adapter (DB layer) |
| Map `planId` → `catalogPlan` | `PLAN-ID-MAPPING.md` |
| Normalize admin / trial / expiration | Adapter → resolver |
| Produce entitlement output | `resolveCommercialEntitlements()` |

The resolver remains a **pure function**. CommercialContext is the **impure boundary** (database reads, role lookup, canonical pick).

### 3.2 Type contract (normative)

```typescript
/** PG-1C.2D — adapter input for resolveCommercialEntitlements(). */
type CommercialContext = {
  /** Owner account identifier. Restaurants inherit from this scope. */
  ownerId: number;

  /** Platform role. When "admin", supersedes subscription for authority output. */
  role: "admin" | "user";

  /**
   * Canonical owner-level subscription snapshot, or null when no row qualifies.
   * Built from pickUserLevelSubscription / pickCanonicalSubscription (account scope).
   */
  subscription: CommercialContextSubscription | null;

  /** Evaluation instant for period boundaries. Defaults to server now(). */
  now: Date;
};

type CommercialContextSubscription = {
  /** Mapped from planId via PLAN-ID-MAPPING.md — never pass raw planId to resolver. */
  catalogPlan: "BASIC" | "PROFESSIONAL" | "ENTERPRISE";

  /** Raw DB status preserved for output and billing consumers. */
  subscriptionStatus: "trial" | "active" | "canceled" | "expired";

  /** ISO instant; required when subscriptionStatus === "trial". */
  trialEndsAt: string | null;

  /** ISO instant; required when subscriptionStatus === "active". */
  currentPeriodEnd: string | null;
};
```

### 3.3 Field meanings

| Field | Meaning | Source | Affects resolver |
|---|---|---|---|
| `ownerId` | Commercial subject (owner account) | `users.id` / `restaurants.userId` | Passed through; future audit logging |
| `role` | Platform operator vs customer | `users.role` | `"admin"` → `plan: ADMIN`, ignores subscription |
| `subscription` | Canonical commercial relationship | `user_subscriptions` after pick | Null → `plan: NONE` |
| `subscription.catalogPlan` | Paid tier name | `mapPlanIdToCatalogPlan(planId)` | Drives limits/features when active |
| `subscription.subscriptionStatus` | Lifecycle state | `user_subscriptions.status` | Trial/active/canceled/expired logic |
| `subscription.trialEndsAt` | Trial period end | `user_subscriptions.trialEndsAt` | Validity when status = trial |
| `subscription.currentPeriodEnd` | Paid period end | `user_subscriptions.currentPeriodEnd` | Validity when status = active |
| `now` | Evaluation clock | Server | Expired period → NONE entitlements |

### 3.4 Derived states (resolver output, not input)

These are **outputs** of `resolveCommercialEntitlements(buildResolverInput(ctx))` — document here for consumer clarity:

| Derived state | Condition | `accountType` | `plan` |
|---|---|---|---|
| **Admin state** | `role === "admin"` | `ADMIN` | `ADMIN` |
| **Trial state** | `status === "trial"` AND `now < trialEndsAt` | `TRIAL` | `TRIAL` |
| **Paying state** | `status === "active"` AND `now < currentPeriodEnd` | `PAYING` | `catalogPlan` |
| **Expiration state** | trial/active but period elapsed | `NONE` | `NONE` (status preserved) |
| **No subscription** | `subscription === null` | `NONE` | `NONE` |
| **Canceled / expired** | `status ∈ { canceled, expired }` | `NONE` | `NONE` |

### 3.5 Adapter build sequence

```
1. Load user role by ownerId
2. IF role === "admin" → CommercialContext { role, subscription: null } → DONE
3. Load all user_subscriptions for ownerId
4. Pick canonical account-level row (restaurantId = 0 preferred; entitled trial/active wins)
5. IF no row → CommercialContext { subscription: null } → DONE
6. Map row.planId → catalogPlan (PLAN-ID-MAPPING.md)
7. CommercialContext { subscription: { catalogPlan, subscriptionStatus, trialEndsAt, currentPeriodEnd } }
8. resolveCommercialEntitlements({
     ownerId,
     role,
     subscription: {
       catalogPlan,
       status: subscriptionStatus,
       trialEndsAt,
       currentPeriodEnd,
     },
     now,
   })
```

### 3.6 Mapping to existing resolver input

`ResolveCommercialEntitlementsInput` (`src/lib/commercial/types.ts`) is the resolver-facing shape. CommercialContext maps to it as:

| CommercialContext | `ResolveCommercialEntitlementsInput` |
|---|---|
| `ownerId` | `ownerId` |
| `role` | `role` |
| `subscription.catalogPlan` | `subscription.catalogPlan` |
| `subscription.subscriptionStatus` | `subscription.status` |
| `subscription.trialEndsAt` | `subscription.trialEndsAt` |
| `subscription.currentPeriodEnd` | `subscription.currentPeriodEnd` |
| `now` | `now` |

### 3.7 Explicit non-responsibilities

CommercialContext MUST NOT:

- Read restaurant-scoped subscription rows for owner authority (ordering exception retired in Wave 3)
- Read `subscription_plans` limits or `features` JSON for authority
- Compute MRR, invoices, or billing amounts
- Mutate database state

---

## 4. Feature Enforcement Inventory

Classification of all 21 feature keys from `featureKeys.ts` against current runtime (PG-1C.2C evidence). Target state for each is **Enforced** per AD-6.

| # | Feature key | Status | Current enforcement | Primary consumer(s) | Gap / wave |
|---:|---|---|---|---|---|
| 1 | `qrMenu` | **Partially Enforced** | Public slug routes always accessible; owner write requires auth only | Public menu routes, `restaurant.update` | NONE write gate needed (Wave 3) |
| 2 | `categories` | **Partially Enforced** | `category.create` + limit assert; no NONE feature deny | `routers.ts` `category.create` | NONE + feature flag (Wave 3) |
| 3 | `menuImages` | **Not Enforced** | `menuItem.uploadImage`, `offer.uploadImage` — access only | `routers.ts` upload mutations | Add `features.menuImages` (Wave 3) |
| 4 | `search` | **Not Enforced** | `MenuView.tsx` always renders search | Client UI | Guest feature; optional UI hide for NONE (Wave 2) |
| 5 | `ordering` | **Enforced** | `restaurantAllowsTableOrdering` → `resolveTableOrderingEntitlement` (30001 block) | `order.canOrder`, `order.create` | Replace planId check with flag (Wave 3) |
| 6 | `cart` | **Partially Enforced** | UI shows cart when `canOrder` true | `MenuView.tsx`, `CartDrawer.tsx` | Depends on ordering; formalize stack rule (Wave 3) |
| 7 | `checkout` | **Enforced** | `order.create` + ordering gate | `routers.ts` `order.create` | Map to `features.checkout` (Wave 3) |
| 8 | `requestBill` | **Not Enforced** | No server or client gate located | — | Implement or mark N/A if feature not built (Wave 3) |
| 9 | `callWaiter` | **Not Enforced** | No server or client gate located | — | Implement or mark N/A if feature not built (Wave 3) |
| 10 | `orderTracking` | **Partially Enforced** | Order status endpoints exist; no plan gate | `routers.ts` order procedures | Add ordering-stack dependency (Wave 3) |
| 11 | `thermalPrinting` | **Not Enforced** | No print routing in server codebase | — | Future consumer (Wave 3+) |
| 12 | `autoPrint` | **Not Enforced** | No auto-print hook found | — | Future consumer (Wave 3+) |
| 13 | `reprint` | **Not Enforced** | No reprint mutation found | — | Future consumer (Wave 3+) |
| 14 | `reports` | **Not Enforced** | `restaurant.stats` ungated; Dashboard ReportsTab visible | `routers.ts` `stats`, `Dashboard.tsx` | AD-4 (Wave 2) |
| 15 | `excelExport` | **Not Enforced** | Client export ungated | `Dashboard.tsx` ReportsTab | AD-5 (Wave 2) |
| 16 | `hotelMode` | **Not Enforced** | `tableLabel: rooms` set via `restaurant.update` without plan check | `routers.ts` `restaurant.update` | AD-6 (Wave 3) |
| 17 | `roomQr` | **Partially Enforced** | Room QR works when ordering + `tableLabel=rooms`; no explicit gate | Ordering + hotel mode implicit | Formalize hotel stack rule (Wave 3) |
| 18 | `dynamicServiceCatalog` | **Not Enforced** | `offer.create/update/delete` — access only | `routers.ts` offer procedures | AD-6 (Wave 3) |
| 19 | `templates` | **Partially Enforced** | Premium list + `isSubscriptionActive` (not BASIC-specific) | `routers.ts` `updateTemplate`, client locks | Tier-specific `features.templates` (Wave 2) |
| 20 | `customColors` | **Partially Enforced** | `isSubscriptionActive` — over-grants Basic | `routers.ts`, `ColorCustomizer.tsx` | AD-3 (Wave 2) |
| 21 | `customFonts` | **Partially Enforced** | Same as customColors | `routers.ts`, `FontCustomizer.tsx` | AD-3 (Wave 2) |

### 4.1 Summary counts

| Status | Count | Keys |
|---|---:|---|
| **Enforced** | 2 | `ordering`, `checkout` |
| **Partially Enforced** | 8 | `qrMenu`, `categories`, `cart`, `orderTracking`, `roomQr`, `templates`, `customColors`, `customFonts` |
| **Not Enforced** | 11 | `menuImages`, `search`, `requestBill`, `callWaiter`, `thermalPrinting`, `autoPrint`, `reprint`, `reports`, `excelExport`, `hotelMode`, `dynamicServiceCatalog` |

**Gap closure target:** 0 Not Enforced / 0 Partially Enforced at end of Wave 3 (except explicitly deferred infrastructure features with product sign-off).

### 4.2 Limit enforcement (related)

| Limit key | Status | Current | Target |
|---|---|---|---|
| `limits.restaurants` | **Enforced** | `assertRestaurantCreateAllowed` (DB limits) | Resolver limits + AD-1/AD-2 (Wave 3) |
| `limits.categories` | **Enforced** | `assertCategoryCreateAllowed` | Resolver limits (Wave 3) |
| `limits.items` | **Enforced** | `assertMenuItemCreateAllowed` | Resolver limits (Wave 3) |

---

## 5. Wave Readiness Assessment

Re-evaluation after alignment decisions. Waves match PG-1C.2C §5 structure.

### Wave 1 — Client / UI gates (read-only entitlements)

| Attribute | Assessment |
|---|---|
| **Scope** | Expose `CommercialEntitlements` to client; optional UI locks driven by `features.*` (display only); no mutation changes |
| **Blockers (resolved)** | AD-7 mapping defined; CommercialContext contract defined |
| **Blockers (remaining)** | Implement adapter + `subscription.getEntitlements` endpoint (PG-1C.2E); no product decisions open |
| **Dependencies** | `PLAN-ID-MAPPING.md`, §3 CommercialContext, `resolveCommercialEntitlements` (done) |
| **Readiness** | **READY TO BEGIN** — safe because read-only; legacy authority remains authoritative for mutations |
| **Risk** | Low — UI may preview future locks; server still enforces legacy rules |

### Wave 2 — Template and feature restrictions

| Attribute | Assessment |
|---|---|
| **Scope** | AD-3, AD-4, AD-5: templates, customColors, customFonts, reports, excelExport |
| **Blockers** | Wave 1 entitlements API must be stable; product comms for Basic customization removal |
| **Dependencies** | Wave 1 complete; alignment decisions AD-3/4/5 approved (this document) |
| **Readiness** | **NOT READY** until Wave 1 adapter ships; **UNBLOCKED** for planning |
| **Risk** | Medium — Basic subscriber experience changes |

### Wave 3 — Server-side authorization

| Attribute | Assessment |
|---|---|
| **Scope** | AD-1, AD-2, AD-6: limits, ordering stack, hotel, offers, images, categories, NONE gates; deprecate `planId` checks |
| **Blockers** | Waves 1–2; `limit === null` helper; NONE limit policy comms; subscription-scope normalization |
| **Dependencies** | CommercialContext on all owner mutations; feature inventory gaps closed |
| **Readiness** | **NOT READY** — largest behavioral delta |
| **Risk** | High — NONE owners lose create capacity; Enterprise unlimited semantics change |

### Wave 4 — Billing / revenue / subscription metrics

| Attribute | Assessment |
|---|---|
| **Scope** | MRR, revenue, invoices, webhooks, admin KPIs — use `commercial.*` flags at owner granularity |
| **Blockers** | Wave 3 complete; owner-level MRR deduplication design |
| **Dependencies** | Stable entitlement output in production for one release cycle |
| **Readiness** | **NOT READY** |
| **Risk** | Critical — financial reporting |

### Wave 1 Go / No-Go

| Criterion | Status |
|---|---|
| All mismatches have canonical decisions | **YES** (§2) |
| Plan mapping official | **YES** (`PLAN-ID-MAPPING.md`) |
| CommercialContext contract defined | **YES** (§3) |
| Resolver spec-correct | **YES** (PG-1C.2C) |
| Wave 1 avoids mutation/billing changes | **YES** |
| **Wave 1 safe to begin** | **YES** |

**Condition:** Wave 1 implementation (PG-1C.2E) is limited to CommercialContext builder + read-only API. Any consumer that denies requests based on new entitlements belongs to Wave 2+.

---

## 6. Success Criteria Checklist

| Criterion | Met |
|---|---|
| Canonical alignment decision for every mismatch | ✓ §2 (AD-1 through AD-7) |
| Official plan mapping | ✓ `docs/commercial-spec/PLAN-ID-MAPPING.md` |
| Official CommercialContext contract | ✓ §3 |
| Feature enforcement inventory (21 keys) | ✓ §4 |
| Wave readiness with blockers and dependencies | ✓ §5 |
| Wave 1 safety determination | ✓ §5 — **SAFE TO BEGIN** (read-only) |
| No runtime changes in this phase | ✓ |

---

## 7. Next Phase

**PG-1C.2E — CommercialContext Adapter (Wave 1 implementation)**

1. `mapPlanIdToCatalogPlan()` in `src/lib/commercial/`
2. `buildCommercialContext(ownerId)` — DB reads, canonical pick
3. `subscription.getEntitlements` tRPC query — returns `CommercialEntitlements`
4. Client hook `useCommercialEntitlements()` — read-only consumption
5. Tests: mapping table, context build, admin/trial/none/expired paths

No router rewiring. No billing rewiring. No schema changes.

---

*Analysis and alignment only. No implementation.*
