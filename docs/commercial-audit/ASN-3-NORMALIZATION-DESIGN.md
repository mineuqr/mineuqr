# ASN-3 — Authority Scope Normalization Design

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-3 — Migration strategy design  
**Date:** 2026-06-07  
**Status:** Complete — design only, no runtime changes  

**Mode:** Blueprint for future migration waves. No code, migrations, feature rewrites, or billing changes.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `ASN-2-AUTHORITY-SOURCE-INVENTORY.md`
- `ASN-2.5-AUTHORITY-CANONICALIZATION-DECISION.md`
- `COMMERCIAL-AUTHORITY-SPEC.md`
- `PLAN-FEATURE-MATRIX.md`
- `PLAN-ID-MAPPING.md`
- `PG-1C.4B-SERVER-GATE-MIGRATION-MATRIX.md`

**Governing decisions:** ASN-2.5 D-01 through D-10  
**Design principles:** P-01 through P-05 (this document §2)

---

## 1. Executive summary

ASN-3 defines **six migration waves (A–F)** that move MineuQR from the current mixed authority model to the canonical model approved in ASN-2.5. Waves are ordered by **risk and dependency**: CRITICAL ordering drift first, server mutation gates second, legacy retirement third, limits fourth, transitional removal fifth, source deletion last.

| Wave | Name | Priority | Risk | Primary outcome |
|------|------|----------|------|-----------------|
| **A** | Ordering authority alignment | 1 | CRITICAL | F-3 eliminated; single guest ordering function |
| **B** | Server mutation gate migration | 2 | HIGH | Server gates use `features.*` / `commercial.isAdmin` |
| **C** | Legacy ordering retirement | 3 | HIGH | Zero ordering consumers on restaurant authority |
| **D** | Resolver limit normalization | 4 | MEDIUM | Limits from `limits.*`; no scoped row for quotas |
| **E** | Transitional layer removal | 5 | HIGH | Wave 1 shims removed |
| **F** | Legacy authority retirement | 6 | CRITICAL | L-01–L-12 deleted |

**Billing boundary (P-05 / D-09):** No wave modifies checkout, webhooks, trial creation, subscription CRUD, revenue, or invoices. Scope adapter changes that affect **read-only** context building are allowed in Wave E only with billing program review.

**Handoff:** ASN-4 Migration Planning is ready (per-wave implementation tickets, sequencing, owners).

---

## 2. Design principles (ASN-3)

| ID | Principle | Enforcement |
|----|-----------|-------------|
| **P-01** | Commercial authority belongs to **Owner Account**, never Restaurant | All waves |
| **P-02** | All commercial decisions derive from C-02 → C-03 → C-04 chain | Waves A–E |
| **P-03** | Feature access uses `features.*`, `limits.*`, `commercial.*` — never `planId` or scoped rows for gates | Waves A–D |
| **P-04** | Read and write paths share authority (D-07) | Wave A mandatory; Wave B for owner mutations |
| **P-05** | Billing domain protected (D-09) | All waves |

---

## 3. Deliverable 2 — Normalization waves (design)

### Wave A — Ordering authority alignment

| Attribute | Value |
|-----------|-------|
| **Priority** | 1 |
| **Risk** | CRITICAL |
| **ASN-2.5** | D-07, D-08 (F-3) |
| **Depends on** | — (first wave) |

#### Scope

```text
order.canOrder          (server/routers.ts)
order.create            (entitlement gate only — not hours/closure)
MenuView                (consumer via API)
CartDrawer              (consumer via order.create)
```

#### Goal

Single authority source for guest **ordering entitlement** (commercial allow/deny):

```text
restaurantId → restaurant.userId → getCommercialEntitlements(ownerId) → features.ordering
```

#### Proposed design (no implementation)

1. **Introduce** server helper `resolveGuestOrderingAllowed(restaurantId)` (name TBD in ASN-4):
   - `getRestaurantById(restaurantId)` → owner `userId`
   - `getCommercialEntitlements(userId)` → `entitlements.features.ordering === true`
   - Return `{ allowed: boolean }` (same shape concern as `{ canOrder }`)

2. **Wire** `order.canOrder` → delegate to helper only.

3. **Wire** `order.create` → replace `restaurantAllowsTableOrdering` with same helper before table/pricing logic.

4. **Preserve** operational gates on `order.create` unchanged:
   - `restaurant.isActive`
   - `temporaryClosure`
   - `workingHours` / `isRestaurantOpen`
   - Table and menu validation

5. **Do not** change client `MenuView` authority path (still `order.canOrder`); alignment is server-side.

#### Register-path behavior note

When owner has **only** restaurant-scoped trial row (`restaurantId > 0`, no account-level row), C-02 returns `plan: NONE` → `features.ordering: false`. Pure Wave A **may disable guest ordering** for register-path owners until scope adapter work (Wave E option) or billing-approved account-level trial promotion.

**Mitigation options (ASN-4 decision):**

| Option | Description | Billing touch |
|--------|-------------|---------------|
| **A1** | Ship pure entitlements; accept register-path ordering off until E | None |
| **A2** | Wave A uses shared helper that matches **post-A** entitlements only; document delta | None |
| **A3** | Defer Wave A to ASN-4 until E.0 scope-read shim approved | Billing review |

**Recommendation for ASN-4:** A1 for stop-ship F-3 fix if production is account-level heavy; A3 if register-path ordering volume is high.

#### Out of scope (Wave A)

- Deleting `restaurantAllowsTableOrdering` (Wave C)
- Removing `resolveCanOrderRead` (Wave E)
- Changing `buildCommercialContextFromDb` scope (Wave E)
- Billing / trial row creation (D-09)

#### Expected result

- F-3 eliminated: `canOrder === true` ⟺ create entitlement passes.
- **Success metric:** 0 ordering authority drift incidents (D-08 CRITICAL).

---

### Wave B — Server mutation gate migration

| Attribute | Value |
|-----------|-------|
| **Priority** | 2 |
| **Risk** | HIGH |
| **ASN-2.5** | D-06, D-07 |
| **Depends on** | — (may run parallel to A after A design frozen) |

#### Scope

| Procedure | Current gate | Target |
|-----------|--------------|--------|
| `restaurant.updateTemplate` | `premiumTemplates` + `isSubscriptionActive` | `features.templates` (classic exempt) |
| `restaurant.updateCustomColors` | `isSubscriptionActive` | `features.customColors` |
| `restaurant.updateCustomFonts` | `isSubscriptionActive` | `features.customFonts` |
| Admin bypass | `ctx.user.role === "admin"` | `commercial.isAdmin` via entitlements |

#### Proposed design

1. **Introduce** `assertCommercialFeature(ownerId, featureKey)` (or reuse planned PG-1C.4B helper):
   - `getCommercialEntitlements(ownerId)`
   - If `commercial.isAdmin` → allow
   - Else if `features[key] !== true` → `TRPCError FORBIDDEN` with stable message
   - Map existing Arabic messages where possible

2. **Template rule:** If `menuTemplate === "classic"` → skip gate (matrix: all plans have templates; classic is always allowed).

3. **Remove** `isSubscriptionActive` calls from these three mutations only (L-07 partial retirement).

4. **Remove** `premiumTemplates` array as gate input (L-11); optional retain as catalog metadata only.

5. **Align** with client: `useCommercialFeatureVisibility` already uses same feature keys.

#### Out of scope (Wave B)

- `restaurant.create` / category / menu limits (Wave D)
- Guest ordering (Wave A)
- `checkTrialStatus` (Wave E)
- Reports / stats gates (future; ungated today per PG-1C.4A)

#### Expected result

- Server denies Basic for colors/fonts; allows per matrix.
- Client and server customization gates agree.
- **Success metric:** 0 `isSubscriptionActive` consumers on template/color/font mutations.

---

### Wave C — Legacy ordering retirement

| Attribute | Value |
|-----------|-------|
| **Priority** | 3 |
| **Risk** | HIGH |
| **ASN-2.5** | D-05 L-01–L-03, L-08 |
| **Depends on** | **Wave A** (canonical ordering path live) |

#### Scope

Retire **ordering-specific** consumers of:

```text
resolveOrderingSubscriptionRow()      (L-01)
getOrderingSubscriptionForRestaurant() (L-02)
restaurantAllowsTableOrdering()       (L-03)
resolveTableOrderingEntitlement()     (L-08) — for ordering only
```

#### Design rules

1. **Consumer-by-consumer** — no bulk delete of `subscriptionResolver.ts` functions.
2. **Do not delete** L-01 until Wave D completes (limits still use `resolveOrderingSubscriptionRow`).
3. After Wave A, expected **zero** production consumers:
   - `order.create` entitlement
   - `order.canOrder`
   - `resolveCanOrderRead` legacy leg (removed in Wave E, not C)

4. Mark `restaurantAllowsTableOrdering` `@deprecated` in Wave C; delete in Wave F.

5. Update tests: `order-create-pricing.test.ts`, `phase-c-verification.test.ts`, parity tests — mock entitlements path not legacy.

#### Remaining consumers after C (expected)

| Consumer | Wave to migrate |
|----------|-----------------|
| `resolvePlanLimitsForUser(_, restaurantId)` | Wave D |
| Parity test mocks | Wave E/F |

#### Expected result

- **Success metric:** 0 ordering entitlement consumers on restaurant authority (grep gate).

---

### Wave D — Resolver limit normalization

| Attribute | Value |
|-----------|-------|
| **Priority** | 4 |
| **Risk** | MEDIUM (behavior change for NONE / Enterprise) |
| **ASN-2.5** | D-06 limits; AD-1, AD-2 from PG-1C.2D |
| **Depends on** | **Wave B** (admin bypass pattern); **Wave C** (ordering off L-01, not blocking) |

#### Scope

| Consumer | Current | Target |
|----------|---------|--------|
| `assertRestaurantCreateAllowed` | `resolvePlanLimitsForUser(userId)` + S-14 all rows + S-20 fallback | `limits.restaurants` from entitlements |
| `assertCategoryCreateAllowed` | `resolvePlanLimitsForUser(userId, restaurantId)` via S-10 | `limits.categories` (account-level) |
| `assertMenuItemCreateAllowed` | same | `limits.items` (account-level) |
| `getFallbackBasicLimits` | Shadow 1/10/100 for NONE | `limits.NONE` = 0/0/0 |

#### Proposed design

1. **Introduce** `assertCommercialLimit(ownerId, limitKey, currentCount)`:
   - Load entitlements via `getCommercialEntitlements`
   - `commercial.isAdmin` → unlimited (null limits → skip cap)
   - Compare count vs `limits[key]`; `null` = unlimited (Enterprise)

2. **Restaurant create:** Count `getRestaurantsByUser(userId)` vs `limits.restaurants`.

3. **Category/item create:** Count via `getRestaurantStats(restaurantId)` vs account limits (not per-venue subscription row).

4. **Remove** `resolvePlanLimitsForUser` from assertion path (L-09); deprecate; delete Wave F.

5. **Behavior deltas (documented):**

| Scenario | Before | After |
|----------|--------|-------|
| NONE plan | Basic fallback limits (1/10/100) | 0/0/0 — create denied |
| Enterprise | DB 999/9999/100 | `null` = unlimited per matrix |
| Register scoped row only | Limits from scoped row | Limits from account context (NONE until E) |

#### Out of scope

- Billing row scope (D-09)
- Client limit preview UI (optional future)

#### Expected result

- **Success metric:** 0 limit assertions using `resolveOrderingSubscriptionRow` or DB plan row fallback.

---

### Wave E — Transitional layer removal

| Attribute | Value |
|-----------|-------|
| **Priority** | 5 |
| **Risk** | HIGH |
| **ASN-2.5** | D-04 T-01–T-03 |
| **Depends on** | **A + B + C + D** |

#### Scope

| Transitional artifact | Retirement condition |
|----------------------|----------------------|
| `resolveCanOrderRead()` (T-01) | Wave A helper replaces; zero router imports |
| `resolveTrialStatusRead()` (T-02) | Proxy to `getCommercialEntitlements` or deprecate API |
| F-W1-01–F-W1-04 fallbacks (T-03) | Zero callers |
| `wave1ReadAuthority.ts` | Empty → delete |

#### Optional E.0 — Scope-read adapter (billing-gated)

If register-path ordering/trial UX requires account NONE + entitled scoped row:

- Extend `buildCommercialContextFromDb` to consider scoped rows for **read-only** entitlement projection **without** changing billing writes.
- Requires **billing program sign-off** (D-09 exception).
- If rejected, register users remain `plan: NONE` until account-level row exists.

#### `checkTrialStatus` design options

| Option | Behavior |
|--------|----------|
| E1 | Thin proxy: `commercial.isTrial`, dates from context |
| E2 | Deprecate endpoint; client uses entitlements only |
| E3 | Keep shape; remove `isSubscriptionActive` / `getTrialEndDate` fallbacks |

**Recommendation:** E1 short-term; E2 long-term per PG-1C.4B.

#### Expected result

- **Success metric:** 0 imports of `wave1ReadAuthority` in production routers.

---

### Wave F — Legacy authority retirement

| Attribute | Value |
|-----------|-------|
| **Priority** | 6 |
| **Risk** | CRITICAL (deletion) |
| **ASN-2.5** | D-05 full L-01–L-12 |
| **Depends on** | **Wave E** + verification green |

#### Deletion candidates (only when consumer count = 0)

| Legacy ID | Symbol | Verify before delete |
|-----------|--------|-------------------|
| L-01 | `resolveOrderingSubscriptionRow` | Wave D complete; activation still uses — **may retain for billing** |
| L-02 | `getOrderingSubscriptionForRestaurant` | No feature consumers |
| L-03 | `restaurantAllowsTableOrdering` | Wave C complete |
| L-05 | `BASIC_FREE_PLAN_ID` ordering gate | Ordering uses `features.ordering` only |
| L-07 | `isSubscriptionActive` feature usage | Wave B + E complete |
| L-08 | `resolveTableOrderingEntitlement` ordering usage | Wave C complete |
| L-09 | `resolvePlanLimitsForUser` | Wave D complete |
| L-10 | `getFallbackBasicLimits` | Wave D complete |
| L-11 | `premiumTemplates` gate | Wave B complete |
| L-12 | Inline admin bypass | Wave B complete |

#### Billing-retained symbols (NOT deleted in ASN F)

| Symbol | Reason |
|--------|--------|
| `resolveSubscriptionForActivationFromRows` | D-09 payments |
| `getSubscriptionForRestaurant` | Billing display (W4 exclude) |
| `getCanonicalUserSubscription` | Billing read |
| `userSubscriptions` table | Persistence |

#### F.0 verification gate (mandatory before any delete)

- Full ASN consumer grep audit
- `npx vitest run server/commercial server/routers.test.ts` + ordering/limit suites
- `npx tsc --noEmit`
- Manual guest order + owner mutation smoke checklist

#### Expected result

- **Success metric:** 0 legacy authority sources used for feature/limit gates (L-03, L-07, L-09, L-11, L-12 gone).

---

## 4. Deliverable 3 — Migration dependency matrix

| Wave | Depends on | May parallel with | Blocks |
|------|------------|-------------------|--------|
| **A** | — | — | C, E (ordering path) |
| **B** | — | A (after A spec approved) | E (mutation gates) |
| **C** | A | — | E (legacy ordering gone) |
| **D** | B (admin pattern), C (L-01 ordering-free) | — | E, F (limits) |
| **E** | A, B, C, D | — | F |
| **F** | E | — | ASN program complete |

```text
        A ──────┐
        │       ├──► C ──┐
        │       │        │
        B ──────┼────────┼──► D ──┐
                │        │        │
                └────────┴────────┴──► E ──► F
```

**Critical path:** A → C → E → F  
**Parallel track:** B → D (joins before E)

---

## 5. Deliverable 4 — Consumer migration map

### Legacy ordering chain

| Legacy source | Consumer | Target source | Wave |
|---------------|----------|---------------|------|
| `restaurantAllowsTableOrdering` | `order.create` | `getCommercialEntitlements` → `features.ordering` | A |
| `restaurantAllowsTableOrdering` | `resolveCanOrderRead` (legacy leg) | Same as A (then remove shim) | A → E |
| `resolveOrderingSubscriptionRow` | `getOrderingSubscriptionForRestaurant` | N/A — retired with L-03 | C |
| `resolveTableOrderingEntitlement` | `restaurantAllowsTableOrdering` | `features.ordering` | C |
| `order.canOrder` router | `resolveCanOrderRead` | `resolveGuestOrderingAllowed` (A helper) | A |
| `MenuView` | `trpc.order.canOrder` | Unchanged client; server Wave A | A |

### Server mutation gates

| Legacy source | Consumer | Target source | Wave |
|---------------|----------|---------------|------|
| `isSubscriptionActive` | `restaurant.updateTemplate` | `features.templates` + `commercial.isAdmin` | B |
| `isSubscriptionActive` | `restaurant.updateCustomColors` | `features.customColors` | B |
| `isSubscriptionActive` | `restaurant.updateCustomFonts` | `features.customFonts` | B |
| `premiumTemplates` list | `restaurant.updateTemplate` | `features.templates` (classic exempt) | B |
| `ctx.user.role === "admin"` | restaurant/category/menu mutations | `commercial.isAdmin` | B |

### Limits

| Legacy source | Consumer | Target source | Wave |
|---------------|----------|---------------|------|
| `resolvePlanLimitsForUser(userId)` | `assertRestaurantCreateAllowed` | `limits.restaurants` | D |
| `resolvePlanLimitsForUser(userId, restaurantId)` | `assertCategoryCreateAllowed` | `limits.categories` | D |
| `resolvePlanLimitsForUser(userId, restaurantId)` | `assertMenuItemCreateAllowed` | `limits.items` | D |
| `resolveOrderingSubscriptionRow` | `resolvePlanLimitsForUser` (scoped) | Removed — account limits only | D |
| `getFallbackBasicLimits` | `resolvePlanLimitsForUser` | `limits.NONE` (0/0/0) | D |

### Transitional (Wave 1)

| Legacy source | Consumer | Target source | Wave |
|---------------|----------|---------------|------|
| `resolveCanOrderRead` | `order.canOrder` | Wave A helper | A, delete E |
| `resolveTrialStatusRead` | `subscription.checkTrialStatus` | `getCommercialEntitlements` / deprecate | E |
| `isSubscriptionActive` | `resolveTrialStatusRead` fallback | Context / `commercial.isTrial` | E |
| `getTrialEndDate` | `resolveTrialStatusRead` fallback | `context.subscription.trialEndsAt` | E |

### Protected (no ASN migration)

| Source | Consumer | Disposition |
|--------|----------|-------------|
| `planId` / webhooks | PayPal, Tap activation | **PROTECTED** D-09 |
| `getCanonicalUserSubscription` | `getCurrentSubscription`, checkout | **PROTECTED** billing read |
| `getSubscriptionForRestaurant` | `getByRestaurant`, admin CRUD | **PROTECTED** display |
| `buildTrialSubscriptionForUser` | `registerOwner` | **PROTECTED** lifecycle |
| `adminKpiCalculations` | Admin stats | Out of ASN-F scope; future analytics program |

---

## 6. Deliverable 5 — Verification strategy (per wave)

### Wave A — Ordering alignment

| Phase | Design |
|-------|--------|
| **Pre-migration** | Baseline: document `canOrder` vs `create` outcomes for matrix scenarios (account PRO, register scoped trial, NONE, BASIC). Capture F-3 reproduction case. |
| **Migration validation** | New integration test: same `restaurantId` → `canOrder` and `create` entitlement agree. Property: helper called by both procedures. |
| **Rollback validation** | Revert router wiring to `restaurantAllowsTableOrdering` / `resolveCanOrderRead`; parity tests from PG-1C.4D still pass. |
| **Post-migration** | Production: 0 CRITICAL ordering drift alerts; guest order success rate stable; register-path spot check per mitigation option chosen. |

### Wave B — Server mutation gates

| Phase | Design |
|-------|--------|
| **Pre-migration** | Matrix table: BASIC / TRIAL / PRO / ADMIN × template/color/font mutations expected allow/deny. |
| **Migration validation** | Extend `routers.test.ts`: Basic denied colors/fonts; trial allowed; admin allowed via `commercial.isAdmin`. |
| **Rollback validation** | Restore `isSubscriptionActive` gates; client visibility unchanged. |
| **Post-migration** | 0 HIGH drift client vs server on customization panels. |

### Wave C — Legacy ordering retirement

| Phase | Design |
|-------|--------|
| **Pre-migration** | Grep: list all `restaurantAllowsTableOrdering` import sites. |
| **Migration validation** | Grep assert: no ordering path imports L-03. Ordering tests use entitlements mocks only. |
| **Rollback validation** | Re-export deprecated wrapper calling old function (temporary). |
| **Post-migration** | Deprecation warnings only; function remains until F. |

### Wave D — Limit normalization

| Phase | Design |
|-------|--------|
| **Pre-migration** | Count scenarios: NONE user restaurant count, Enterprise unlimited, PRO at cap. |
| **Migration validation** | `subscriptionPlanLimits.test.ts` updated for resolver limits; NONE → FORBIDDEN on create. |
| **Rollback validation** | Restore `resolvePlanLimitsForUser` in asserts. |
| **Post-migration** | No erroneous FORBIDDEN for paying users at cap boundary. |

### Wave E — Transitional removal

| Phase | Design |
|-------|--------|
| **Pre-migration** | Import graph: all `wave1ReadAuthority` consumers. |
| **Migration validation** | Vitest commercial + subscription suites; trial API shape contract test if retained. |
| **Rollback validation** | Restore `wave1ReadAuthority.ts` from git. |
| **Post-migration** | PG-1C.4D parity tests retired or rewritten for canonical-only behavior. |

### Wave F — Legacy deletion

| Phase | Design |
|-------|--------|
| **Pre-migration** | ASN-2 consumer inventory re-run; confirm zero for each delete candidate. |
| **Migration validation** | Full server test suite + tsc; no dead imports. |
| **Rollback validation** | Git revert deletion commit only (functions restored from history). |
| **Post-migration** | ASN-1 grep audit repeated; legacy symbols absent from feature paths. |

---

## 7. Deliverable 6 — Success metrics

| Wave | Metric | Target |
|------|--------|--------|
| **A** | Ordering authority drift incidents | **0** (CRITICAL) |
| **A** | `canOrder` vs `create` mismatch rate in tests | **0** |
| **B** | `isSubscriptionActive` on template/color/font mutations | **0** |
| **B** | `planId` checks in feature mutation gates | **0** |
| **C** | Ordering consumers on `restaurantAllowsTableOrdering` | **0** |
| **C** | Ordering consumers on `resolveOrderingSubscriptionRow` | **0** |
| **D** | Limit asserts using restaurant-scoped row selection | **0** |
| **D** | NONE users receiving shadow Basic limits | **0** |
| **E** | Production imports of `wave1ReadAuthority` | **0** |
| **E** | Documented parity fallbacks (F-W1-01–04) active | **0** |
| **F** | Legacy L-03, L-07, L-09, L-11, L-12 in feature paths | **0** |
| **F** | Legacy authority sources for commercial gates | **0** (billing symbols exempt) |

**Program-level metric:** 100% of commercial feature/limit gates trace to C-04 output (verified by ASN-4 audit script).

---

## 8. Deliverable 7 — Normalization end-state

### Architecture

```text
                    userSubscriptions (persistence)
                              │
                    pickUserLevelSubscription()     [account row only]
                              │
                    buildCommercialContextFromDb()
                              │
                    CommercialContext
                              │
                    resolveCommercialEntitlements()  ← PLAN-FEATURE-MATRIX
                              │
                    CommercialEntitlements
                    ├── features.*
                    ├── limits.*
                    └── commercial.*
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   commercial.getEntitlements   Guest ordering helper   assertCommercialFeature/Limit
          │                   │                   │
   Client visibility      order.canOrder          Server mutations
   (owner UI)             order.create            (templates, colors, fonts, caps)
          │                   │
          └───────── P-04: same authority per capability ─────────┘
```

### Single source property

- **One** entitlement computation path for all commercial decisions.
- **No** restaurant-scoped commercial authority.
- **No** parallel boolean (`isSubscriptionActive`) or planId feature gates.
- **No** transitional OR-combine (`legacy || features.ordering`).

### Restaurant-retained domains (non-commercial)

| Domain | Authority type |
|--------|----------------|
| Menu (categories, items, images) | Operational / tenant |
| Tables | Operational |
| Working hours | Operational |
| Temporary closure | Operational |
| Restaurant settings (name, slug, branding values) | Operational |
| Order hours/closure on `create` | Operational (write-only) |

### Billing (parallel, protected)

```text
userSubscriptions writes ← checkout / webhooks / admin / register
planId ← PSP catalog (not feature gates)
```

Feature authority **reads** account state via C-02; billing **writes** remain independent until a future billing program aligns row scope.

---

## 9. ASN-4 planning inputs (handoff)

ASN-4 should produce per wave:

1. Implementation tickets with file-level checklist
2. Register-path mitigation decision (Wave A: A1/A2/A3)
3. `assertCommercialFeature` / `assertCommercialLimit` API contract
4. Rollback runbook per wave
5. Production rollout order: **A → (B ∥ D prep) → C → D → E → F**
6. Feature flag strategy (optional): `ASN_WAVE_A_ORDERING_CANONICAL=1` for staged rollout

---

## 10. Forbidden actions confirmation

| Action | Status |
|--------|--------|
| Code changes | **None** |
| Migrations / schema | **None** |
| Runtime behavior | **Unchanged** |
| Legacy deletion | **None** |
| Billing / lifecycle changes | **None** |

---

## 11. Success criteria

| Criterion | Status |
|-----------|--------|
| Wave design completed (A–F) | ✅ §3 |
| Dependency matrix completed | ✅ §4 |
| Consumer migration map completed | ✅ §5 |
| Verification strategy completed | ✅ §6 |
| Success metrics defined | ✅ §7 |
| End-state architecture documented | ✅ §8 |
| No runtime changes | ✅ |

---

*ASN-3 Normalization Design complete. ASN-4 Migration Planning is ready.*
