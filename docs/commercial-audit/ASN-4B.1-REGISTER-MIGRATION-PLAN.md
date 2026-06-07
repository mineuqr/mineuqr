# ASN-4B.1 — Register Migration Planning

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-4B.1 — Register path migration plan  
**Date:** 2026-06-07  
**Status:** Complete — planning only, no runtime changes  

**Mode:** Migration design for ASN-4A D-4A-01 (A1 Full Canonical Normalization). No code, schema, data migration, or billing changes in this phase.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `ASN-2-AUTHORITY-SOURCE-INVENTORY.md`
- `ASN-2.5-AUTHORITY-CANONICALIZATION-DECISION.md`
- `ASN-3-NORMALIZATION-DESIGN.md`
- `ASN-4A-REGISTER-PATH-CANONICAL-STRATEGY.md`

**Governing decisions:** D-02, D-04, D-05, **D-4A-01**

---

## 1. Executive summary

This plan migrates **self-service registration** from restaurant-scoped trial creation to **account-scoped trial creation** (`restaurantId = 0`), so `CommercialContext` immediately sees `plan: TRIAL` without F-W1 fallbacks.

| Item | Decision |
|------|----------|
| **Target** | Trial on owner account; restaurant is operational only |
| **Recommended rollout** | **R1 — Hard cutover** for new registrations (code change only) |
| **Legacy rows** | **KEEP** until ASN-4C backfill; separate program |
| **Transaction order** | User → account trial → restaurant (recommended) |
| **Schema change** | **None required** (`restaurantId = 0` already valid) |

**Handoff:** ASN-4B.2 Wave A Ordering Alignment Planning is ready.

---

## 2. Deliverable 2 — Registration flow audit (current state)

### 2.1 Entry point

| Step | Location | Detail |
|------|----------|--------|
| HTTP | `POST /api/auth/register` | `server/auth-local.ts` L157–194 |
| Rate limit | `checkRateLimit(register:email)` | Burst + per-email |
| Body parse | `parseRegisterBody()` | `server/auth-local/registerOwner.ts` L59–96 |
| Orchestrator | `registerLocalOwner()` | L174–215 |
| Transaction | `registerOwnerTransactional()` | L98–172 |

### 2.2 Current runtime chain (exact)

```text
POST /api/auth/register
    ↓
parseRegisterBody(req.body)
    ↓
registerLocalOwner(req, res, input)
    ↓
registerOwnerTransactional(input)
    │
    ├─ getUserByEmail → duplicate check
    ├─ getDb().transaction:
    │     1. INSERT users (openId, email, passwordHash, role: user)
    │     2. INSERT restaurants (userId, slug, nameAr, …)
    │     3. buildTrialSubscriptionForUser(userId, restaurantId)   ← SCOPED
    │     4. INSERT userSubscriptions (trialPayload)
    │     return { userId, openId, restaurantId }
    │
    ├─ sdk.createSessionToken + setSessionCookie
    ├─ sendVerificationEmailForUser
    └─ return { user, openId, restaurantId, verificationEmailSent }
```

**Trial builder:** `server/create-trial-subscription.ts`

- `resolveTrialPlanId()` → Professional plan (sortOrder 2, excludes 30001)
- `buildTrialSubscriptionPayload(userId, planId, restaurantId)` → 14-day trial fields
- Register passes **actual `restaurantId`**, not `0`

### 2.3 Commercial visibility after register (first session)

| Checkpoint | When | Chain | Register-path result |
|------------|------|-------|----------------------|
| **CommercialContext** | First `commercial.getEntitlements` | `buildCommercialContextFromDb(userId)` → `pickUserLevelSubscription(rows where restaurantId=0)` | **No row** → `subscription: null` |
| **Entitlements** | Same query | `resolveCommercialEntitlements` | **`plan: NONE`**, `features.ordering: false`, `commercial.isTrial: false` |
| **Legacy trial** | `checkTrialStatus` | `resolveTrialStatusRead` → F-W1-01 `isSubscriptionActive` | **`isActive: true`** (any-row entitled) |
| **Legacy ordering** | `order.canOrder` | `resolveCanOrderRead` → F-W1-03 `restaurantAllowsTableOrdering` | **`canOrder: true`** (scoped row) |
| **Legacy ordering write** | `order.create` | `restaurantAllowsTableOrdering` only | May **deny** if account PRO + expired scoped row (F-3 class) |

```text
CommercialContext visibility point:
    getCommercialEntitlements(userId)
        → buildCommercialContextFromDb(userId)
        → pickUserLevelSubscription()  [restaurantId === 0 ONLY]
        → plan = NONE (for typical new register user)
```

### 2.4 Secondary register consumers (post-transaction)

| Consumer | Trigger | Authority used |
|----------|---------|----------------|
| Client redirect / dashboard | Session cookie set | Eventually `useCommercialEntitlements` → NONE |
| Pricing trial banner | Client mount | `isTrialActiveForMessaging` → false until account row |
| Guest menu ordering | QR scan | `order.canOrder` hybrid → often true via legacy |
| Ops log | `authOpsLog` | Metadata `restaurantId` only (non-commercial) |

### 2.5 Root cause summary

Register inserts **`userSubscriptions.restaurantId = N`** while governance reads **`restaurantId = 0` only**. Authority ambiguity is **seeded at insert time**, not at read time.

---

## 3. Deliverable 3 — Migration design (target state)

### 3.1 Target runtime chain

```text
POST /api/auth/register
    ↓
parseRegisterBody
    ↓
registerOwnerTransactional
    │
    ├─ duplicate / DB checks (unchanged)
    ├─ db.transaction:
    │     1. INSERT users
    │     2. buildTrialSubscriptionForUser(userId, 0)   ← ACCOUNT-SCOPED
    │     3. INSERT userSubscriptions (restaurantId: 0)
    │     4. INSERT restaurants (userId, …)
    │     return { userId, openId, restaurantId }
    │
    ├─ session + verification email (unchanged)
    └─ return RegisterOwnerResult
```

**Recommended execution order:** **User → Trial (0) → Restaurant**

| Order | Rationale |
|-------|-----------|
| User first | Trial and restaurant both require `userId` |
| Trial before restaurant | Commercial authority exists before operational entity; matches ASN-4A narrative; trial row does not reference `restaurants.id` |
| Restaurant last | Pure operational record; inherits entitlements |

**Alternative (minimal diff):** Keep user → restaurant → trial but pass `0` instead of `restaurantId`. Functionally equivalent for authority; weaker semantic ordering. ASN-4B.2 may choose minimal diff vs canonical order.

### 3.2 Ownership model

| Entity | Owns commercial authority? | Post-migration |
|--------|---------------------------|----------------|
| `users` | Account identity | Yes (owner) |
| `userSubscriptions` (restaurantId=0) | Trial/plan/status | Yes (persistence) |
| `CommercialContext` / Entitlements | Derived truth | Yes (runtime) |
| `restaurants` | Menu, tables, hours, etc. | **No** commercial ownership |

### 3.3 Trial payload (unchanged semantics)

| Field | Value |
|-------|-------|
| `userId` | New owner |
| `restaurantId` | **`0`** |
| `planId` | From `resolveTrialPlanId()` (Professional) |
| `status` | `trial` |
| `trialEndsAt` / `currentPeriodEnd` | +14 days |
| `billingCycle` | `monthly` |

No plan, pricing, or trial duration changes (D-09 / ASN-4A non-goals).

### 3.4 Post-register entitlement expectation

```text
getCommercialEntitlements(userId)
    ↓
plan = TRIAL
features.ordering = true
commercial.isTrial = true
limits = PLAN_LIMITS.TRIAL (= PROFESSIONAL)
```

**Optional post-transaction assertion (ASN-4B.2 implementation):** Dev-only or test-only call to verify entitlements ≠ NONE before returning 200.

### 3.5 Failure handling (design)

| Failure point | Behavior | Rollback |
|---------------|----------|----------|
| User insert fails | Transaction aborts | None committed |
| Trial insert fails | Transaction aborts | No user orphan if single TX |
| Restaurant insert fails | Transaction aborts | User + trial rolled back |
| Session/email after TX | Outside transaction | User exists with trial; retry email acceptable |
| Entitlements NONE after TX | **Defect** — block deploy | Roll back code change |

**Invariant:** Registration must remain **atomic** for user + trial + restaurant within one DB transaction.

### 3.6 Files in scope (implementation phase — not executed here)

| File | Planned change |
|------|----------------|
| `server/auth-local/registerOwner.ts` | Trial `restaurantId: 0`; reorder steps if canonical order chosen |
| `server/create-trial-subscription.ts` | Comment/default: register must use `0`; deprecate scoped register |
| `server/auth-local.register.test.ts` | Assert trial payload uses `restaurantId: 0` |
| New integration test | Post-register entitlements TRIAL |
| `server/commercial/wave1ReadAuthority.parity.test.ts` | Update register-path scenarios post-migration |

**Out of scope for register migration:** `buildCommercialContextFromDb`, billing webhooks, admin trial creation paths (unless they also pass scoped id — audit separately).

---

## 4. Deliverable 4 — Impact assessment

### 4.1 Direct impact

| Area | Change | Risk |
|------|--------|------|
| **Registration transaction** | Trial scope `N → 0`; optional reorder | **CRITICAL** |
| **Trial creation** | `buildTrialSubscriptionForUser(userId, 0)` | **HIGH** |
| **CommercialContext** | Immediately sees account trial row | **CRITICAL** (positive) |
| **Entitlements** | `plan: TRIAL` for new users | **CRITICAL** (positive) |
| **F-W1-01/03 register fallbacks** | Unnecessary for greenfield new users | **HIGH** (enables E removal) |

### 4.2 Indirect impact

| Area | Expected delta | Risk |
|------|----------------|------|
| **Ordering (`order.canOrder` / `create`)** | Aligns with `features.ordering` for new owners | **CRITICAL** |
| **Trial banners (Pricing, Dashboard)** | `isTrialActiveForMessaging` true post-register | **HIGH** |
| **Dashboard plan visibility** | Canonical plan TRIAL vs NONE | **HIGH** |
| **Feature visibility (client)** | Full TRIAL matrix features visible | **HIGH** |
| **`subscription.checkTrialStatus`** | May align without NONE fallback for new users | **MEDIUM** |
| **CommercialDiagnostics** | Shows TRIAL entitlements | **LOW** |
| **Admin KPIs / revenue** | New row is trial — no revenue change | **LOW** |
| **Guest ordering on new restaurant** | Enabled via entitlements path | **HIGH** |
| **Wave A ordering helper** | Simplified for post-migration cohort | **HIGH** |

### 4.3 Unaffected (explicit)

| Area | Reason |
|------|--------|
| Billing / checkout / webhooks | No change to activation or planId semantics |
| Existing owners with scoped rows | KEEP until ASN-4C |
| `subscription.getByRestaurant` | Still reads scoped rows for legacy display |
| Restaurant operational data | Same insert payload |
| Schema | `restaurantId` already `int notNull`; `0` valid |

### 4.4 Test impact

| Suite | Action |
|-------|--------|
| `auth-local.register.test.ts` | Extend beyond `parseRegisterBody` |
| `getCommercialEntitlements.test.ts` | Add register integration scenario |
| `wave1ReadAuthority.parity.test.ts` | Register-path cases become account-path |
| `create-trial-subscription.test.ts` | Document `0` as canonical default |

---

## 5. Deliverable 5 — Legacy data strategy (planning only)

### 5.1 Categories

| Category | Description | Disposition | Program |
|----------|-------------|-------------|---------|
| **Existing production owners** | Registered before cutover; may have scoped trial only | **KEEP** → **MIGRATE** (ASN-4C) | Data backfill |
| **Existing admin accounts** | `role: admin`; resolver ADMIN | **KEEP** | No register change |
| **Existing test accounts** | Dev/staging scoped rows | **KEEP** or **MIGRATE** in test DB refresh | Team choice |
| **Restaurant-scoped trials** | `restaurantId > 0`, no account row | **MIGRATE** to `restaurantId: 0` or merge | ASN-4C |
| **Account-level rows** | `restaurantId = 0` | **KEEP** | Already canonical |
| **Orphaned subscription rows** | `userId` missing or invalid restaurant | **KEEP** (audit) → **DELETE** after review | Manual ops |
| **Duplicate rows** | Scoped + account for same owner | **MIGRATE** → single canonical pick | ASN-4C merge rules |

### 5.2 ASN-4C backfill design direction (not executed)

| Strategy | Action |
|----------|--------|
| **Promote** | INSERT account-level trial/active row copying scoped row dates/plan |
| **Re-scope** | UPDATE `restaurantId` from N → 0 where safe and single row |
| **Archive** | Mark scoped row inactive after promotion (billing approval) |

**Rule:** No automatic DELETE of scoped rows in production without billing sign-off.

### 5.3 Greenfield vs legacy cohort

| Cohort | Register migration | Entitlements |
|--------|-------------------|--------------|
| **New users (post-cutover)** | Account trial only | TRIAL without fallbacks |
| **Legacy users (pre-cutover)** | Unchanged rows | F-W1 fallbacks until ASN-4C |

---

## 6. Deliverable 6 — Migration options analysis

### Option R1 — Hard cutover (recommended)

**Description:** Deploy register code change; all **new** registrations get `restaurantId = 0`. Existing data untouched.

| Dimension | Assessment |
|-----------|------------|
| **Risk** | LOW for new users; legacy cohort unchanged |
| **Complexity** | LOW — single transaction change |
| **Rollback** | EASY — revert deploy |
| **ASN-2.5 alignment** | FULL for greenfield |
| **Billing touch** | None (same trial semantics, different scope column) |

**Recommended:** **YES** — primary strategy for ASN-4B implementation.

---

### Option R2 — Dual-write transition

**Description:** Insert both account-level and restaurant-scoped trial rows during transition.

| Dimension | Assessment |
|-----------|------------|
| **Risk** | HIGH — duplicate subscription rows, activation ambiguity |
| **Complexity** | HIGH — merge rules, webhook targeting |
| **Rollback** | HARD — which row is truth? |
| **ASN-2.5 alignment** | PARTIAL — perpetuates dual authority |
| **Billing touch** | HIGH — violates D-09 spirit |

**Recommended:** **NO** — rejected per D-4A-02 (no A2 adapter pattern).

---

### Option R3 — Backfill-first migration

**Description:** Migrate all existing scoped rows to account-level **before** changing register code.

| Dimension | Assessment |
|-----------|------------|
| **Risk** | MEDIUM on data migration; LOW on register change after |
| **Complexity** | HIGH — production data script, verification |
| **Rollback** | HARD for data; EASY for register code |
| **ASN-2.5 alignment** | FULL after backfill |
| **Billing touch** | HIGH — requires billing program |

**Recommended:** **YES for legacy cohort** as **ASN-4C**, **not** as prerequisite for register cutover. Register R1 can ship first; R3 runs in parallel for old users.

---

### Selected strategy

| Scope | Option |
|-------|--------|
| **New registration (ASN-4B.2)** | **R1 — Hard cutover** |
| **Existing data (ASN-4C)** | **R3 — Backfill-first** (separate phase) |

---

## 7. Deliverable 7 — Rollback strategy

### 7.1 Pre-migration rollback

| Action | When |
|--------|------|
| Do not deploy register change | Stakeholder hold |
| Feature flag `ASN_REGISTER_ACCOUNT_TRIAL=0` (optional ASN-4B.2) | Default off until verified in staging |

No data rollback needed — no migration executed pre-deploy.

### 7.2 Runtime rollback

| Trigger | Action |
|---------|--------|
| New registrations get NONE entitlements | Immediate revert register commit |
| Trial insert failures spike | Revert + investigate TX order |
| Guest ordering broken for new restaurants | Coordinate with Wave A rollback |

**Rollback procedure (design):**

1. Revert `registerOwner.ts` to pass `restaurantId` to trial builder.
2. Redeploy previous build.
3. Users registered during bad window: manual ops or ASN-4C fix (insert account row).

**Users registered during good window:** KEEP account rows (canonical); do not re-scope to restaurant.

### 7.3 Post-migration rollback

| Scenario | Action |
|----------|--------|
| Code reverted after successful cutover | New users again get scoped rows; entitlements NONE returns for greenfield |
| ASN-4C backfill applied | **Do not** auto-revert data without billing playbook |

---

## 8. Deliverable 8 — Success criteria

Registration is **normalized for greenfield** when all hold:

```text
New User (post-cutover)
    ↓
INSERT userSubscriptions (restaurantId = 0, status = trial)
    ↓
getCommercialEntitlements(userId)
    ↓
plan = TRIAL  (plan != NONE)
```

**Without requiring:**

| Removed dependency | Verification |
|--------------------|--------------|
| F-W1-01 `isSubscriptionActive` fallback | New user: `checkTrialStatus` true from context plan alone |
| F-W1-03 `restaurantAllowsTableOrdering` for canOrder | New user: `canOrder` from `features.ordering` |
| Restaurant-scoped authority for new rows | Grep: no register path passes `restaurantId > 0` to trial builder |
| Compatibility projection adapter | No `buildCommercialContextFromDb` scoped-row hack |

### Measurable checks (ASN-4B.2 implementation)

| # | Check |
|---|-------|
| 1 | Integration test: register → `getCommercialEntitlements` → `plan === "TRIAL"` |
| 2 | Integration test: `features.ordering === true` for new owner |
| 3 | Integration test: `commercial.isTrial === true` |
| 4 | DB assertion: last register insert has `user_subscriptions.restaurant_id = 0` |
| 5 | Client E2E (optional): trial banner visible after register |
| 6 | No new scoped trial rows in staging over 48h soak |

### Program-level success (with ASN-4C)

Legacy cohort also satisfies `plan != NONE` when entitled, via backfill — tracked separately in ASN-4C.

---

## 9. Decision constraints compliance

| Constraint | Compliance |
|------------|------------|
| **D-02** Single source of truth | ✅ Account trial visible to C-02 immediately |
| **D-04** Transitional sources | ✅ F-W1 remains for legacy only; not for greenfield post-cutover |
| **D-05** Legacy retirement | ✅ Stops seeding L-04 at register |
| **D-4A-01** Full canonical normalization | ✅ R1 implements A1 |
| **D-09** Billing boundary | ✅ Same trial plan/duration; no webhook/checkout change |

---

## 10. Relationship to ASN-3 waves

| Wave | Dependency on register migration |
|------|----------------------------------|
| **A — Ordering** | Strongly recommended **before or with** R1 deploy for new-user correctness |
| **B — Mutation gates** | Benefits immediately after R1 |
| **C — Legacy ordering retire** | Legacy cohort still needs scoped path until ASN-4C |
| **E — Shim removal** | F-W1 register fallbacks removable for greenfield after R1 + A |
| **F — Legacy delete** | Unaffected by R1 alone |

**Suggested deploy bundle:**

```text
ASN-4B.2: Register R1 + Wave A ordering helper (same release train)
ASN-4C: Legacy backfill (later, billing-gated)
```

---

## 11. Forbidden actions confirmation

| Action | Status |
|--------|--------|
| Change registration code | **Not in 4B.1** |
| Schema / data migration | **Not in 4B.1** |
| Billing / pricing / plans | **Not in 4B.1** |

---

## 12. ASN-4B.1 success criteria

| Criterion | Status |
|-----------|--------|
| Current registration flow traced | ✅ §2 |
| Target flow documented | ✅ §3 |
| Legacy strategy documented | ✅ §5 |
| Migration option selected | ✅ §6 — R1 + ASN-4C R3 |
| Rollback strategy documented | ✅ §7 |
| Impact assessment completed | ✅ §4 |

---

## 13. Handoff

| Next phase | Ready | Deliverables |
|------------|-------|--------------|
| **ASN-4B.2** | ✅ | Wave A ordering alignment + register implementation checklist |
| **ASN-4C** | Pending | Legacy scoped-row backfill plan (billing-gated) |

---

*ASN-4B.1 Register Migration Planning complete. No code modified.*
