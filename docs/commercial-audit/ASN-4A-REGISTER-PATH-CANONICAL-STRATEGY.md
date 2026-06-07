# ASN-4A — Register Path Canonical Strategy

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-4A — Architectural decision (register path)  
**Date:** 2026-06-07  
**Status:** **APPROVED** — decision and planning only, no runtime changes  

**Mode:** Resolve register-path authority ambiguity. No migrations, billing changes, or code modifications in this phase.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `ASN-2-AUTHORITY-SOURCE-INVENTORY.md`
- `ASN-2.5-AUTHORITY-CANONICALIZATION-DECISION.md`
- `ASN-3-NORMALIZATION-DESIGN.md`
- `COMMERCIAL-AUTHORITY-SPEC.md`

**Parent decision:** ASN-2.5 D-01 (owner-centric model), D-05 L-04 (retire restaurant-scoped commercial authority)

---

## 1. Executive summary

ASN-3 Wave A identified unresolved ambiguity: **self-service register creates a restaurant-scoped trial row** while **CommercialContext reads only account-level rows** (`restaurantId = 0`). That forces Wave 1 fallbacks, hybrid ordering logic, and F-3 exposure.

**Decision D-4A-01 (APPROVED):** Adopt **A1 — Full Canonical Normalization**. Future register flow will create an **account-scoped trial subscription** immediately; restaurants inherit entitlements and never own commercial records.

**Compatibility strategy:** **Reject A2 and A3.** No long-term dual model. Transitional fallbacks (F-W1-01–04) remain only until register migration ships; they are **not** the target architecture.

**Handoff:** ASN-4B Wave A Migration Planning is ready.

---

## 2. Problem statement

### 2.1 Observed register behavior (current runtime)

```text
POST register (registerOwner.ts)
    ↓
User created
    ↓
Restaurant created (restaurantId = N)
    ↓
buildTrialSubscriptionForUser(userId, restaurantId=N)   ← scoped row
    ↓
INSERT userSubscriptions { userId, restaurantId: N, status: trial, planId: PRO }
```

Evidence: `server/auth-local/registerOwner.ts` L149–153 passes `restaurantId` into trial payload, not `0`.

### 2.2 Authority split after register

| Path | What it sees | Typical register outcome |
|------|--------------|--------------------------|
| **Canonical** `buildCommercialContextFromDb` → `pickUserLevelSubscription` | Account row only (`restaurantId = 0`) | **No row** → `plan: NONE` |
| **Legacy** `resolveOrderingSubscriptionRow(N, rows)` | Scoped row first | **Trial row** → ordering may be allowed |
| **Legacy** `isSubscriptionActive(userId)` | Any entitled row | **true** |
| **Wave 1** `resolveCanOrderRead` | `legacy \|\| features.ordering` | **true** (legacy leg) when plan NONE |
| **Wave 1** `resolveTrialStatusRead` | plan NONE + legacy fallback | **isActive: true** |

```text
getCommercialEntitlements(ownerId)
    ↓
plan = NONE
features.ordering = false
commercial.isTrial = false
```

Meanwhile legacy restaurant-scoped checks may still report **ordering allowed** and **trial active**.

### 2.3 Downstream ASN findings caused by this split

| Finding | Mechanism |
|---------|-----------|
| **TD-W1-01** | Context adapter ignores scoped rows |
| **F-W1-01–04** | Wave 1 parity fallbacks to legacy helpers |
| **`resolveCanOrderRead` OR logic** | Exposes account ordering when legacy false (F-3) |
| **`resolveTrialStatusRead` fallbacks** | `isSubscriptionActive` when plan NONE |
| **Client vs server trial UX** | Client NONE; server legacy APIs active |
| **F-3 ordering drift** | Hybrid read vs restaurant-scoped write on `order.create` |

Root cause: **register seeds restaurant-scoped commercial state** while **governance reads account-scoped state**.

---

## 3. Candidate strategies

### A1 — Full canonical normalization

**Description:** Registration creates **owner account trial subscription** (`restaurantId = 0`) in the same transaction. Restaurant is created as an operational entity only. All commercial authority flows through C-02 → C-04 immediately after signup.

**Model:**

```text
Owner Account
    ↓
Trial Subscription (account-scoped)
    ↓
Commercial Entitlements (TRIAL / features.ordering: true)
    ↓
Restaurant(s) inherit
```

| Criterion | Assessment |
|-----------|------------|
| ASN-2.5 compliance | ✅ Full |
| Simplicity | ✅ Single authority path |
| Future billing readiness | ✅ One subscription per owner spec |
| Authority consistency | ✅ No NONE-after-register gap |
| Technical debt | ✅ Eliminates F-W1 register fallbacks |
| Pre-launch suitability | ✅ Aligns with COMMERCIAL-AUTHORITY-SPEC |

**Implementation note (future, not ASN-4A):** Change `registerOwner` to call `buildTrialSubscriptionForUser(userId, 0)` or equivalent; order of operations may be **user → trial row → restaurant** to satisfy FK/transaction integrity.

---

### A2 — Transitional compatibility adapter

**Description:** Keep scoped trial insert; extend `buildCommercialContextFromDb` (or projection layer) to surface restaurant-scoped trial as account entitlements for read paths only.

| Criterion | Assessment |
|-----------|------------|
| ASN-2.5 compliance | ⚠️ Partial — dual truth |
| Simplicity | ⚠️ Extra projection rules |
| Future billing readiness | ⚠️ Scoped rows remain in DB |
| Authority consistency | ⚠️ Read vs write may still diverge |
| Technical debt | ⚠️ New shim + retirement work |
| Pre-launch suitability | ⚠️ Defers root fix |

**Status:** **REJECTED** as target strategy. May not be used as end-state.

---

### A3 — Long-term compatibility (dual model)

**Description:** Maintain restaurant-scoped and account-scoped models indefinitely with permanent fallbacks.

| Criterion | Assessment |
|-----------|------------|
| ASN-2.5 compliance | ❌ Violates D-01, D-05 |
| Simplicity | ❌ |
| Future billing readiness | ❌ |
| Authority consistency | ❌ Perpetual drift risk |
| Technical debt | ❌ |
| Pre-launch suitability | ❌ |

**Status:** **REJECTED.**

---

## 4. Evaluation matrix

| Criterion | A1 | A2 | A3 |
|-----------|----|----|-----|
| ASN-2.5 compliance | ✅ | ⚠️ | ❌ |
| Simplicity | ✅ | ⚠️ | ❌ |
| Future billing readiness | ✅ | ⚠️ | ❌ |
| Authority consistency | ✅ | ⚠️ | ❌ |
| Technical debt | ✅ | ⚠️ | ❌ |
| Pre-launch suitability | ✅ | ⚠️ | ❌ |

**Unanimous recommendation:** **A1**

---

## 5. Formal decision

### Decision D-4A-01 — Register path canonical strategy

**Status:** **APPROVED**

**Selected strategy:** **A1 — Full Canonical Normalization**

**Binding statements:**

1. Self-service register **must** create an **account-scoped** trial subscription (`restaurantId = 0`) as the canonical commercial record for new owners.
2. Restaurants **must not** receive restaurant-scoped trial rows on register in the target architecture.
3. `getCommercialEntitlements()` **must** return `plan: TRIAL` (or equivalent) immediately after successful register without legacy fallbacks.
4. Compatibility adapters (A2) **must not** be adopted as the long-term design.
5. Dual-model permanence (A3) **is prohibited** under ASN-2.5.

### Decision D-4A-02 — Compatibility strategy

**Status:** **APPROVED**

| Phase | Strategy |
|-------|----------|
| **Until register migration ships** | Existing F-W1 fallbacks remain **temporary**; documented debt only |
| **At register migration ship** | New owners get canonical rows; fallbacks not needed for greenfield path |
| **Existing scoped rows** | **Data migration program** (ASN-4C or billing-owned) — out of ASN-4A scope; plan only |

### Decision D-4A-03 — ASN-3 Wave A mitigation

**Status:** **APPROVED**

ASN-3 Wave A options A1/A2/A3 are **superseded** for greenfield logic:

- Wave A **must** use `getCommercialEntitlements` → `features.ordering` without relying on register-path legacy OR for **new** users post register migration.
- Pre-migration production may still have scoped rows; Wave A ships with **ordering alignment** (same helper for canOrder/create); register fix removes NONE-after-signup for new users.

---

## 6. Canonical register model (target)

### 6.1 Target transaction flow

```text
User Registers
    ↓
Owner Account Created (users)
    ↓
Trial Subscription Created
    • userId = owner
    • restaurantId = 0          ← account-scoped
    • status = trial
    • planId → PROFESSIONAL (via resolveTrialPlanId)
    • trialEndsAt / currentPeriodEnd = +14 days
    ↓
Restaurant Created
    • userId = owner
    • no commercial fields
    ↓
CommercialContext (immediate)
    ↓
plan = TRIAL
features.ordering = true
commercial.isTrial = true
    ↓
All gates / UI / guest ordering use same entitlements
```

### 6.2 Invariants (post-migration)

| Invariant | Rule |
|-----------|------|
| **I-1** | Every new self-service owner has ≥1 account-level subscription row after register |
| **I-2** | `pickUserLevelSubscription` returns trial row for new register users |
| **I-3** | `getCommercialEntitlements` never returns NONE solely because of register timing |
| **I-4** | No register code path passes `restaurantId > 0` to trial builder |
| **I-5** | Restaurant entity has zero subscription ownership semantics |

### 6.3 What restaurants own (unchanged)

Menu, tables, hours, closure, branding values, operational settings — **not** subscriptions, plans, or entitlements.

---

## 7. Migration impact on ASN waves

| Wave | Impact of D-4A-01 |
|------|-------------------|
| **A — Ordering alignment** | **Simplified.** New users: `features.ordering` true at signup; no legacy OR needed for greenfield. Single helper sufficient. |
| **B — Mutation gates** | **Simplified.** New owners see TRIAL entitlements; template/color/font visibility matches server immediately. |
| **C — Legacy ordering retirement** | **Accelerated.** Fewer owners depend on `resolveOrderingSubscriptionRow` for ordering. |
| **D — Limit normalization** | **Aligned.** TRIAL limits = PROFESSIONAL per matrix; account context sees trial from day one. |
| **E — Transitional removal** | **Feasible.** F-W1-01/03 register fallbacks removable once migration + backfill strategy defined. |
| **F — Legacy deletion** | **Simplified.** Reduced long-term consumers of scoped-first ordering chain. |

### ASN-3 E.0 scope adapter

**Status:** **CANCELLED** as primary path. D-4A-01 removes the need for restaurant-trial → account projection in `buildCommercialContextFromDb`.

Optional **read-only backfill** for **existing** scoped rows may still be needed short-term during data migration (see §8).

---

## 8. Existing data strategy (planning only)

ASN-4A does **not** implement migration. Direction for a future **ASN-4C / billing program**:

| Cohort | Description | Planned handling |
|--------|-------------|----------------|
| **Greenfield** | New registrations after register migration | Account-scoped trial only (A1) |
| **Legacy scoped** | Owners with `restaurantId > 0` trial and no account row | One-time promotion: insert or re-scope to `restaurantId = 0` **or** merge into canonical row |
| **Multi-restaurant owners** | Account row + optional legacy scoped rows | Canonical row wins; scoped rows archived or ignored for authority |

**Billing boundary:** Row promotion/re-scope touches **subscription lifecycle** — requires billing program approval separate from ASN-4A decision. ASN waves must not silently rewrite production subscription rows without that approval.

---

## 9. Future implementation outline (ASN-4B — not executed here)

### 9.1 Register flow changes (target files)

| File | Planned change |
|------|----------------|
| `server/auth-local/registerOwner.ts` | Trial insert with `restaurantId: 0`; consider user → trial → restaurant order |
| `server/create-trial-subscription.ts` | Document default `restaurantId = 0` as canonical; deprecate scoped register usage |
| Tests | Register integration: assert `getCommercialEntitlements` → TRIAL after register |

### 9.2 Verification (ASN-4B)

| Check | Expected |
|-------|----------|
| Post-register `commercial.getEntitlements` | `plan: TRIAL`, `features.ordering: true` |
| Post-register `order.canOrder` | Aligns with Wave A helper (no legacy-only true) |
| Post-register client trial banner | `isTrialActiveForMessaging` true |
| No new scoped trial rows | `restaurantId = 0` on insert |

### 9.3 Rollback (ASN-4B)

Revert register transaction to scoped trial insert; canonical entitlements return to NONE for new users until re-deploy.

---

## 10. Non-goals (ASN-4A)

ASN-4A does **not**:

| Non-goal | Status |
|----------|--------|
| Change billing logic | ✅ Not in scope |
| Change pricing / plans | ✅ Not in scope |
| Change invoices / payments | ✅ Not in scope |
| Implement register migration | ✅ ASN-4B |
| Backfill existing scoped rows | ✅ ASN-4C / billing |
| Modify CommercialContext code | ✅ Future wave |
| Ship Wave A ordering fix | ✅ ASN-4B |

---

## 11. Relationship to COMMERCIAL-AUTHORITY-SPEC

| Spec rule | A1 satisfaction |
|-----------|-----------------|
| §1 Owner-centric hierarchy | ✅ Trial on owner account |
| §4 One owner / one active commercial subscription | ✅ Single account trial row at register |
| §9 Trial = PROFESSIONAL + TRIAL status | ✅ Unchanged plan semantics |
| §16 Restaurants inherit rights | ✅ No restaurant subscription |
| §2 Forbidden restaurant-scoped authority | ✅ Removed at source (register) |

---

## 12. Success criteria

| Criterion | Status |
|-----------|--------|
| Register-path ambiguity resolved | ✅ §2–§5 |
| Canonical strategy selected | ✅ D-4A-01 A1 |
| Future migration direction defined | ✅ §6, §9 |
| Compatibility strategy decided | ✅ D-4A-02 (reject A2/A3) |
| No runtime changes | ✅ |

---

## 13. Approval record

| Decision | ID | Status |
|----------|-----|--------|
| Register path canonical strategy | D-4A-01 | **APPROVED — A1** |
| Compatibility strategy | D-4A-02 | **APPROVED — temporary fallbacks only until migration** |
| Wave A mitigation superseded | D-4A-03 | **APPROVED** |

---

## 14. Handoff

| Next phase | Ready | Scope |
|------------|-------|-------|
| **ASN-4B** | ✅ | Wave A migration planning + register canonical implementation plan |
| **ASN-4C** | Pending | Legacy scoped-row data migration (billing-gated) |
| **ASN-3 Waves B–F** | Unblocked | Proceed per ASN-3 after 4B ordering + register plan sequenced |

**Recommended sequence:**

```text
1. ASN-4B — Register canonical implementation plan + Wave A ordering helper (parallel design)
2. Ship register migration (billing-approved) before or with Wave A production
3. ASN-3 Waves B → C → D → E → F per dependency matrix
4. ASN-4C — Legacy row backfill
```

---

*ASN-4A Register Path Canonical Strategy complete. No code modified.*
