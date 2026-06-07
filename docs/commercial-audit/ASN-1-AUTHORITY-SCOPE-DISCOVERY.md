# ASN-1 — Authority Scope Discovery

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-1 — Discovery only  
**Date:** 2026-06-07  
**Status:** Complete — no runtime changes  

**Mode:** Read-only audit. No migrations, hotfixes, refactors, or behavioral changes.

**Target spec:** `COMMERCIAL-AUTHORITY-SPEC.md` (PG-1C.1A)  
**Supporting specs:** `PLAN-FEATURE-MATRIX.md`, PG-1C audit series  

**Evidence sources:**

- `COMMERCIAL-AUTHORITY-SPEC.md`
- `PG-1C.4A-SERVER-GATE-DISCOVERY.md`
- `PG-1C.2E-COMMERCIAL-CONTEXT-INTEGRATION.md`
- `PG-1C.3C-CLIENT-GATE-AUDIT.md` / `clientGateRegistry.ts`
- `SUBSCRIPTION-SCOPE-AUDIT.md`
- `server/**/*`, `client/src/**/*`, `src/lib/commercial/**/*`
- F-3 production incident investigation (ordering authority drift)

---

## 1. Executive summary

MineuQR currently operates **four authority models** in parallel:

| Model | Scope | Canonical per spec? | Primary consumers |
|-------|-------|---------------------|-------------------|
| **Account Authority** | Owner account (`restaurantId = 0` row → entitlements) | **Yes** | Client visibility, `commercial.getEntitlements` |
| **Restaurant Authority** | Per-venue subscription row first | **No** | `restaurantAllowsTableOrdering`, admin scoped reads |
| **Hybrid Authority** | Account + restaurant + legacy OR-combine | **No** | Wave 1 reads, limits, trial fallbacks |
| **Billing Row Authority** | Subscription table / `planId` writes | Partial (billing layer) | Checkout, webhooks, admin CRUD |

**Headline finding:** The approved governance chain (`buildCommercialContextFromDb` → `resolveCommercialEntitlements` → `features.*`) is **implemented and live for owner read/visibility** but **not wired into most server mutation gates**. Guest ordering exhibits the most severe read/write split (`order.canOrder` hybrid vs `order.create` restaurant-scoped).

**ASN-1 outcome:** Authority inventory complete → **ASN-2 Authority Source Inventory** is ready.

---

## 2. Scope taxonomy (definitions)

| Classification | Definition | Authority owner |
|----------------|------------|-----------------|
| **ACCOUNT** | Decisions derive from owner account subscription (`pickUserLevelSubscription`, `getCommercialEntitlements`, resolver output) | Owner account |
| **RESTAURANT** | Decisions derive from restaurant-scoped subscription row or `restaurantId`-keyed lookup first | Restaurant / subscription row |
| **HYBRID** | Combines account + restaurant + legacy sources, or picks across all row scopes | Mixed |
| **UNKNOWN** | Ad-hoc checks (role bypass, heuristics, catalog metadata) without resolver contract | User role / heuristics |

---

## 3. Deliverable 2 — Authority inventory

Full table of discovered authority paths. IDs are stable for ASN-2+.

| ID | Authority Path | Purpose | Scope | Source |
|----|----------------|---------|-------|--------|
| **A-01** | `buildCommercialContextFromDb` → `pickUserLevelSubscription` → `buildCommercialContext` | Owner commercial context | ACCOUNT | Subscription rows (`restaurantId = 0`) |
| **A-02** | `getCommercialEntitlements` → `resolveCommercialEntitlements` → `features.*` / `limits.*` / `commercial.*` | Canonical entitlement output | ACCOUNT | CommercialContext + feature matrix |
| **A-03** | `commercial.getEntitlements` (tRPC) | Owner read API | ACCOUNT | A-02 |
| **A-04** | Client `useCommercialEntitlements` → `commercial.getEntitlements` | Owner UI data | ACCOUNT | A-03 |
| **A-05** | Client `useCommercialFeatureVisibility` → `hasCommercialFeature(entitlements, key)` | Owner feature visibility | ACCOUNT | A-04 + `featureVisibility.ts` |
| **A-06** | Client `isTemplateLocked` / `showCustomColors` / `showReportsUpgrade` etc. | Gated UI panels | ACCOUNT | A-05 |
| **A-07** | Client `getSubscriptionExpiryWarning(context)` | Expiry warnings from context dates | ACCOUNT | CommercialContext dates |
| **A-08** | `resolveCommercialEntitlements` admin branch (`role === "admin"` → `plan: ADMIN`) | Admin unlimited features (resolver) | ACCOUNT | Role in context builder |
| **A-09** | `subscription.getCurrentSubscription` → `getCanonicalUserSubscription` | Billing/display read | ACCOUNT | All user rows → canonical pick |
| **A-10** | `subscription.createCheckoutSession` / `createTapCheckout` (`planId` validation) | Checkout initiation | ACCOUNT | Plan catalog + user session (billing) |
| **R-01** | `getSubscriptionForRestaurant(restaurantId)` → scoped row pick | Restaurant-scoped subscription read | RESTAURANT | `userSubscriptions.restaurantId = target` |
| **R-02** | `getOrderingSubscriptionForRestaurant` → `resolveOrderingSubscriptionRow` | Ordering subscription row selection | RESTAURANT | Scoped-first, account fallback |
| **R-03** | `restaurantAllowsTableOrdering(restaurantId)` → R-02 → `resolveTableOrderingEntitlement` | Guest ordering entitlement (legacy) | RESTAURANT | Subscription row + `planId !== 30001` |
| **R-04** | `order.create` entitlement gate → R-03 | Guest order mutation | RESTAURANT | Same as R-03 |
| **R-05** | `subscription.getByRestaurant` → R-01 | Legacy per-venue subscription display | RESTAURANT | Scoped row + plan row |
| **R-06** | `resolvePlanLimitsForUser(userId, restaurantId)` → R-02 | Category/item quota for venue | RESTAURANT | Hybrid row pick + DB plan limits |
| **R-07** | `assertCategoryCreateAllowed` / `assertMenuItemCreateAllowed` → R-06 | Menu structure limits | RESTAURANT | R-06 |
| **R-08** | `registerOwner` → `buildTrialSubscriptionForUser(userId, restaurantId)` | Self-service trial insert | RESTAURANT | Creates scoped trial row |
| **R-09** | `admin.createRestaurantSubscription` / scoped admin CRUD | Back-office venue subscription | RESTAURANT | Direct `planId` / status writes |
| **H-01** | `resolveCanOrderRead` → `getCommercialEntitlements(owner)` **OR** R-03 | Guest ordering probe (`order.canOrder`) | HYBRID | Account `features.ordering` + legacy R-03 |
| **H-02** | `resolveTrialStatusRead` → A-02 + `isSubscriptionActive` + `getTrialEndDate` | Trial status (`checkTrialStatus`) | HYBRID | Account plan + any-row legacy |
| **H-03** | `isSubscriptionActive(userId)` → `userHasSubscriptionEntitlement(all rows)` | Coarse “any entitled sub” boolean | HYBRID | Any scope subscription row |
| **H-04** | `getTrialEndDate(userId)` → canonical trial across all rows | Trial end date legacy | HYBRID | Any-scope trial row |
| **H-05** | `resolvePlanLimitsForUser(userId)` → `pickCanonicalSubscription(all rows)` | Restaurant count limit source | HYBRID | Best row across all scopes |
| **H-06** | `assertRestaurantCreateAllowed` → H-05 | Restaurant creation cap | HYBRID | H-05 + restaurant count |
| **H-07** | `resolveSubscriptionForActivationFromRows` (id → restaurant → planId → user-level) | Payment activation row pick | HYBRID | Multi-priority row selection |
| **H-08** | Client `MenuView` → `order.canOrder` (H-01) + local hours/closure | Guest ordering UI | HYBRID | Server hybrid + operational client |
| **H-09** | Client `PaymentHistory` / `SubscriptionSuccess` canonical label + legacy `getCurrentSubscription` fallback | Plan display | HYBRID | A-04 with legacy billing read |
| **U-01** | `ctx.user.role === "admin"` bypass on mutations (templates, colors, fonts, limits) | Admin bypass | UNKNOWN | Ad-hoc role check (not `commercial.isAdmin` gate) |
| **U-02** | `restaurant.updateTemplate` → `premiumTemplates` string list + H-03 | Premium template lock | UNKNOWN | Hardcoded template names + coarse sub check |
| **U-03** | `getFallbackBasicLimits()` → DB heuristic `maxRestaurants === 1` | Unentitled limit fallback | UNKNOWN | DB plan row heuristic |
| **U-04** | `BASIC_FREE_PLAN_ID = 30001` in `resolveTableOrderingEntitlement` | Basic plan ordering block | UNKNOWN | Hardcoded plan ID |
| **U-05** | `MenuTemplates.isPremium` catalog metadata + A-05 lock | Template catalog display | UNKNOWN | Static catalog + entitlements |
| **U-06** | `adminKpiCalculations` / `getAdminStatistics` / `getRevenueByMonth` | Revenue/MRR/KPI | UNKNOWN | Raw subscription rows + `status` + `planId` |
| **U-07** | `assertSubscriptionEligibleForAdminInvoice` → `status !== "trial"` | Invoice eligibility | UNKNOWN | Status string check |
| **U-08** | `create-trial-subscription` → `resolveTrialPlanId` (`sortOrder === 2`) | Trial plan selection | UNKNOWN | DB sort order heuristic |
| **B-01** | PayPal/Tap webhooks → `updateSubscriptionForActivation` | Payment activation writes | Billing | Subscription table + `planId` |
| **B-02** | Admin subscription CRUD (`planId`, `status` direct writes) | Operational billing | Billing | Subscription table |
| **B-03** | Client `Pricing` checkout → `planId` in mutation payload | Purchase flow | Billing | Numeric plan ID (required by PSP) |

*Note: B-* paths are **billing authority** (subscription row truth), not feature entitlement authority. Spec treats billing separately from `features.*` gates but still expects account-scoped subscription model.*

---

## 4. Deliverable 3 — Authority classification

### 4.1 Account authority

Paths where commercial **feature/limit visibility** derives from owner account context and resolver output:

| ID | Path | Owner |
|----|------|-------|
| A-01 | `buildCommercialContextFromDb` | Owner account |
| A-02 | `resolveCommercialEntitlements` / `getCommercialEntitlements` | Owner account |
| A-03 | `commercial.getEntitlements` | Authenticated owner |
| A-04 | `useCommercialEntitlements` | Authenticated owner |
| A-05 | `useCommercialFeatureVisibility` | Authenticated owner |
| A-06 | Migrated client gates (TemplateSelector, ColorCustomizer, Dashboard, Pricing, etc.) | Owner account |
| A-07 | `getSubscriptionExpiryWarning` | Owner account (context dates) |
| A-08 | Resolver ADMIN plan branch | Admin user account |
| A-09 | `getCurrentSubscription` / `getCanonicalUserSubscription` | Owner account |
| A-10 | Checkout session creation (billing read of plan catalog) | Owner account |

**Canonical chain (spec-aligned):**

```text
Owner Account
  → buildCommercialContextFromDb()
  → pickUserLevelSubscription()          [restaurantId = 0 only]
  → resolveCommercialEntitlements()
  → features.* | limits.* | commercial.*
```

### 4.2 Restaurant authority

Paths where a **restaurant-scoped subscription row** (or restaurant-keyed lookup) is primary:

| ID | Path | Owner |
|----|------|-------|
| R-01 | `getSubscriptionForRestaurant` | Restaurant subscription row |
| R-02 | `resolveOrderingSubscriptionRow` | Restaurant row → account fallback |
| R-03 | `restaurantAllowsTableOrdering` | Restaurant ordering row |
| R-04 | `order.create` entitlement gate | Restaurant ordering row |
| R-05 | `subscription.getByRestaurant` | Restaurant subscription row |
| R-06 | `resolvePlanLimitsForUser(userId, restaurantId)` | Restaurant-scoped limits |
| R-07 | `assertCategoryCreateAllowed` / `assertMenuItemCreateAllowed` | Restaurant-scoped limits |
| R-08 | Register-path trial creation (`restaurantId > 0`) | Restaurant subscription row |
| R-09 | Admin restaurant-scoped subscription CRUD | Restaurant subscription row |

**Legacy chain (spec-forbidden for features):**

```text
restaurantId
  → getOrderingSubscriptionForRestaurant()
  → resolveOrderingSubscriptionRow()       [scoped row wins if present]
  → resolveTableOrderingEntitlement()
  → planId !== 30001
```

### 4.3 Hybrid authority

Paths combining multiple sources or scopes:

| ID | Path | Mix |
|----|------|-----|
| H-01 | `resolveCanOrderRead` / `order.canOrder` | Account `features.ordering` **OR** R-03 |
| H-02 | `resolveTrialStatusRead` / `checkTrialStatus` | Account plan **OR** H-03/H-04 fallback |
| H-03 | `isSubscriptionActive` | Any entitled row (all scopes) |
| H-04 | `getTrialEndDate` | Any trial row (all scopes) |
| H-05 | `resolvePlanLimitsForUser(userId)` without `restaurantId` | Canonical pick across **all** rows |
| H-06 | `assertRestaurantCreateAllowed` | H-05 limits |
| H-07 | `resolveSubscriptionForActivationFromRows` | id / restaurant / planId / user-level priority |
| H-08 | `MenuView` guest UI | H-01 + client operational hours |
| H-09 | Client plan labels with legacy fallback | A-04 + A-09 |

### 4.4 Unknown authority

Paths not mapped to resolver contract or explicit scope rules:

| ID | Path | Why unknown |
|----|------|-------------|
| U-01 | `role === "admin"` mutation bypass | Ad-hoc; not `entitlements.commercial.isAdmin` enforcement |
| U-02 | Premium template list + `isSubscriptionActive` | Coarse boolean; not `features.templates` on server |
| U-03 | `getFallbackBasicLimits` heuristic | DB `maxRestaurants === 1` guess |
| U-04 | `BASIC_FREE_PLAN_ID` hardcode | Spec forbids plan ID in feature logic |
| U-05 | `isPremium` catalog metadata | Presentation + client lock only |
| U-06 | Admin KPI / revenue aggregations | Raw rows; not `commercial` flags |
| U-07 | Invoice trial block | Status string; not `commercial.invoiceEligible` |
| U-08 | Trial plan via `sortOrder` | Implementation heuristic |

---

## 5. Deliverable 4 — Spec compliance audit

Relative to `COMMERCIAL-AUTHORITY-SPEC.md`.

| ID | Compliance | Rationale |
|----|------------|-----------|
| A-01 | **COMPLIANT** | Account-level pick; matches §4 one owner / one subscription model for authority |
| A-02 | **COMPLIANT** | Single resolver output; `features.ordering` etc. per §12 |
| A-03 | **COMPLIANT** | Read-only canonical API; no parallel logic |
| A-04 | **COMPLIANT** | Consumes A-03 only for visibility |
| A-05 | **COMPLIANT** | Feature keys from entitlements per §12 |
| A-06 | **COMPLIANT** | Client visibility aligned to matrix |
| A-07 | **COMPLIANT** | Uses context subscription dates |
| A-08 | **PARTIALLY COMPLIANT** | Resolver ADMIN correct; server mutations still use U-01 bypass |
| A-09 | **PARTIALLY COMPLIANT** | Account canonical read; still queries subscription table directly (§11) |
| A-10 | **PARTIALLY COMPLIANT** | Billing layer; `planId` required but not entitlement-gated |
| R-01 | **NON-COMPLIANT** | Restaurant-scoped commercial read; §2 forbids restaurant-scoped authority |
| R-02 | **NON-COMPLIANT** | Scoped-first selection contradicts §16 inheritance model |
| R-03 | **NON-COMPLIANT** | Not `features.ordering`; uses R-02 + U-04 |
| R-04 | **NON-COMPLIANT** | Mutation gate on forbidden path; F-3 incident source |
| R-05 | **NON-COMPLIANT** | Per-venue subscription display |
| R-06 | **NON-COMPLIANT** | Restaurant-scoped limit source |
| R-07 | **NON-COMPLIANT** | Enforces via R-06 |
| R-08 | **NON-COMPLIANT** | Creates scope divergence (register path); documented TD-W1-01 |
| R-09 | **NON-COMPLIANT** | Direct row writes (billing ops; scope model legacy) |
| H-01 | **NON-COMPLIANT** | Multiple entitlement sources (§2 forbidden) |
| H-02 | **NON-COMPLIANT** | Dual authority with legacy fallback |
| H-03 | **NON-COMPLIANT** | Coarse boolean; not feature-key based; any-row scope |
| H-04 | **NON-COMPLIANT** | Legacy date read bypassing context |
| H-05 | **NON-COMPLIANT** | Ambiguous scope pick; not `limits.*` from resolver |
| H-06 | **NON-COMPLIANT** | Limit gate via H-05 |
| H-07 | **PARTIALLY COMPLIANT** | Billing activation necessity; scope priority is hybrid |
| H-08 | **NON-COMPLIANT** | Inherits H-01 server drift |
| H-09 | **PARTIALLY COMPLIANT** | Primary path compliant; legacy fallback remains |
| U-01 | **NON-COMPLIANT** | Should use resolver ADMIN + centralized gate |
| U-02 | **NON-COMPLIANT** | Hardcoded templates + H-03; matrix says Basic has templates |
| U-03 | **NON-COMPLIANT** | NONE should get `limits: 0/0/0` per AD-1; gets Basic fallback |
| U-04 | **NON-COMPLIANT** | §5 / §12 forbid plan ID in feature logic |
| U-05 | **PARTIALLY COMPLIANT** | Client lock uses A-05; catalog metadata is presentation |
| U-06 | **PARTIALLY COMPLIANT** | Revenue rules approximate spec §14; uses rows not account type |
| U-07 | **PARTIALLY COMPLIANT** | Aligns with trial invoice rule intent; not via `commercial.invoiceEligible` |
| U-08 | **PARTIALLY COMPLIANT** | Trial lifecycle; Professional plan intent correct; heuristic selection |
| B-01 | **PARTIALLY COMPLIANT** | Billing truth layer; out of feature authority scope |
| B-02 | **PARTIALLY COMPLIANT** | Operational necessity; scope normalization deferred |
| B-03 | **PARTIALLY COMPLIANT** | PSP requires `planId`; not a visibility gate |

**Summary counts:**

| Compliance | Count |
|------------|------:|
| COMPLIANT | 7 |
| PARTIALLY COMPLIANT | 12 |
| NON-COMPLIANT | 19 |

---

## 6. Deliverable 5 — Authority conflict matrix

| Conflict | Source A | Source B | Risk | User impact |
|----------|----------|----------|------|-------------|
| **C-01** Guest ordering read vs write | H-01 `order.canOrder` (`legacy \|\| features.ordering`) | R-04 `order.create` (R-03 only) | **CRITICAL** | Cart visible; submit returns 403 (F-3 incident) |
| **C-02** Owner entitlements vs ordering legacy | A-02 `features.ordering` (account) | R-03 `restaurantAllowsTableOrdering` (scoped-first) | **CRITICAL** | Account PRO + expired scoped row → ordering denied on create |
| **C-03** Client visibility vs server mutations | A-05 `features.customColors/customFonts` | U-02/U-03 `isSubscriptionActive` on server | **HIGH** | Basic user may see UI server rejects (or inverse) |
| **C-04** Client trial banner vs server trial API | A-05 `commercial.isTrial` (NONE on register path) | H-02 `checkTrialStatus` (`isActive: true` via fallback) | **MEDIUM** | Register-path owner: no trial banner; server says active |
| **C-05** Account context vs register trial row | A-01 `plan: NONE` (no account-level row) | R-08 restaurant-scoped trial row | **HIGH** | Owner dashboard NONE; guest ordering/trial APIs use legacy |
| **C-06** Restaurant limits vs account limits | H-05 `pickCanonicalSubscription(all)` for restaurant cap | R-06 `resolveOrderingSubscriptionRow` for category/item caps | **MEDIUM** | Different rows may drive different limit tiers per venue |
| **C-07** Billing display vs entitlements | A-09 `getCurrentSubscription` | A-02 `getEntitlements` | **LOW** | Plan label mismatch during transition |
| **C-08** Admin role bypass vs resolver ADMIN | U-01 `ctx.user.role === "admin"` | A-08 resolver `plan: ADMIN` | **MEDIUM** | Guest ordering: admin owners get no ordering bypass on R-04 |
| **C-09** Client guest hours vs server create hours | H-08 client `orderingAllowed` | R-04 server hours/closure checks | **LOW** | Edge: stale client cache → submit blocked with closure/hours 403 |
| **C-10** Activation row pick vs entitlement context | H-07 webhook activation | A-01 context builder | **HIGH** | Wrong row activated → entitlements disagree with billing state |

---

## 7. Deliverable 6 — Migration candidate inventory

Risk classification for **normalization** (not migration planning). Higher = more user/revenue impact if changed without care.

| ID | Path | Normalization need | Risk |
|----|------|-------------------|------|
| R-04 | `order.create` entitlement | Align to single ordering authority | **CRITICAL** |
| H-01 | `resolveCanOrderRead` | Remove dual source; single account `features.ordering` | **CRITICAL** |
| R-03 | `restaurantAllowsTableOrdering` | Retire for feature gates | **CRITICAL** |
| R-02 | `resolveOrderingSubscriptionRow` | Remove from commercial feature decisions | **HIGH** |
| C-01 / C-02 | canOrder vs create split | Hotfix or unified helper | **CRITICAL** |
| H-03 | `isSubscriptionActive` server mutations | Replace with per-feature entitlements | **HIGH** |
| U-02 | Premium template server gate | `features.templates` | **HIGH** |
| U-01 | Admin role bypass | `commercial.isAdmin` centralized gate | **MEDIUM** |
| R-06 / R-07 | Category/item limits | `limits.*` from resolver | **HIGH** |
| H-05 / H-06 | Restaurant count limits | `limits.restaurants` from resolver | **HIGH** |
| R-08 | Register scoped trial insert | Account-level trial row or scope adapter | **HIGH** |
| A-01 | `buildCommercialContextFromDb` | Expand scope normalization (TD-W1-01) | **HIGH** |
| H-02 | `resolveTrialStatusRead` | Remove legacy fallbacks post-scope fix | **MEDIUM** |
| H-05 | `getFallbackBasicLimits` | NONE → zero limits per AD-1 | **MEDIUM** |
| U-04 | `BASIC_FREE_PLAN_ID` gate | `features.ordering` only | **MEDIUM** |
| R-05 | `getByRestaurant` display | Deprecate or align to account read | **LOW** |
| H-09 | Client legacy plan fallback | Remove after billing read unified | **LOW** |
| U-06 | Admin KPI revenue | Account-type based per §14 | **MEDIUM** |
| H-07 / B-01 | Activation row resolution | Align with account subscription model | **HIGH** |
| B-02 / B-03 | Billing CRUD / checkout | Keep; scope normalization only | **MEDIUM** |

---

## 8. Discovery questions — per-path answers (sample deep dives)

### 8.1 `restaurantAllowsTableOrdering()`

| Dimension | Answer |
|-----------|--------|
| **Authority owner** | Restaurant (via scoped subscription row); falls back to account row |
| **Authority source** | `userSubscriptions` table → `resolveOrderingSubscriptionRow` → `resolveTableOrderingEntitlement` → `BASIC_FREE_PLAN_ID` |
| **Scope** | RESTAURANT (scoped-first hybrid) |
| **Purpose** | Guest ordering enforcement |

### 8.2 `resolveOrderingSubscriptionRow()`

| Dimension | Answer |
|-----------|--------|
| **Authority owner** | Subscription row (restaurant-scoped preferred) |
| **Authority source** | `pickCanonicalSubscription` filtered by `restaurantId` |
| **Scope** | RESTAURANT (with account fallback) |
| **Purpose** | Row selection for ordering and per-venue limits |

### 8.3 `buildCommercialContextFromDb()`

| Dimension | Answer |
|-----------|--------|
| **Authority owner** | Owner account |
| **Authority source** | `pickUserLevelSubscription` (`restaurantId = 0` only) → `mapPlanIdToCatalogPlan` |
| **Scope** | ACCOUNT |
| **Purpose** | Canonical commercial context for resolver and client entitlements |

### 8.4 `resolveCanOrderRead()` (Wave 1)

| Dimension | Answer |
|-----------|--------|
| **Authority owner** | Hybrid (account entitlements + restaurant legacy) |
| **Authority source** | `getCommercialEntitlements` + `restaurantAllowsTableOrdering` |
| **Scope** | HYBRID |
| **Purpose** | Guest ordering visibility probe |

### 8.5 Client `useCommercialFeatureVisibility()`

| Dimension | Answer |
|-----------|--------|
| **Authority owner** | Owner account |
| **Authority source** | `commercial.getEntitlements` → feature matrix |
| **Scope** | ACCOUNT |
| **Purpose** | Owner feature visibility (templates, colors, reports, trial UX) |

---

## 9. Architectural diagram (current state)

```text
                    ┌─────────────────────────────────────┐
                    │   COMMERCIAL-AUTHORITY-SPEC target   │
                    │   Owner → Subscription → features.*  │
                    └─────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
         ┌──────────────────────┐           ┌──────────────────────┐
         │  ACCOUNT AUTHORITY    │           │ RESTAURANT AUTHORITY  │
         │  buildCommercialCtx   │           │ resolveOrderingSubRow │
         │  getEntitlements      │           │ restaurantAllows...   │
         │  Client visibility    │           │ order.create gate     │
         └──────────────────────┘           └──────────────────────┘
                    │                                   │
                    └───────────┬───────────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │   HYBRID AUTHORITY    │
                    │  resolveCanOrderRead  │
                    │  resolveTrialStatus   │
                    │  isSubscriptionActive │
                    │  plan limits (mixed)  │
                    └──────────────────────┘
```

---

## 10. Answers to ASN-1 discovery questions

### Q1 — Is ordering authority account-scoped or restaurant-scoped?

**Both, depending on path.**

- **Account-scoped:** `features.ordering` from `getCommercialEntitlements(ownerId)` (used in H-01 when `plan !== "NONE"`).
- **Restaurant-scoped:** `restaurantAllowsTableOrdering(restaurantId)` via R-02 (used in R-04 `order.create` and as legacy leg of H-01).

Spec requires **account-scoped** only. Runtime is **split**.

### Q2 — Which model is canonical by Commercial Governance?

**Account authority** via:

```text
buildCommercialContextFromDb(ownerId)
  → pickUserLevelSubscription()
  → resolveCommercialEntitlements()
  → features.*
```

Documented in PG-1C.2E, PG-1C.4A S-13/S-14, and `COMMERCIAL-AUTHORITY-SPEC.md` §2, §16.

### Q3 — Which code paths still use restaurant-scoped authority?

See §4.2 (R-01 through R-09). Highest-impact: **R-03, R-04** (guest ordering), **R-06/R-07** (menu limits), **R-08** (register trial creation), **R-05** (legacy display).

### Q4 — Does `order.create` violate COMMERCIAL-AUTHORITY-SPEC?

**Yes — NON-COMPLIANT** on entitlement gate (R-04):

- Does not use `resolveCommercialEntitlements` / `features.ordering` (§2, §12).
- Uses restaurant-scoped row selection (§2 forbidden).
- Uses hardcoded plan ID check via R-03 → U-04 (§5).

Operational gates (hours, closure, inactive restaurant) are outside spec feature authority and are acceptable.

### Q5 — Does `order.create` have intentional reason to remain stricter than `canOrder`?

**No — for commercial entitlement.**

Documented as accidental Wave 1 exclusion (TD-W1-04), not policy. The only intentional write-path extras are **operational** (hours, closure, validation) — not subscription scope.

---

## 11. Forbidden actions confirmation

| Action | Status |
|--------|--------|
| Runtime behavior changes | **None** |
| Subscription / billing / plan changes | **None** |
| CommercialContext changes | **None** |
| Fixes / migrations / hotfixes | **None** |

---

## 12. Success criteria

| Criterion | Status |
|-----------|--------|
| Authority inventory exists | ✅ §3 (38 paths) |
| Scope classifications exist | ✅ §4 |
| Compliance audit exists | ✅ §5 |
| Conflict matrix exists | ✅ §6 |
| Migration candidates identified | ✅ §7 |
| No runtime behavior changed | ✅ Discovery only |

---

## 13. Handoff

| Next phase | Ready | Input |
|------------|-------|-------|
| **ASN-2** Authority Source Inventory | ✅ | §3 ID table + §4 classifications |
| ASN-3+ | Pending | Normalization design (out of ASN-1 scope) |

**Recommended ASN-2 focus:** Deep source tracing per ID (call graph, data dependencies, test coverage, production traffic sensitivity).

---

*ASN-1 Discovery complete. No code modified.*
