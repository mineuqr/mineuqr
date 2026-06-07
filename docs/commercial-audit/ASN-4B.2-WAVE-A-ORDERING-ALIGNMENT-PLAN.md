# ASN-4B.2 — Wave A Ordering Alignment Planning

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-4B.2 — Repository audit and Wave A plan  
**Date:** 2026-06-07  
**Status:** Complete — planning only, no runtime changes  

**Mode:** Repository audit. No code, schema, migrations, or fixes.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `ASN-2-AUTHORITY-SOURCE-INVENTORY.md`
- `ASN-2.5-AUTHORITY-CANONICALIZATION-DECISION.md`
- `ASN-3-NORMALIZATION-DESIGN.md`
- `ASN-4A-REGISTER-PATH-CANONICAL-STRATEGY.md`
- `ASN-4B.1-REGISTER-MIGRATION-PLAN.md`
- `COMMERCIAL-AUTHORITY-SPEC.md`

**Governing decisions:** D-01, D-02, D-05, D-07, D-4A-01 | **Register strategy:** R1 hard cutover (ASN-4B.1)

---

## 1. Executive summary

Repository audit confirms: **guest ordering is not canonically governed**. One read path is **Mixed** (`resolveCanOrderRead`), one write path is **Legacy** (`restaurantAllowsTableOrdering`). No runtime symbol named `canCreateOrder` or `canUseOrdering` exists.

| Classification | Count | Ordering impact |
|----------------|------:|-----------------|
| **Canonical** | 2 chains (partial) | `features.ordering` computed but not sole gate |
| **Legacy** | 5 functions | Primary write gate + scoped row selection |
| **Mixed** | 1 function | `resolveCanOrderRead` — F-3 root |
| **Operational (non-commercial)** | 4 client/server checks | Hours, closure, active — not Wave A entitlement scope |

**Wave A recommendation:** Introduce single server helper `resolveGuestOrderingAllowed(restaurantId)` → `getCommercialEntitlements(ownerId)` → `features.ordering`; wire **both** `order.canOrder` and `order.create` (entitlement portion). **Deploy with ASN-4B.1 R1 register cutover** so greenfield users are not broken. **ASN-4C backfill** required before removing F-W1-03 for legacy scoped-only owners.

---

## 2. Search methodology

Searched repository for: `canOrder`, `canPlaceOrder`, `resolveCanOrderRead`, `restaurantAllowsTableOrdering`, `order.create`, `order.canOrder`, `features.ordering`, `F-W1`, `wave1ReadAuthority`, `resolveOrderingSubscriptionRow`, `pickUserLevelSubscription`, `getCommercialEntitlements`, `CommercialContext`, `plan === NONE`, `userSubscriptions`, `ordering`.

**Not found in production code:**

- `canCreateOrder`
- `canUseOrdering`
- Client-side `hasCommercialFeature(entitlements, "ordering")` for guest menu (owner entitlements hook not used in `MenuView`)

---

## 3. Deliverable A — Ordering authority inventory

### 3.1 Server — entitlement gates (commercial)

| # | File | Function / procedure | Responsibility | Authority source |
|---|------|-------------------|----------------|------------------|
| A-01 | `server/routers.ts` L1636–1640 | `order.canOrder` | Guest ordering **read** probe API | `resolveCanOrderRead` → **Mixed** |
| A-02 | `server/routers.ts` L1685–1688 | `order.create` (entitlement block) | Guest ordering **write** entitlement | `restaurantAllowsTableOrdering` → **Legacy** |
| A-03 | `server/commercial/wave1ReadAuthority.ts` L54–73 | `resolveCanOrderRead` | Combines account entitlements + legacy ordering | **Mixed** |
| A-04 | `server/db.ts` L716–722 | `restaurantAllowsTableOrdering` | Boolean legacy ordering gate | `getOrderingSubscriptionForRestaurant` → **Legacy** |
| A-05 | `server/db.ts` L709–714 | `getOrderingSubscriptionForRestaurant` | Load owner rows, pick ordering row | `resolveOrderingSubscriptionRow` → **Legacy** |
| A-06 | `server/subscriptionResolver.ts` L92–103 | `resolveOrderingSubscriptionRow` | Scoped row first, account fallback | **Legacy** (restaurant-scoped preference) |
| A-07 | `server/subscriptionEntitlement.ts` L117–148 | `resolveTableOrderingEntitlement` | Period + `planId !== 30001` | **Legacy** (hardcoded plan ID) |
| A-08 | `server/commercial/getCommercialEntitlements.ts` | `getCommercialEntitlements` | Owner entitlement service | **Canonical** (not sole ordering gate) |
| A-09 | `server/commercial/buildCommercialContextFromDb.ts` | `buildCommercialContextFromDb` | Account row → context | **Canonical** (`pickUserLevelSubscription`) |
| A-10 | `src/lib/commercial/resolveCommercialEntitlements.ts` | `resolveCommercialEntitlements` | `features.ordering` derivation | **Canonical** (matrix) |

### 3.2 Server — operational gates (non-commercial, Wave A exempt)

| # | File | Function / procedure | Responsibility | Authority source |
|---|------|-------------------|----------------|------------------|
| O-01 | `server/routers.ts` L1661–1667 | `order.create` | Restaurant exists / active | Operational |
| O-02 | `server/routers.ts` L1669–1683 | `order.create` | Temporary closure + working hours | `isRestaurantOpen` / `parseTemporaryClosure` |
| O-03 | `server/orderPricing.ts` | `resolveAuthoritativeOrderLines` | Menu item validation, pricing | Operational / data |
| O-04 | `server/routers.ts` L1690–1693 | `order.create` | Table exists | Operational |

### 3.3 Client — guest ordering UX

| # | File | Function / variable | Responsibility | Authority source |
|---|------|---------------------|----------------|------------------|
| C-01 | `client/src/pages/MenuView.tsx` L48–52 | `trpc.order.canOrder.useQuery` | Fetch server ordering probe | Server **Mixed** (A-01) |
| C-02 | `client/src/pages/MenuView.tsx` L54–66 | `orderingAllowed` | Client hours + closure | Operational (local) |
| C-03 | `client/src/pages/MenuView.tsx` L68–70 | `canPlaceOrder`, `showClosedNotice` | Combine commercial + operational | **Mixed** + operational |
| C-04 | `client/src/components/CartDrawer.tsx` L41 | `trpc.order.create.useMutation` | Submit order | Server **Legacy** write gate (A-02) |
| C-05 | `client/src/lib/commercial/featureVisibility.ts` L197–201 | `guest-ordering-ui` inventory | Documents server-driven gate | Metadata only |
| C-06 | `client/src/lib/commercial/clientGateRegistry.ts` L123–129 | `guest-ordering-ui` | Registry: `order.canOrder` | Server-driven |

**Note:** Owner dashboard does **not** use `useCommercialFeatureVisibility().ordering` to gate guest QR ordering. Client owner `features.ordering` appears only in tests and entitlements display — **not** in guest menu path.

### 3.4 Register → ordering chain (indirect)

| # | File | Function | Responsibility | Authority source |
|---|------|----------|----------------|------------------|
| R-01 | `server/auth-local/registerOwner.ts` L149–153 | `buildTrialSubscriptionForUser(userId, restaurantId)` | Seeds **scoped** trial | **Legacy** scope (L-04) |
| R-02 | `server/create-trial-subscription.ts` L53–58 | `buildTrialSubscriptionForUser` | Trial payload builder | Defaults `restaurantId=0` but register passes N |

Scoped register row → `pickUserLevelSubscription` misses it → `plan: NONE` → triggers F-W1-03.

### 3.5 Tests (ordering authority mocks)

| File | Role |
|------|------|
| `server/commercial/wave1ReadAuthority.test.ts` | Mixed `resolveCanOrderRead` unit tests |
| `server/commercial/wave1ReadAuthority.parity.test.ts` | Register-path parity vs legacy |
| `server/order-create-pricing.test.ts` | Mocks `restaurantAllowsTableOrdering: true` |
| `server/phase-c-verification.test.ts` | Mocks legacy ordering for `order.create` |
| `server/subscription-resolver.test.ts` | `resolveOrderingSubscriptionRow` behavior |
| `server/subscription-entitlement.test.ts` | `resolveTableOrderingEntitlement` + `BASIC_FREE_PLAN_ID` |

---

## 4. Deliverable B — Authority classification

### 4.1 Canonical (uses CommercialContext → CommercialEntitlements)

| Component | How it touches ordering | Used as ordering gate? |
|-----------|-------------------------|------------------------|
| `buildCommercialContextFromDb` | Builds context for owner | **Indirect** — feeds entitlements |
| `pickUserLevelSubscription` | Account row only | **Indirect** — register gap when scoped row only |
| `getCommercialEntitlements` | Full service | **Partial** — via `resolveCanOrderRead` account leg only |
| `resolveCommercialEntitlements` | Sets `features.ordering` from matrix | **Computed** — not wired to `order.create` |
| `planFeatureMatrix` | TRIAL/PRO/ENT → `ordering: true`; BASIC/NONE → false | **Definition** only |

**Verdict:** Canonical chain **exists** but **does not exclusively govern** guest ordering today.

### 4.2 Legacy (restaurant-scoped / direct subscription / planId)

| Component | Legacy mechanism |
|-----------|----------------|
| `resolveOrderingSubscriptionRow` | `restaurantId === target` row wins |
| `getOrderingSubscriptionForRestaurant` | Wraps scoped-first pick |
| `restaurantAllowsTableOrdering` | Subscription table + plan row + `30001` check |
| `resolveTableOrderingEntitlement` | `BASIC_FREE_PLAN_ID` hardcode |
| `order.create` entitlement | Calls A-04 directly |
| Register scoped trial insert | Seeds scoped-first dominance |

### 4.3 Mixed

| Component | Canonical leg | Legacy leg |
|-----------|---------------|------------|
| `resolveCanOrderRead` | `getCommercialEntitlements` → `features.ordering` when `plan !== "NONE"` | `restaurantAllowsTableOrdering` always; **sole path** when `plan === "NONE"` (F-W1-03) |
| `MenuView.canPlaceOrder` | `canOrder` from server mixed probe | `orderingAllowed` client operational |

### 4.4 Classification diagram

```text
                    CANONICAL                          LEGACY
                         │                                │
    pickUserLevelSubscription              resolveOrderingSubscriptionRow
              │                                      │
    buildCommercialContextFromDb            getOrderingSubscriptionForRestaurant
              │                                      │
    resolveCommercialEntitlements                    │
         features.ordering                           │
              │                                      │
              ├──────── resolveCanOrderRead ────────┤
              │              (MIXED)                  │
              │                                       │
         [NOT WIRED]                          restaurantAllowsTableOrdering
              │                                       │
              │                                 order.create (WRITE)
              │                                       │
         order.canOrder (READ) ◄─── DRIFT (F-3) ───────┘
```

---

## 5. Deliverable C — Ordering drift candidates

| ID | Scenario | Read (`canOrder`) | Write (`create` entitlement) | Root cause |
|----|----------|-------------------|------------------------------|------------|
| **D-01** | F-3 production incident | true (F-W1-04: `features.ordering`) | false (legacy scoped row) | Mixed read vs legacy write |
| **D-02** | Register-path new owner | true (F-W1-03 legacy) | true (scoped row) | Aligns today; **NONE** in client entitlements |
| **D-03** | Register-path + Wave A canonical only (pre-4C) | false (`features.ordering`) | false | Account context NONE; no backfill |
| **D-04** | Account PRO + expired scoped row on restaurant | true (F-W1-04) | false (scoped expired picked first) | D-01 class |
| **D-05** | Account BASIC + entitled scoped PRO trial | false (`features.ordering` false) | true (scoped row) | Inverse drift (rare) |
| **D-06** | Client closed / server open (hours) | UI blocks cart | create may 403 on hours | Operational mismatch (LOW) |
| **D-07** | Client open / server closed | UI shows cart | 403 hours | Operational mismatch (LOW) |
| **D-08** | Owner client `features.ordering` false, guest `canOrder` true | N/A owner UI | Guest cart visible | Register F-W1-03; owner dashboard vs guest path split |

**Drift severity (D-07):** D-01, D-04 = **CRITICAL** | D-02, D-05, D-08 = **HIGH** | D-06, D-07 = **LOW**

---

## 6. Deliverable D — F-W1 dependency audit

Documented fallbacks from `PG-1C.4D-WAVE1-VERIFICATION.md` §3.

### F-W1-01 — `resolveTrialStatusRead` → `isSubscriptionActive` when `plan === "NONE"`

| Attribute | Value |
|-----------|-------|
| **Callers** | `subscription.checkTrialStatus` (`routers.ts` L656–658) |
| **Purpose** | Trial **active** boolean for legacy API |
| **Ordering relationship** | **Indirect** — trial messaging; not ordering gate |
| **Register dependency** | Register-path owners get `isActive: true` while entitlements NONE |
| **Wave A** | **Retain** until Wave E; not ordering path |

### F-W1-02 — `resolveTrialStatusRead` → `getTrialEndDate` when no context date

| Attribute | Value |
|-----------|-------|
| **Callers** | `checkTrialStatus` |
| **Purpose** | Trial end date |
| **Ordering relationship** | **None** |
| **Wave A** | **Retain** until Wave E |

### F-W1-03 — `resolveCanOrderRead` → `restaurantAllowsTableOrdering` when `plan === "NONE"`

| Attribute | Value |
|-----------|-------|
| **Callers** | `order.canOrder` (sole production consumer) |
| **Purpose** | Preserve guest ordering when account context is NONE but scoped row exists |
| **Ordering relationship** | **Direct** — primary register-path ordering read |
| **Dependency chain** | `plan NONE` ← `pickUserLevelSubscription` misses scoped register row ← **register L149–153** |
| **Wave A** | **Replace** with canonical `features.ordering` for greenfield; **retain for legacy cohort** until ASN-4C OR remove after backfill |

### F-W1-04 — `resolveCanOrderRead` → `legacy \|\| features.ordering` when `plan !== "NONE"`

| Attribute | Value |
|-----------|-------|
| **Callers** | `order.canOrder` |
| **Purpose** | Surface account PRO ordering when legacy scoped row denies |
| **Ordering relationship** | **Direct** — causes D-01 when write still legacy |
| **Wave A** | **Remove** — single `features.ordering` source eliminates OR and F-3 |

### F-W1 summary table

| Fallback | Ordering? | Callers | Remove when |
|----------|-----------|---------|-------------|
| F-W1-01 | No | `checkTrialStatus` | Wave E |
| F-W1-02 | No | `checkTrialStatus` | Wave E |
| F-W1-03 | **Yes** | `order.canOrder` | R1 + ASN-4C for full removal |
| F-W1-04 | **Yes** | `order.canOrder` | Wave A (same helper as create) |

---

## 7. Deliverable E — Wave A candidate matrix

| Candidate | File | Reason | Classification | Future action |
|-----------|------|--------|----------------|---------------|
| `order.create` entitlement call | `server/routers.ts` L1685 | Uses legacy only; F-3 write side | Legacy | **Replace with Entitlements** |
| `order.canOrder` wiring | `server/routers.ts` L1639 | Delegates to mixed shim | Mixed | **Replace with Entitlements** (same helper as create) |
| `resolveCanOrderRead` | `server/commercial/wave1ReadAuthority.ts` | F-W1-03/04 dual source | Mixed | **Simplify** → thin wrapper, then **Remove** (Wave E) |
| `restaurantAllowsTableOrdering` | `server/db.ts` L716 | Legacy ordering boolean | Legacy | **Replace with Entitlements** (ordering); delete Wave C/F |
| `getOrderingSubscriptionForRestaurant` | `server/db.ts` L709 | Scoped row lookup | Legacy | **Remove** from ordering (Wave C) |
| `resolveOrderingSubscriptionRow` | `server/subscriptionResolver.ts` L92 | Restaurant authority | Legacy | **Investigate Further** — limits still use until Wave D |
| `resolveTableOrderingEntitlement` | `server/subscriptionEntitlement.ts` L117 | planId 30001 gate | Legacy | **Remove** from ordering (Wave C) |
| `BASIC_FREE_PLAN_ID` ordering use | `server/subscriptionEntitlement.ts` L7 | Hardcoded plan | Legacy | **Replace with Entitlements** |
| F-W1-03 branch | `wave1ReadAuthority.ts` L66–68 | Register NONE workaround | Mixed | **Remove** after R1 + ASN-4C |
| F-W1-04 OR branch | `wave1ReadAuthority.ts` L70–72 | F-3 exposure | Mixed | **Remove** in Wave A |
| `buildTrialSubscriptionForUser(_, restaurantId)` | `registerOwner.ts` L149 | Seeds scoped trial | Legacy | **Replace** — R1 `restaurantId: 0` (ASN-4B.1) |
| `MenuView` `order.canOrder` query | `MenuView.tsx` L48 | Correct consumer; server drift | Mixed | **Simplify** — no client change if server aligned |
| `MenuView` `orderingAllowed` | `MenuView.tsx` L54–66 | Operational hours | Operational | **Keep** |
| `CartDrawer` `order.create` | `CartDrawer.tsx` L41 | Mutation transport | N/A | **Keep** |
| `guest-ordering-ui` registry | `clientGateRegistry.ts` L123 | Diagnostics | Metadata | **Simplify** authority path label post-Wave A |
| Parity test register-path | `wave1ReadAuthority.parity.test.ts` L129 | Asserts legacy match | Test | **Replace** with canonical assertions |
| `order-create-pricing.test` mock | `order-create-pricing.test.ts` L38 | Mocks legacy | Test | **Replace with Entitlements** mock |
| `phase-c-verification` mock | `phase-c-verification.test.ts` L77 | Mocks legacy | Test | **Replace with Entitlements** mock |
| Owner `hasCommercialFeature(ordering)` | tests only | Not guest path | Canonical | **Investigate Further** — optional owner dashboard QR hint later |
| `resolveTrialStatusRead` | `wave1ReadAuthority.ts` | Trial not ordering | Mixed | **Keep** for Wave A; Wave E |

### Proposed Wave A helper (design only)

```text
resolveGuestOrderingAllowed(restaurantId, now?)
  → getRestaurantById(restaurantId) ?? { allowed: false }
  → getCommercialEntitlements(restaurant.userId, now)
  → { allowed: entitlements.features.ordering === true }
```

Wire: `order.canOrder` returns `{ canOrder: allowed }`; `order.create` throws FORBIDDEN if `!allowed` (same message).

**Deploy bundle:** Wave A helper + ASN-4B.1 R1 register cutover (recommended).

---

## 8. Wave A execution plan (design only — no implementation)

### 8.1 Phase WA-1 — Align read/write (CRITICAL)

1. Add `resolveGuestOrderingAllowed` (or equivalent) in `server/commercial/` using **canonical chain only**.
2. `order.canOrder` → helper only.
3. `order.create` → replace L1685–1688 with helper check.
4. Add integration test: `canOrder` === create entitlement for scenario matrix.
5. Add F-3 regression test: account PRO + expired scoped row → **consistent** deny (both false).

### 8.2 Phase WA-2 — Register R1 (bundled)

Per ASN-4B.1: trial `restaurantId: 0` so new owners hit `features.ordering: true` without F-W1-03.

### 8.3 Phase WA-3 — Legacy cohort (ASN-4C, not Wave A)

Until backfill: owners with **only** scoped rows may lose guest ordering under pure canonical helper. **Mitigation:** ASN-4C backfill before announcing full fallback removal.

### 8.4 Phase WA-4 — Tests & docs

- Update parity tests for account-scoped register.
- Update `PG-1C.4D` parity notes: F-W1-03/04 ordering fallbacks scheduled for removal.
- Grep gate: `restaurantAllowsTableOrdering` not called from `order.create` / `canOrder` routers.

### 8.5 Explicit non-goals (Wave A)

- Delete `resolveCanOrderRead` (Wave E)
- Delete `restaurantAllowsTableOrdering` (Wave C)
- Change hours/closure logic
- Change billing / webhooks
- Client `MenuView` authority source change

---

## 9. Verification strategy (Wave A — design)

| Phase | Checks |
|-------|--------|
| **Pre-migration** | Capture D-01 reproduction; matrix: register scoped, account PRO, BASIC, NONE, TRIAL |
| **Migration validation** | Integration: same `restaurantId` → `canOrder` matches create; new register → TRIAL → ordering true |
| **Rollback** | Revert router to `resolveCanOrderRead` + `restaurantAllowsTableOrdering` |
| **Post-migration** | 0 CRITICAL ordering drift; production error message unchanged for deny path |

---

## 10. Success criteria answers

### 1. Which ordering paths already use canonical authority?

| Path | Canonical usage |
|------|-----------------|
| `resolveCanOrderRead` when `plan !== "NONE"` | Reads `getCommercialEntitlements` → `features.ordering` (partial, OR with legacy) |
| `getCommercialEntitlements` / resolver / matrix | **Defines** `features.ordering` — not enforcement on write |
| Client owner entitlements tests | Canonical matrix only — **not** guest menu |

**None** of the production guest ordering **gates** use canonical authority **exclusively** today.

### 2. Which ordering paths still depend on legacy authority?

| Path | Legacy dependency |
|------|-------------------|
| `order.create` entitlement | **100%** `restaurantAllowsTableOrdering` |
| `resolveCanOrderRead` when `plan === "NONE"` | **100%** legacy (F-W1-03) |
| `resolveCanOrderRead` when `plan !== "NONE"` | **Always** calls legacy; OR-combines (F-W1-04) |
| Full chain | `resolveOrderingSubscriptionRow` → `resolveTableOrderingEntitlement` → `planId 30001` |

### 3. Which compatibility layers exist because register creates restaurant-scoped trials?

| Layer | Introduced because |
|-------|-------------------|
| **F-W1-03** | Account `plan: NONE` after register; legacy ordering must return true |
| **F-W1-01** (trial) | Same NONE gap for `checkTrialStatus.isActive` |
| **F-W1-02** (trial date) | Context missing `trialEndsAt` for scoped row |
| **`resolveCanOrderRead` entire shim** | PG-1C.4C parity without register fix |
| **Client/server trial UX split** | Owner entitlements NONE; server legacy trial active |

**Primary seed:** `registerOwner.ts` L149–153 `buildTrialSubscriptionForUser(userId, restaurantId)`.

### 4. Which components become removable after R1 cutover?

| Component | Removable after R1? | Condition |
|-----------|---------------------|-----------|
| F-W1-03 for **new users** | **Yes** | Account trial → plan TRIAL → no NONE gap |
| F-W1-04 OR branch | **Yes** (Wave A) | Single entitlements helper |
| `resolveCanOrderRead` legacy call | **Partial** | New users only; legacy cohort until ASN-4C |
| Register-path parity test "matches legacy" | **Yes** | Rewrite to canonical assertions |
| Owner trial banner NONE after register | **Fixed** | `commercial.isTrial` true without fallback |

**Not removable after R1 alone:** `restaurantAllowsTableOrdering`, `resolveOrderingSubscriptionRow`, F-W1-03 for **pre-cutover** owners.

### 5. What should Wave A cleanup execute later?

| Step | Action | Wave |
|------|--------|------|
| 1 | Implement `resolveGuestOrderingAllowed` (canonical) | **A** |
| 2 | Wire `canOrder` + `create` to same helper | **A** |
| 3 | Ship with R1 register `restaurantId: 0` | **4B.1** |
| 4 | Remove F-W1-04 OR logic from ordering path | **A** |
| 5 | ASN-4C backfill scoped-only owners | **4C** |
| 6 | Remove F-W1-03 from ordering | **E** |
| 7 | Stop calling `restaurantAllowsTableOrdering` for ordering | **C** |
| 8 | Delete `resolveCanOrderRead` | **E** |
| 9 | Delete legacy ordering functions | **F** |

---

## 11. Forbidden actions confirmation

| Action | Status |
|--------|--------|
| Code changes | **None** |
| Schema / data migration | **None** |
| Runtime changes | **None** |

---

## 12. ASN-4B.2 success criteria

| Criterion | Status |
|-----------|--------|
| Ordering authority inventory | ✅ §3 |
| Canonical / Legacy / Mixed classification | ✅ §4 |
| Drift candidates | ✅ §5 |
| F-W1 dependency audit | ✅ §6 |
| Wave A candidate matrix | ✅ §7 |
| Success criteria questions answered | ✅ §10 |
| No runtime changes | ✅ |

---

## 13. Handoff

| Next | Scope |
|------|-------|
| **ASN-4B implementation** | WA-1 + WA-2 per §8 (when approved) |
| **ASN-4C** | Legacy scoped-row backfill before F-W1-03 removal for all owners |

---

*ASN-4B.2 Wave A Ordering Alignment Planning complete. Repository audit only. No code modified.*
