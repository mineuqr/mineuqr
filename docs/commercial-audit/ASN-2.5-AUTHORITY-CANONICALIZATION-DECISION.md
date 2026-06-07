# ASN-2.5 — Authority Canonicalization Decision

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-2.5 — Formal architectural decision  
**Date:** 2026-06-07  
**Status:** **APPROVED** — decision only, no runtime changes  

**Mode:** Governance decision record. No migrations, hotfixes, refactors, or code modifications.

**Inputs:**

- `ASN-1-AUTHORITY-SCOPE-DISCOVERY.md`
- `ASN-2-AUTHORITY-SOURCE-INVENTORY.md`
- `COMMERCIAL-AUTHORITY-SPEC.md` (PG-1C.1A)
- `PLAN-FEATURE-MATRIX.md` / `src/lib/commercial/planFeatureMatrix.ts`
- `PLAN-ID-MAPPING.md` / `src/lib/commercial/planIdMapping.ts`
- `PG-1C.2E-COMMERCIAL-CONTEXT-INTEGRATION.md`
- `PG-1C.4B-SERVER-GATE-MIGRATION-MATRIX.md`

**Evidence basis:** ASN-1 (38 authority paths), ASN-2 (24 sources, 72 consumers, 9 dependency chains), F-3 production incident (ordering read/write drift).

---

## 1. Executive decision summary

MineuQR adopts a **single account-scoped commercial authority model** aligned with `COMMERCIAL-AUTHORITY-SPEC.md`. All future ASN work (ASN-3+) must converge runtime behavior to this decision.

| Category | Count | Disposition |
|----------|------:|-------------|
| Canonical (retain) | 6 | **RETAIN** — govern all feature/limit decisions |
| Transitional (temporary) | 3 classes | **MIGRATE LATER** — bounded lifetime |
| Legacy (retire) | 6 classes | **RETIRE** — after consumer migration |
| Protected (billing) | 5 domains | **DO NOT MODIFY** in ASN scope |

**Immediate governance implication:** Any read/write pair using different commercial sources (e.g. `order.canOrder` vs `order.create`) is classified **CRITICAL authority drift** and must be remediated before further ASN waves ship.

---

## 2. Formal decisions (D-01 through D-10)

### Decision D-01 — Canonical commercial authority model

**Status:** **APPROVED**

The official MineuQR commercial authority model is:

```text
Owner Account
    ↓
Subscription
    ↓
Plan
    ↓
Commercial Entitlements
    ↓
Restaurants
```

**Binding rules:**

1. Commercial rights belong to the **owner account**.
2. Restaurants **inherit** commercial rights; they do not originate them.
3. Restaurants **do not own** subscriptions for feature authority purposes.
4. Restaurants **do not define** commercial authority.

**Rationale:** Matches `COMMERCIAL-AUTHORITY-SPEC.md` §1, §16. ASN-1 confirmed dual models (account vs restaurant-scoped) violate this hierarchy. F-3 demonstrated user impact when inheritance is not enforced at runtime.

**ASN-2 mapping:** Supersedes S-10, S-11, S-12, S-13, R-08 register-path semantics for **feature authority** (not restaurant operational data).

---

### Decision D-02 — Single source of truth

**Status:** **APPROVED**

The official commercial source-of-truth chain is:

```text
buildCommercialContextFromDb()
    ↓
pickUserLevelSubscription()          [restaurantId = 0 only]
    ↓
resolveCommercialEntitlements()
    ↓
CommercialEntitlements output
```

**Binding rules:**

1. All **commercial feature, limit, and flag decisions** must ultimately derive from this chain.
2. No parallel entitlement resolver may be introduced for feature authority.
3. `commercial.getEntitlements` / `useCommercialEntitlements` are the approved **read surfaces** for owner consumers.

**Runtime entry points (approved):**

| Layer | Function / API |
|-------|----------------|
| DB adapter | `server/commercial/buildCommercialContextFromDb.ts` |
| Row pick | `pickUserLevelSubscription()` in `subscriptionResolver.ts` |
| Pure resolver | `resolveCommercialEntitlements()` in `src/lib/commercial/` |
| Service | `getCommercialEntitlements()` in `server/commercial/` |
| tRPC | `commercial.getEntitlements` |
| Client | `useCommercialEntitlements` → `useCommercialFeatureVisibility` |

**Rationale:** PG-1C.2E established this chain as read-only foundation. ASN-2 shows it drives ~40% of decisions today; ASN-3+ must expand coverage without replacing the chain.

---

### Decision D-03 — Canonical sources (RETAIN)

**Status:** **APPROVED** — all entries **RETAIN**

| ID | Source | ASN-2 ID | Role |
|----|--------|----------|------|
| **C-01** | `CommercialContext` | S-01 | Normalized owner input to resolver |
| **C-02** | `buildCommercialContextFromDb()` | S-01 producer | Runtime DB → context adapter |
| **C-03** | `pickUserLevelSubscription()` | S-05 | Account-level canonical row selection |
| **C-04** | `resolveCommercialEntitlements()` | S-02 producer | Single entitlement computation |
| **C-05** | `PLAN-FEATURE-MATRIX` (`planFeatureMatrix.ts`) | S-03 | Feature and limit definitions |
| **C-06** | `PLAN-ID-MAPPING` (`planIdMapping.ts`) | S-04 | Implementation ID → catalog plan (adapter only) |

**Notes:**

- C-06 is canonical **only as an adapter** between persistence (`planId`) and catalog plans. Feature gates must not branch on raw `planId` after normalization (see D-06).
- C-03 explicitly **excludes** `restaurantId > 0` rows from owner authority. Scoped rows may exist in DB for billing history; they must not drive feature authority post-normalization.

---

### Decision D-04 — Transitional sources (MIGRATE LATER)

**Status:** **APPROVED** — temporary, not canonical, not permanent

| ID | Source | ASN-2 ID | Sunset condition |
|----|--------|----------|------------------|
| **T-01** | `resolveCanOrderRead()` | S-17 | Replaced by account `features.ordering` + unified guest ordering helper; F-3 remediated |
| **T-02** | Wave 1 read adapters (`resolveTrialStatusRead`, etc.) | S-18 | Legacy APIs deprecated or proxied to S-02; register-path scope fixed |
| **T-03** | PG-1C documented parity fallbacks (F-W1-01–F-W1-04) | H-* | Removed when subscription scope normalized in C-02 adapter |

**Binding rules:**

1. Transitional sources may **not** be extended with new consumers.
2. New commercial gates **must not** depend on transitional sources.
3. Each transitional source requires a **documented retirement ticket** in ASN-3+ before ASN program close.
4. T-01 `legacy || features.ordering` OR-combine is **explicitly non-canonical**; it exists only to preserve pre-4C parity during Wave 1.

**Maximum transitional lifetime:** Until ASN normalization waves complete and parity tests pass without fallbacks (target: post ASN-5 verification, defined in ASN-3).

---

### Decision D-05 — Legacy sources (RETIRE)

**Status:** **APPROVED** — **RETIRE** after migration; not deleted until zero consumers

| ID | Legacy source | ASN-2 ID | Retirement blocker |
|----|---------------|----------|-------------------|
| **L-01** | `resolveOrderingSubscriptionRow()` | S-10 | `order.create`, limits, ordering helpers |
| **L-02** | `getOrderingSubscriptionForRestaurant()` | S-10 wrapper | S-12 |
| **L-03** | `restaurantAllowsTableOrdering()` | S-12 | `order.create`, T-01 legacy leg |
| **L-04** | Restaurant-scoped subscription **ownership** for commercial decisions | S-11, R-08, scoped rows | Register path, admin display, activation scope |
| **L-05** | Direct `planId` **mutation gates** (`BASIC_FREE_PLAN_ID`, `plan.id === 30001`) | S-13, U-04 | Ordering, feature checks |
| **L-06** | `users.plan` or ad-hoc user fields for commercial decisions | — | None found active; **prohibited going forward** |

**Additional legacy classes (ASN-2 extension, same RETIRE status):**

| ID | Legacy source | ASN-2 ID |
|----|---------------|----------|
| **L-07** | `isSubscriptionActive()` coarse boolean for feature gates | S-15 |
| **L-08** | `resolveTableOrderingEntitlement()` for feature authority | S-13 |
| **L-09** | `resolvePlanLimitsForUser()` DB-row limits (non-resolver) | S-19 |
| **L-10** | `getFallbackBasicLimits()` shadow NONE tier | S-20 |
| **L-11** | `premiumTemplates` hardcoded list + S-15 server gate | S-24, S-15 |
| **L-12** | `ctx.user.role === "admin"` inline bypass (commercial) | S-23 |

**Retirement rule:** A legacy source may be removed only when ASN-2 consumer inventory shows **zero production consumers** for feature authority, or consumers are rewired to C-01–C-06 chain.

**L-04 clarification:** Restaurant-scoped **rows** may remain in `userSubscriptions` for **billing audit** until a separate billing program decides otherwise. L-04 retires **commercial authority** derived from those rows, not necessarily immediate row deletion.

---

### Decision D-06 — Commercial decision rule

**Status:** **APPROVED**

Commercial decisions must be based on:

```text
features.*     (e.g. features.ordering, features.templates)
limits.*       (e.g. limits.restaurants, limits.categories)
commercial.*   (e.g. commercial.isTrial, commercial.isAdmin, commercial.invoiceEligible)
```

**Not** based on:

```text
Raw plan IDs in feature logic
Restaurant subscription rows for feature authority
Restaurant-scoped commercial authority
Coarse subscription booleans (isSubscriptionActive)
Hardcoded template/plan lists for entitlement
```

**Approved decision patterns (post-normalization):**

```typescript
// ALLOWED
entitlements.features.ordering === true
entitlements.limits.restaurants
entitlements.commercial.isAdmin

// FORBIDDEN in feature gates
planId === 30001
resolveOrderingSubscriptionRow(...)
restaurantAllowsTableOrdering(...)
isSubscriptionActive(userId)  // as feature gate
```

**Mapping to spec:** COMMERCIAL-AUTHORITY-SPEC §12 Feature Authority, §13 Limit Authority.

---

### Decision D-07 — Mutation alignment rule

**Status:** **APPROVED**

Read and write operations for the same commercial capability **must** use identical commercial authority.

**Binding definition:**

```text
AUTHORITY DRIFT = two consumers of the same business capability
                  deriving commercial allow/deny from different sources
```

**Examples requiring alignment:**

| Capability | Read | Write | Required alignment |
|------------|------|-------|-------------------|
| Guest ordering | `order.canOrder` | `order.create` (entitlement portion) | Same ordering authority function |
| Templates | Client visibility | `restaurant.updateTemplate` | `features.templates` |
| Custom colors | Client visibility | `restaurant.updateCustomColors` | `features.customColors` |
| Custom fonts | Client visibility | `restaurant.updateCustomFonts` | `features.customFonts` |
| Restaurant capacity | *(optional read)* | `restaurant.create` | `limits.restaurants` |
| Category capacity | *(optional read)* | `category.create` | `limits.categories` |

**Exemption:** Operational write-only checks (restaurant hours, temporary closure, `isActive`, table validation) are **not** commercial authority and may remain write-only on mutations.

**F-3 precedent:** `order.canOrder` (T-01 hybrid) vs `order.create` (L-03) is the reference defect for this rule.

---

### Decision D-08 — Authority drift classification

**Status:** **APPROVED**

| Severity | Definition | Example | Response |
|----------|------------|---------|----------|
| **LOW** | Read-only display inconsistency; no mutation impact | Plan label fallback in PaymentHistory | Schedule in ASN backlog |
| **MEDIUM** | Admin/ops display or KPI inconsistency | `getByRestaurant` vs entitlements plan | Document; fix in analytics wave |
| **HIGH** | Feature access inconsistency (read vs write or client vs server) | Client shows custom colors; server denies mutation | Priority normalization wave |
| **CRITICAL** | Read/write divergence on same user action | `order.canOrder` true + `order.create` 403 | **Stop-ship** / hotfix candidate |

**Registered CRITICAL defects (as of ASN-2.5):**

| Defect | Source A | Source B | Classification |
|--------|----------|----------|----------------|
| F-3 ordering | T-01 / S-02 `features.ordering` | L-03 `restaurantAllowsTableOrdering` | **CRITICAL** |
| Template gate | S-02 client `features.templates` | S-15 server `isSubscriptionActive` | **HIGH** |
| Color/font gate | S-02 client `features.customColors/Fonts` | S-15 server | **HIGH** |

**Governance:** New CRITICAL drift may not be introduced during ASN program. HIGH drift requires wave plan before merge to `main`.

---

### Decision D-09 — Billing boundary

**Status:** **APPROVED**

Authority normalization **must not modify** the following domains within ASN program scope:

| Protected domain | Examples | ASN-2 sources |
|------------------|----------|---------------|
| **Billing** | Checkout sessions, plan catalog CRUD | S-31, A-10 |
| **Payments** | PayPal/Tap webhooks, activation writes | S-21, S-30, B-01 |
| **Revenue** | MRR, revenue-by-month aggregation | S-25, U-06 |
| **Invoices** | PDF generation, invoice eligibility writes | S-26, S-22 |
| **Trial lifecycle** | Trial row creation, 14-day Professional trial | S-32, U-08 |
| **Subscription lifecycle** | Status transitions, cancellation, admin CRUD | S-30, B-02 |

**Allowed in ASN without billing program approval:**

- Rewiring **feature gates** to read from C-01–C-06 instead of legacy sources.
- Read-only **observation** of billing rows through C-02 adapter (account-level pick).
- Documenting scope conflicts between activation (S-21) and context (C-02) — fix deferred to billing + ASN joint wave.

**Prohibited without separate billing program:**

- Changing webhook activation row selection logic.
- Changing `planId` semantics in PSP metadata.
- Merging or deleting subscription rows for billing audit.
- Altering trial duration, trial plan selection, or invoice generation rules.

**Rationale:** PG-1C.4B Wave 4 explicitly excludes billing from enforcement migration. ASN respects that boundary.

---

### Decision D-10 — Normalization target (end-state)

**Status:** **APPROVED**

End-state architecture:

```text
CommercialContext
        ↓
Commercial Entitlements
        ↓
Commercial Decisions (features / limits / flags)
        ↓
All consumers (server mutations, guest probes, client visibility)
```

**End-state properties:**

1. **No** restaurant-scoped commercial authority for features or limits.
2. **One** ordering authority: owner `features.ordering` resolved from account context.
3. **One** limit authority: `limits.*` from resolver (NONE → 0/0/0 per AD-1).
4. **One** admin bypass: `commercial.isAdmin` (not inline `role === "admin"`).
5. Guest ordering probe and guest order mutation call the **same** entitlement function.

**Restaurant entities retain ownership of (non-commercial):**

| Domain | Examples |
|--------|----------|
| Menu | Categories, items, images, pricing |
| Tables | Table numbers, QR assignments |
| Operating hours | `workingHours`, open/closed |
| Temporary closure | `temporaryClosure` |
| Restaurant settings | Name, slug, template selection, branding values |

These operational domains may gate **when** orders are accepted (hours/closure) but not **whether** the owner is entitled to ordering.

---

## 3. Source disposition matrix (consolidated)

| Disposition | Sources | Action |
|-------------|---------|--------|
| **RETAIN** | C-01–C-06 | Extend to all feature/limit consumers |
| **MIGRATE LATER** | T-01–T-03 | No new consumers; sunset per ASN-3 plan |
| **RETIRE** | L-01–L-12 | Rewire consumers → canonical chain → delete |
| **PROTECTED** | Billing/payment/revenue/invoice/lifecycle | Out of ASN mutation scope (D-09) |

---

## 4. ASN-2 source ID → decision mapping

| ASN-2 ID | Decision |
|----------|----------|
| S-01, S-02 | **C-01, C-04** — RETAIN |
| S-03 | **C-05** — RETAIN |
| S-04 | **C-06** — RETAIN |
| S-05 | **C-03** — RETAIN |
| S-06 | RETAIN (persistence); account-level reads only for authority |
| S-17, S-18 | **T-01, T-02** — MIGRATE LATER |
| S-10, S-11, S-12, S-13 | **L-01–L-03, L-05, L-08** — RETIRE |
| S-15, S-19, S-20, S-23, S-24 | **L-07, L-09–L-12** — RETIRE |
| S-21, S-30, S-31, S-32 | **D-09 PROTECTED** (billing boundary) |
| S-22, S-25, S-26 | Display/analytics; migrate read to S-02 where applicable; billing rules protected |

---

## 5. Implications for known conflicts

| ASN-1 conflict | Decision applied | ASN-3 action |
|--------------|------------------|--------------|
| C-01 F-3 `canOrder` vs `create` | D-07, D-08 CRITICAL | Unified ordering authority (first normalization wave) |
| C-02 entitlements vs legacy ordering | D-01, D-05 L-01–L-03 | Retire restaurant-scoped ordering chain |
| C-03 client vs server customization | D-06, D-07 HIGH | Server gates → `features.customColors/Fonts/templates` |
| C-04 register trial messaging | D-01, T-03 | Scope normalization in C-02 or register write path (billing-gated) |
| C-05 register scoped row | D-05 L-04 | Commercial authority ignores scoped rows |
| C-10 activation vs context | D-09 | Document; joint billing+ASN wave later |

---

## 6. Decision governance

### 6.1 Amendment process

Changes to D-01 through D-10 require:

1. Updated ASN decision document (revision bump).
2. Explicit impact on ASN-3+ wave plan.
3. Product sign-off if billing boundary (D-09) is affected.

### 6.2 Compliance test (future ASN waves)

A normalization change is **compliant** with ASN-2.5 only if:

- [ ] Commercial decision uses `features.*`, `limits.*`, or `commercial.*` from C-04.
- [ ] No new consumer of L-01–L-12 for feature authority.
- [ ] Read/write pairs pass alignment check (D-07).
- [ ] No CRITICAL drift introduced (D-08).
- [ ] Billing boundary respected (D-09).

### 6.3 Relationship to COMMERCIAL-AUTHORITY-SPEC

ASN-2.5 **operationalizes** the approved target spec for the ASN program. Where runtime today diverges, **the spec and this decision prevail** over legacy behavior. Legacy behavior is technical debt with a retirement schedule, not an alternate approved model.

---

## 7. Success criteria

| Criterion | Status |
|-----------|--------|
| Canonical source defined | ✅ D-01, D-02, D-03 |
| Legacy sources classified | ✅ D-05 (L-01–L-12) |
| Transitional sources classified | ✅ D-04 (T-01–T-03) |
| Drift definition established | ✅ D-07, D-08 |
| Billing boundary established | ✅ D-09 |
| End-state architecture approved | ✅ D-10 |
| No runtime changes | ✅ |

---

## 8. Handoff to ASN-3

**ASN-3 Normalization Design** is authorized to proceed with:

1. **Wave 0 / emergency alignment** — D-07 ordering read/write (F-3) without billing changes.
2. **Wave 1** — Server mutation gates: templates, colors, fonts → C-04 feature keys.
3. **Wave 2** — Guest ordering: retire L-01–L-03; single `features.ordering` path.
4. **Wave 3** — Limits: retire L-09, L-10; resolver `limits.*`.
5. **Wave 4** — Scope adapter expansion (C-02) + T-03 fallback removal (billing coordination).
6. **Wave 5** — Legacy source deletion + verification.

Priority order follows ASN-2 normalization ranking: **S-10 → S-12 → S-17** first for CRITICAL path.

---

## 9. Approval record

| Decision | ID | Status |
|----------|-----|--------|
| Canonical commercial authority model | D-01 | **APPROVED** |
| Single source of truth | D-02 | **APPROVED** |
| Canonical sources (RETAIN) | D-03 | **APPROVED** |
| Transitional sources (MIGRATE LATER) | D-04 | **APPROVED** |
| Legacy sources (RETIRE) | D-05 | **APPROVED** |
| Commercial decision rule | D-06 | **APPROVED** |
| Mutation alignment rule | D-07 | **APPROVED** |
| Authority drift classification | D-08 | **APPROVED** |
| Billing boundary | D-09 | **APPROVED** |
| Normalization target | D-10 | **APPROVED** |

---

*ASN-2.5 Canonicalization Decision complete. No code modified.*
