# ADMIN DASHBOARD REMEDIATION — AR-1 — Super Admin Hard Boundary

**Program:** Admin Dashboard Remediation (AR)  
**Phase:** AR-1 — Super Admin hard boundary (architecture definition)  
**Date:** 2026-06-08  
**Status:** Complete — design + audit only  

**Mode:** Architecture recommendation only. No implementation, schema changes, migrations, or code edits.

**Upstream audits:**

| Audit | Classification | Relevance to AR-1 |
|-------|----------------|-------------------|
| ADA-0 | **RED** (commercial authority coexistence) | Separate from role model; AR-1 does not resolve S1–S6 drift |
| ADA-1 | **RED** (dashboard reads non-canonical authorities) | Rebuild must consume explicit platform authority + canonical commercial reads |
| ADA-2 | **YELLOW** (role model overly simplified) | Primary input for AR-1 |

---

## 1. Executive Recommendation

MineuQR should adopt an **explicit platform authority layer** that is **orthogonal** to restaurant tenancy and subscription state.

### 1.1 Recommended direction (architecture only — not implementation)

**Prefer Option B (dedicated platform authority)** with a **phased enum migration** for ergonomics:

```text
users.role                    → tenant identity (user | staff future)
platform_authority (new)      → governance tier (none | operator | owner)
restaurant_membership (future)→ staff assignments per venue
```

**Rationale:**

| Factor | Option A (enum only) | Option B (authority layer) |
|--------|----------------------|----------------------------|
| Separates platform from tenant | Weak — single column overload | **Strong** — explicit field |
| Supports Layer 1 vs Layer 2 | Requires many enum values | **Natural** — `owner` vs `operator` |
| Staff layer (Layer 4) | Pollutes platform enum | **Clean** — separate membership table |
| Migration from today | `admin` → ambiguous | Map `admin` → `platform_authority` with tier |
| ASN / commercial alignment | Still conflates `role: admin` with `plan: ADMIN` | Allows disentangling over time |

**Do not implement yet.** AR-1 defines the contract; AR-2+ would cover schema, guards, and dashboard rebuild.

### 1.2 Success criteria mapping

| Criterion | AR-1 defines? |
|-----------|---------------|
| Platform authority explicit | **Yes** — Layer 1–2 via `platform_authority` |
| Restaurant authority isolated | **Yes** — Layer 3–4 never infer platform |
| Super Admin clearly modeled | **Yes** — Layer 1 Platform Owner (not a route alias) |
| Protected accounts server-side | **Yes** — expanded protection registry |
| Platform governance not accidental | **Yes** — promotion governance model |
| Stable foundation for dashboard rebuild | **Yes** — boundary matrix + access rules |

---

## 2. Deliverable 1 — Current Authority Assessment

### 2.1 Persisted model today

```text
users.role ∈ { user, admin }
restaurants.userId → tenant ownership
user_subscriptions → commercial rows (orthogonal; see ADA-0)
```

| Layer (conceptual) | Current representation | Gap |
|------------------|------------------------|-----|
| Platform Owner | `users.role = admin` + `PROTECTED_USER_IDS = [1]` | Not distinct from other admins |
| Platform Admin | `users.role = admin` | Same guard as owner |
| Restaurant Owner | `users.role = user` + owns restaurants | Correct tenant scope |
| Restaurant Staff | **Not modeled** | — |

### 2.2 Authorization today

| Check | Rule | Scope |
|-------|------|-------|
| `assertAdminAccess` | `ctx.user.role === "admin"` | All `admin.*`, duplicate `profile.*` admin ops |
| `assertRestaurantAccess` | `restaurant.userId === ctx.user.id` **OR** `role === admin` | Tenant + **admin superset** |
| `resolveCommercialEntitlements` | `role === admin` → `plan: ADMIN` | Commercial bypass parallel to platform role |
| `PROTECTED_USER_IDS` | Hardcoded `[1]` | Delete/demote/password reset only |

### 2.3 What works (retain)

| Property | Status |
|----------|--------|
| Backend blocks non-admin from `admin.*` | **Verified** (ADA-2) |
| Self-promotion blocked | **Verified** |
| User `1` server-side protection | **Verified** |
| Registration defaults to `user` | **Verified** |

### 2.4 What is insufficient (remediate in future AR phases)

| Gap | Risk |
|-----|------|
| Single `admin` role = full platform + cross-tenant restaurant | Accidental governance via one promotion |
| `/super-admin` is UI alias, not authority tier | False sense of elevated protection |
| Platform access inferred from `role: admin` only | No operator vs owner separation |
| Promotion: any admin → any admin | No governance tiers |
| `assertRestaurantAccess` admin bypass without platform tier check | Platform operators and owners identical |
| Commercial `plan: ADMIN` tied to `users.role` | Conflates entitlement with governance (ADA-0) |

### 2.5 Current classification (unchanged)

```text
YELLOW — authority model overly simplified; not a security failure
```

---

## 3. Deliverable 2 — Target Authority Model

Four **conceptual layers**. Future implementation must map each layer to **explicit persisted fields** — never infer from restaurant count, subscription rows, or commercial entitlements alone.

### 3.1 Layer 1 — Platform Owner

**Purpose:** Highest platform governance authority (equivalent to “Super Admin” in product language).

| Capability | Included |
|------------|----------|
| Platform governance | ✓ |
| System configuration | ✓ |
| Plan catalog governance | ✓ |
| Commercial authority policy management | ✓ |
| Admin / operator management | ✓ |
| Protected account policy | ✓ |
| Full platform dashboard + MRR | ✓ |
| Cross-tenant restaurant support | ✓ (explicit operator power, audited) |

| Restriction | Rule |
|-------------|------|
| Cannot be deleted | Server-enforced |
| Cannot be demoted | Server-enforced |
| Cannot lose platform authority via normal admin UI | Server-enforced |
| Cannot be created by Platform Admin promotion | Governance rule |

**Launch DB mapping (conceptual):** User `1` (protected primary operator) → **Platform Owner** candidate.

---

### 3.2 Layer 2 — Platform Admin

**Purpose:** Day-to-day platform operators (support, billing ops, onboarding).

| Capability | Included |
|------------|----------|
| Customer / user management | ✓ |
| Subscription management (platform tools) | ✓ |
| Restaurant management (support) | ✓ |
| Support notifications | ✓ |
| Commercial operations (non-policy) | ✓ |
| Platform dashboard + MRR | ✓ |

| Restriction | Rule |
|-------------|------|
| Cannot modify Platform Owner protections | ✓ |
| Cannot create Platform Owners | ✓ |
| Cannot demote Platform Owners | ✓ |
| Cannot change protected-account registry | ✓ |
| Promotion to Platform Admin | **Controlled** — only Platform Owner (or break-glass policy) |

---

### 3.3 Layer 3 — Restaurant Owner

**Purpose:** Tenant authority for owned venues.

| Capability | Included |
|------------|----------|
| Own restaurants (`restaurants.userId`) | ✓ |
| Account-scoped subscription self-service | ✓ (ASN canonical path) |
| Menu / category / item management | ✓ (own venues) |
| Orders / tables (own venues) | ✓ |
| Owner dashboard `/dashboard` | ✓ |
| Staff management | ✓ (future — invite staff) |

| Restriction | Rule |
|-------------|------|
| No `/admin` platform dashboard | ✓ |
| No `admin.*` procedures | ✓ |
| No MRR / cross-tenant user list | ✓ |
| No role promotion | ✓ |
| Platform authority | **`none`** — explicit |

**Critical rule:** Owning restaurants, holding scoped subscriptions, or having multiple venues **must not** grant platform access.

---

### 3.4 Layer 4 — Restaurant Staff

**Purpose:** Operational authority within assigned venue(s).

| Capability | Included |
|------------|----------|
| Assigned operational actions (orders, menu edits per policy) | ✓ (future scope) |

| Restriction | Rule |
|-------------|------|
| No subscription management | ✓ |
| No platform access | ✓ |
| No restaurant ownership transfer | ✓ |

**Note:** Not implemented today. AR-1 reserves the layer for future `restaurant_membership` without conflating with `users.role`.

---

### 3.5 Target authority diagram

```text
                    ┌─────────────────────────────┐
                    │   Layer 1: Platform Owner   │
                    │   platform_authority=owner  │
                    └──────────────┬──────────────┘
                                   │ governs
                    ┌──────────────▼──────────────┐
                    │   Layer 2: Platform Admin   │
                    │   platform_authority=operator│
                    └──────────────┬──────────────┘
                                   │ supports (no policy)
         ══════════════════════════╪══════════════════════════  HARD BOUNDARY
                                   │
                    ┌──────────────▼──────────────┐
                    │ Layer 3: Restaurant Owner   │
                    │ users.role=user, platform=none│
                    │ owns restaurants.userId     │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Layer 4: Restaurant Staff   │
                    │ restaurant_membership       │
                    └─────────────────────────────┘
```

---

## 4. Deliverable 3 — Boundary Rules (AR-1.2)

### 4.1 Non-inference rules (normative)

Platform authority **must never** be inferred from:

| Signal | Why forbidden |
|--------|---------------|
| Restaurant ownership | Tenant ≠ platform |
| Subscription ownership / `user_subscriptions` rows | Commercial ≠ governance (ADA-0) |
| Restaurant count | Volume ≠ operator status |
| Commercial status / entitlements / MRR contribution | Billing ≠ governance |
| `plan: ADMIN` entitlement | Entitlement bypass ≠ platform role |
| `ENV.ownerOpenId` alone (legacy) | Must map to explicit `platform_authority` |

### 4.2 Explicit grant rule

Platform access is granted **only** when:

```text
platform_authority ∈ { operator, owner }
```

(or interim migration equivalent — see §6).

### 4.3 Separation rules

| Rule ID | Statement |
|---------|-----------|
| **BR-01** | Tenant mutations use tenant guards only; platform tier must not be required for owner dashboard |
| **BR-02** | Platform mutations use platform guards only; restaurant ownership must not satisfy platform checks |
| **BR-03** | `assertRestaurantAccess` admin bypass must require `platform_authority >= operator`, not `users.role === admin` alone after migration |
| **BR-04** | Commercial entitlements (`getCommercialEntitlements`) must not set `plan: ADMIN` from platform governance; separate concern (future AR commercial alignment) |
| **BR-05** | Promotion to platform tiers requires auditable governance action with actor ≥ Platform Owner for owner-tier grants |
| **BR-06** | Frontend route visibility follows the same platform authority signal as backend (defense in depth) |

---

## 5. Deliverable 4 — Platform Access Rules (AR-1.3)

### 5.1 Platform surfaces

| Surface | Current guard | Target guard |
|---------|---------------|--------------|
| `/admin` | `role === admin` (UI) + `assertAdminAccess` | `platform_authority >= operator` |
| `/statistics` | Same | Same |
| `/users` (admin) | Same | Same |
| `/super-admin` | Same (misleading name) | **Platform Owner only** OR deprecated in favor of tiered `/admin` |
| `admin.*` (all procedures) | `assertAdminAccess` | `assertPlatformAccess(minTier)` per procedure |
| `superAdmin.*` (future namespace) | N/A | Owner-tier procedures only |

### 5.2 Procedure tiering (future design)

| Tier | Example procedures |
|------|-------------------|
| **Operator** | `listAllUsers`, `getStatistics`, subscription CRUD, notifications |
| **Owner** | `updateUserRole` (platform grants), protected-account policy, plan catalog write, operator promotion |

Today all procedures share one guard — **remediation splits by tier**.

### 5.3 Restaurant routes (unchanged principle)

| Surface | Guard |
|---------|-------|
| `/dashboard` | Authenticated tenant user |
| `restaurant.*`, `order.*` (owner ops) | `assertRestaurantAccess` **without** platform bypass unless `platform_authority >= operator` on support paths |

---

## 6. Deliverable 5 — Protected Account Model (AR-1.4)

### 6.1 Current state

| Mechanism | Scope |
|-----------|-------|
| `PROTECTED_USER_IDS = [1]` | Delete, role demote, password reset by other admins |

**Gaps:** No protection class metadata; no distinction between “protected user” and “platform owner”; promotion to admin not blocked for other IDs.

### 6.2 Target protected authority registry (server-side)

Minimum protection set:

| Class | Description | Example |
|-------|-------------|---------|
| **Platform Owner** | Highest tier; immutable demotion | User `1` on launch DB |
| **Primary Operator** | Break-glass backup operator; demotion requires Owner | Optional second account |

### 6.3 Protection rules (normative)

| Action | Platform Owner | Primary Operator |
|--------|----------------|------------------|
| Delete | **Deny** | **Deny** (or Owner-only break-glass) |
| Demote platform tier | **Deny** | **Deny** without Owner |
| Remove `platform_authority` | **Deny** | **Deny** without Owner |
| Password reset by other admin | **Deny** | Policy-controlled |
| Modify via normal admin workflows | **Deny** | **Deny** for tier changes |

### 6.4 Implementation shape (future — not executed)

Recommended registry fields (conceptual):

```text
protected_platform_accounts
  userId
  protectionClass: owner | primary_operator
  immutable: true
  createdAt
  createdByUserId
```

**Interim:** Retain `PROTECTED_USER_IDS` until migration; extend with `protectionClass` mapping for user `1` → Platform Owner.

---

## 7. Deliverable 6 — Promotion Governance Model (AR-1.5)

### 7.1 Current model (audit)

```text
Any admin
  → admin.updateUserRole / profile.updateUserRole
  → target.role ∈ { admin, user }
  → immediate full platform authority
```

| Question | Current answer |
|----------|----------------|
| Who may promote? | Any `role: admin` |
| Who may demote? | Any `role: admin` (except protected `1`, self) |
| Who may create platform admins? | Same — single step |
| Audit trail? | Ops logs only; no governance record table |
| Approval workflow? | **None** |

### 7.2 Target promotion model

Promotion becomes an **intentional governance action** with tier semantics:

| Action | Authorized actor | Target state | Audit |
|--------|------------------|--------------|-------|
| Grant **Platform Admin** (`operator`) | Platform Owner | `platform_authority = operator` | Required |
| Grant **Platform Owner** | Existing Owner only (or bootstrap) | `platform_authority = owner` + protected registry | Required + break-glass |
| Demote Platform Admin → tenant | Platform Owner | `platform_authority = none` | Required |
| Demote Platform Owner | **Forbidden** (except break-glass) | — | — |
| Restaurant owner → Platform Admin | Platform Owner explicit action | Never automatic | Required |

### 7.3 Demotion rules

| From | To | Who can execute |
|------|-----|-----------------|
| `operator` | `none` | Platform Owner |
| `operator` | `owner` | **Forbidden** — separate grant flow |
| `owner` | any | **Forbidden** (protected) |
| `user` (tenant) | `operator` | Platform Owner only — never self-service |

### 7.4 Deprecation of unsafe paths

| Current path | Target |
|--------------|--------|
| `updateUserRole({ role: "admin" })` | Replace with `grantPlatformAuthority({ tier })` |
| `updateUserRole({ role: "user" })` demotes platform | Replace with `revokePlatformAuthority` with tier checks |
| Duplicate `profile.updateUserRole` | Consolidate to single governance API |

---

## 8. Deliverable 7 — Super Admin Design Options (AR-1.6)

### 8.1 Option A — Extend `users.role` enum

```text
users.role ∈ { user, admin, super_admin, staff? }
```

| Pros | Cons |
|------|------|
| Single column; familiar migration from `admin` | Conflates platform tiers with tenant identity |
| Simple `assertAdminAccess` extension | Staff layer still needs another mechanism |
| Fastest short-term patch | `admin` vs `super_admin` does not model Restaurant Owner vs Staff |
| | Still tempted to infer from legacy `role === admin` everywhere |
| | Enum churn if tiers grow (support, billing-only, read-only ops) |

**Verdict:** Acceptable **interim** bridge; insufficient as long-term SaaS authority model.

---

### 8.2 Option B — Dedicated platform authority layer

```text
users.role              → tenant class (user | staff future)
users.platformAuthority → none | operator | owner
restaurant_memberships  → staff assignments (future)
```

| Pros | Cons |
|------|------|
| **Hard boundary** between platform and tenant | Requires schema + guard refactor |
| Layer 1 vs Layer 2 natural | Migration mapping for existing `admin` users |
| Staff layer independent | Two fields to keep in sync during transition |
| Aligns with ADA-0 commercial separation | Slightly more complex queries |
| Procedure tiering (`minTier: operator \| owner`) | |

**Verdict:** **Preferred** foundation for AR program and dashboard rebuild.

---

### 8.3 Option C — Hybrid (recommended migration path)

**Phase 1 (bridge):** Add `platform_authority` column; map `role === admin` → `operator` by default; user `1` → `owner`.

**Phase 2:** Replace `assertAdminAccess` with `assertPlatformAuthority(minTier)`.

**Phase 3:** Deprecate `users.role = admin`; `role` becomes tenant-only (`user` / `staff`).

**Phase 4:** Remove `/super-admin` route or restrict to `owner` tier only.

This avoids a big-bang enum swap while reaching Option B end state.

### 8.4 Decision status

| Decision | Status |
|----------|--------|
| Option A vs B final | **Deferred** — AR-1 recommends **Option B via Option C hybrid** |
| Implementation | **Out of scope** for AR-1 |
| Schema design detail | **AR-2** (future) |

---

## 9. Deliverable 8 — Boundary Matrix (AR-1.7)

Target-state matrix (after remediation). **✓** = allowed, **✗** = denied, **~** = limited/assigned, **C** = controlled (governance action required).

| Action | Platform Owner | Platform Admin | Restaurant Owner | Staff |
|--------|:--------------:|:--------------:|:----------------:|:-----:|
| Platform Dashboard (`/admin`) | ✓ | ✓ | ✗ | ✗ |
| MRR / platform analytics | ✓ | ✓ | ✗ | ✗ |
| Subscription governance (platform APIs) | ✓ | ✓ | ✗ | ✗ |
| Plan catalog governance (write) | ✓ | C (read-only operator) | ✗ | ✗ |
| Cross-tenant restaurant support | ✓ | ✓ | ✗ | ✗ |
| Own restaurant operations | ✓ | ✓ | ✓ | ~ |
| Owner dashboard `/dashboard` | ✓ | ✓ (if also tenant) | ✓ | ~ |
| Tenant subscription self-service | ✓ (if tenant) | ✓ (if tenant) | ✓ | ✗ |
| Staff management (future) | ✓ | ✓ (support) | ✓ (own venue) | ✗ |
| Platform Admin promotion | ✓ | ✗ | ✗ | ✗ |
| Platform Owner grant | ✓ (bootstrap/break-glass) | ✗ | ✗ | ✗ |
| Delete protected accounts | ✗ | ✗ | ✗ | ✗ |
| Delete non-protected users | ✓ | C | ✗ | ✗ |
| Modify protected accounts | ✗ (immutable) | ✗ | ✗ | ✗ |

---

## 10. Relationship to Commercial Authority (ADA-0 / ADA-1)

AR-1 addresses **governance role boundaries**. It does **not** replace ASN commercial canonicalization.

| Concern | AR-1 | Separate program |
|---------|------|------------------|
| Who sees `/admin` MRR? | Platform authority tier | — |
| How MRR is calculated (S6)? | — | ADA-1 / commercial AR |
| Subscription truth (S1)? | — | ASN backfill + dashboard read alignment |
| `plan: ADMIN` entitlement | Disentangle from `platform_authority` | Future commercial AR |

**Dashboard rebuild prerequisite:** Fix **both** governance boundaries (AR-1) and commercial read canonicalization (ADA-0/ADA-1).

---

## 11. Proposed AR Program Sequence (documentation roadmap)

| Phase | Scope | Implementation? |
|-------|-------|-----------------|
| **AR-1** (this doc) | Authority architecture | **No** |
| AR-2 | Schema + guard design spec | Design only |
| AR-3 | Migration + bootstrap mapping (`admin` → tiers) | Future |
| AR-4 | Dashboard rebuild authority wiring | Future |
| AR-5 | Commercial read alignment (S1 on admin UI) | Future |

---

## 12. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Current Authority Assessment | §2 |
| 2 | Target Authority Model | §3 |
| 3 | Boundary Rules | §4 |
| 4 | Protected Account Model | §6 |
| 5 | Promotion Governance Model | §7 |
| 6 | Super Admin Design Options | §8 |
| 7 | Boundary Matrix | §9 |
| 8 | Executive Recommendation | §1 |

---

## 13. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-AUDIT-ADA-0.md` | Commercial authority discovery |
| `ADMIN-DASHBOARD-AUDIT-ADA-1.md` | Per-screen authority strategies |
| `ADMIN-DASHBOARD-AUDIT-ADA-2.md` | Current role architecture |
| `ASN-FINAL-EXECUTIVE-REPORT.md` | Commercial canonical model |
| `DATA-INTEGRITY-1-AUDIT.md` Phase E1 | Protected user `1` on launch DB |

---

*End of AR-1. Architecture recommendation only. No implementation, migration, or code changes.*
