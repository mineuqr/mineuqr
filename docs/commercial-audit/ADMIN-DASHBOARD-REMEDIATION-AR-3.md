# ADMIN DASHBOARD REMEDIATION — AR-3 — Commercial Authority Migration Strategy

**Program:** Admin Dashboard Remediation (AR)  
**Phase:** AR-3 — Commercial authority migration strategy  
**Date:** 2026-06-08  
**Status:** Complete — migration design only  

**Mode:** Strategy and migration specification only. No code changes, schema changes, database writes, backfill execution, or cleanup execution.

**Upstream:**

| Document | Role |
|----------|------|
| DATA-INTEGRITY-1 (Phase E / 1R) | Launch DB verified baseline |
| ADA-0 / ADA-1 | Dual-authority inventory and screen drift |
| AR-2 | Canonical commercial authority specification |
| ASN-4C | Legacy backfill cohorts (R3-C hybrid) |
| ASN-5A | Environment-specific data reality |

**Approved canonical model (AR-2):**

```text
Owner Account → Account Subscription (restaurantId = 0) → Plan → Commercial Entitlements
```

**Launch database reality (`gateway01` / `mineuqr`, verified 2026-06-08):**

| Metric | Count |
|--------|------:|
| Account-scoped subscriptions (`restaurantId = 0`) | **0** |
| Restaurant-scoped subscriptions (`restaurantId > 0`) | **4** |
| Owners with scoped-only subs | **2** (users `1`, `14760004`) |
| Owners with account row | **0** |

**Current runtime classification:**

```text
Dual Authority Runtime
```

**Migration target:**

```text
Single Authority Runtime
```

---

## 1. Executive Recommendation

Proceed with a **phased, parity-validated migration**. Do **not** replace legacy authority systems in a single cutover.

```text
Observation (M1)
  ↓
Canonical Read Adoption (M2)
  ↓
Authority Comparison (M3)
  ↓
Account Subscription Backfill (M4)
  ↓
Consumer Migration (M5)
  ↓
Legacy Deprecation (M6)
  ↓
Legacy Removal (M7)
```

| Principle | Implication |
|-----------|-------------|
| Truth first | Backfill account rows before retiring scoped authority |
| Code second | Wire consumers to S1 after data exists |
| Cleanup last | Remove S2/S3/S5 only after parity gates pass |
| Launch safety | Bounded launch dataset allows low-risk pilot; parity gates still mandatory |

**Classification:**

```text
READY FOR FUTURE IMPLEMENTATION
LOW-RISK MIGRATION PATH
```

Launch can proceed **without** completing migration if operators accept temporary dual authority (DATA-INTEGRITY-1 Phase E). Migration is **required** before admin dashboard commercial truth aligns with owner entitlements and ordering gates.

---

## 2. Deliverable 1 — Migration Principles (AR-3.1)

### 2.1 Rule 1 — Truth First, Code Second, Cleanup Last

| Order | Activity | Rationale |
|-------|----------|-----------|
| 1 | **Truth** — account-scoped subscription rows exist per owner | S1 returns meaningful state |
| 2 | **Code** — consumers read `getCommercialEntitlements` | Dashboards align to truth |
| 3 | **Cleanup** — deprecate S2/S3/S5 paths | No orphan legacy reads |

**Forbidden:** Removing scoped rows or legacy resolvers before account rows exist and parity is verified.

### 2.2 Rule 2 — No destructive migration until canonical authority validated

| Gate | Requirement |
|------|-------------|
| Pre-backfill | M1 inventory + M3 drift report baseline |
| Post-backfill | M3 parity pass per owner before scoped retirement |
| Pre-removal | M7 eligibility checklist (§10) |

**Destructive actions** (scoped row delete, resolver deletion, fallback removal) require explicit sign-off at each gate.

### 2.3 Rule 3 — Launch safety over architectural purity

| Acceptable during migration | Not acceptable at launch-complete |
|-----------------------------|----------------------------------|
| Dual-read (legacy + canonical) | Permanent competing truths on admin UI |
| Scoped rows retained as non-authoritative history | Scoped rows driving entitlements |
| MRR temporarily dual-reported (legacy vs canonical) | Undocumented MRR source |
| Test-user legacy clutter | Production owner with `plan: NONE` while scoped `active` |

**Launch DB note:** Only **2 users**, **4 scoped subs** — migration risk is **low** but **architecturally mandatory** for commercial coherence.

### 2.4 Rule 4 — Temporary backward compatibility

During M2–M5:

| Layer | Compatibility posture |
|-------|----------------------|
| Owner ordering | May read S1; legacy fallbacks remain until M6 |
| Admin dashboard | May show **dual columns** (legacy vs canonical) during M3 |
| Webhooks / billing | Target row ids unchanged until H-E reconciliation |
| New registrations | Already R1 — account trial `restaurantId = 0` (ASN-5) |

Backward compatibility is **time-boxed** — not a permanent dual-authority architecture.

---

## 3. Deliverable 2 — Current State Assessment (AR-3.2)

### 3.1 Strategy runtime map

| Strategy | Selector | Status today | Future (AR-2) |
|----------|----------|--------------|---------------|
| **S1** | `pickUserLevelSubscription` | **Canonical** — entitlements, guest ordering | **CANONICAL** |
| **S2** | `getSubscriptionForRestaurant` | **Active legacy** — admin scoped CRUD, `getByRestaurant` | **REMOVE** |
| **S3** | `resolveOrderingSubscriptionRow` | **Active legacy** — limits, restaurant list | **REMOVE** |
| **S4** | `pickCanonicalSubscription(all scopes)` | **Transitional** — invoice, activation | **MIGRATE → S1** |
| **S5** | `Array.find` | **Invalid** — admin user list | **REMOVE** |
| **S6** | Raw all rows | **Analytics legacy** — MRR, statistics | **DERIVED ONLY** |

### 3.2 Dual-authority symptoms (launch DB)

| Owner | S1 truth (`getCommercialEntitlements`) | Legacy truth (S2/S3/S6) | Impact |
|-------|----------------------------------------|-------------------------|--------|
| **User 1** (`admin`) | `plan: ADMIN` (role bypass) | Scoped BASIC `active` on 720007 | Admin metrics see scoped row; entitlements bypass subs |
| **User 14760004** (`user`) | `plan: NONE` | 3× scoped `active` (2 BASIC, 1 PRO) | Owner UI NONE; admin MRR counts 3 rows; ordering may differ |

### 3.3 Launch subscription inventory (DATA-INTEGRITY-1 Phase E)

| Sub ID | Owner | restaurantId | Status | Plan | Cohort hint |
|--------|-------|-------------|--------|------|-------------|
| 600001 | 1 | 720007 | `active` | BASIC | **H-A** (single scoped) |
| 600002 | 14760004 | 720006 | `active` | PROFESSIONAL | **H-C** (multi-scoped) |
| 630001 | 14760004 | 720003 | `active` | BASIC | **H-C** |
| 630002 | 14760004 | 720005 | `active` | BASIC | **H-C** |

| Additional fact | Detail |
|-----------------|--------|
| Invoices | **1** total — billing linkage review required (**H-E** check) |
| Restaurant without sub | **720002** (R2) — not fixed by subscription backfill alone |
| Orphan / owner mismatch | **0** |

### 3.4 Consumer inventory (migration input for M1)

#### S1 consumers (preserve / extend)

| Consumer | Location |
|----------|----------|
| `getCommercialEntitlements` | `server/commercial/getCommercialEntitlements.ts` |
| `buildCommercialContextFromDb` | `server/commercial/buildCommercialContextFromDb.ts` |
| `resolveGuestOrderingAllowed` | `server/commercial/guestOrderingAuthority.ts` |
| `commercial.getEntitlements` | `server/commercial/router.ts` |
| Owner dashboard feature gates | `Dashboard.tsx` → `useCommercialFeatureVisibility` |
| Commercial diagnostics | `/commercial/diagnostics` |

#### S2–S6 consumers (migrate / deprecate)

| Priority | Strategy | Key consumers |
|----------|----------|---------------|
| P1 | S2, S3 | `subscription.getByRestaurant`, `resolvePlanLimitsForUser`, legacy ordering fallbacks |
| P2 | S3, S5 | `AdminManagement.tsx` restaurants + users panels |
| P3 | S6 | `getAdminStatistics`, `computeAdminMrr`, `Statistics.tsx` |
| P4 | S6 | `getRevenueByMonth`, `getSubscriptionDetails` |
| P5 | S2–S4 | `getCanonicalUserSubscription`, `admin.createRestaurantSubscription`, `wave1ReadAuthority` fallbacks |

Full register: ADA-0 §2, ADA-1 §3, ASN-4C §2.3.

---

## 4. Deliverable 3 — Migration Phases (AR-3.3)

### Phase M1 — Observation

**Goal:** Measure impact before changing behavior.

| Action | Output |
|--------|--------|
| Inventory S1 consumers | §3.4 baseline |
| Inventory S2–S6 consumers | Procedure → strategy map (ADA-1 §3.1) |
| Record subscription selection paths | ASN-4C read path register R-01–R-23 |
| Record metrics dependencies | MRR trace (ADA-1 §6) |
| Run ASN-4C discovery queries (§3.1) per target environment | Cohort assignment H-A–H-E |
| Capture readonly snapshot | Row-level backup reference before any future write |

**Behavior changes:** **None**

**Exit criteria:** Migration inventory document signed off; launch DB cohorts assigned.

---

### Phase M2 — Canonical Read Layer

**Goal:** Introduce canonical read model everywhere **without** removing legacy.

| Action | Specification |
|--------|---------------|
| New dashboard work | **Must** call `getCommercialEntitlements(ownerId)` for commercial columns |
| Server read facade | Add admin-facing `getCommercialEntitlementsForOwners(ids[])` (design only — batch canonical read) |
| Dual-read mode | Admin UI may show `canonicalPlan` alongside `legacyPlan` during M3 |
| Legacy paths | Remain operational for mutations and unchanged screens |

**Output:** Dual-read environment specification.

**Behavior changes:** Additive reads only; legacy writes unchanged.

**Exit criteria:** All new commercial UI designs reference S1; no new S2–S6 consumers introduced.

---

### Phase M3 — Authority Comparison

**Goal:** Detect differences before data migration and after each subsequent phase.

For **every owner** `O`:

```text
legacyTruth(O)  =  f(S2, S3, S4, S5, S6) — documented per consumer
canonicalTruth(O) = getCommercialEntitlements(O)
```

| Report field | Comparison |
|--------------|------------|
| Plan | `legacy.plan` vs `canonical.plan` |
| Status | `legacy.status` vs `canonical.status` |
| Entitlements | Feature flags diff |
| Trial | Trial end / trial active mismatch |
| MRR contribution | Legacy row sum vs canonical owner unit |

**Output:** Authority drift report (per owner, per environment).

**Launch DB expected pre-M4 findings:**

| Owner | Expected mismatch |
|-------|-------------------|
| 1 | Admin bypass masks S1 NONE; legacy shows BASIC scoped |
| 14760004 | Canonical NONE vs legacy 3× active scoped |

**Behavior changes:** **None** (read-only comparison job / script spec).

**Exit criteria:** Drift report baseline stored; post-M4 re-run shows reduced mismatch count.

---

### Phase M4 — Account Subscription Backfill

**Goal:** Create account-level subscription records without deleting legacy rows.

**Strategy:** **ASN-4C R3-C Hybrid** (approved planning baseline).

| Cohort | Condition | Action |
|--------|-----------|--------|
| **H-A** | Exactly one scoped row; no account row; valid restaurant ownership | **R3-A** — in-place `restaurantId → 0` |
| **H-B** | Account row exists + scoped rows | **R3-B** — reconcile; retire scoped to `expired` |
| **H-C** | Multiple scoped; no account row | **R3-B** — INSERT account row; retire scoped |
| **H-D** | Orphan / owner mismatch | **Manual** — do not auto-migrate |
| **H-E** | Stripe ids or invoice FK on scoped row | **R3-B** + billing reconciliation |

**Launch DB cohort assignment (pre-execution plan):**

| Owner | Cohort | Planned action |
|-------|--------|----------------|
| **User 1** | **H-A** (single scoped 600001) → verify **H-E** if invoice links to 600001 | R3-A if billing-clear; else R3-B with invoice re-link |
| **User 14760004** | **H-C** (3 scoped, no account) | R3-B — create account row from merge rules (§5); retire 600002, 630001, 630002 to `expired` |

**Invariants during M4:**

| Rule | Requirement |
|------|-------------|
| No legacy deletion | Scoped rows **retired** (`expired`) or left in place — not hard-deleted if billing artifacts |
| No webhook logic change | Until H-E complete |
| Idempotent design | Re-run safe via existence check on account row |

**Output:** Canonical subscription inventory — at least one account row per entitled owner.

**Behavior changes:** **Data writes only** (future execution); application code still dual-path until M5.

**Exit criteria:** `pickUserLevelSubscription` returns entitled row for each production owner; M3 parity improved.

---

### Phase M5 — Consumer Migration

**Goal:** Rewire product consumers from legacy strategies to S1.

**Priority order (normative):**

#### P1 — Commercial authority consumers

| Consumer | From | To |
|----------|------|-----|
| Subscription displays (owner) | S4 `getCurrentSubscription` | S1 |
| Entitlement checks | S3 limits, `isSubscriptionActive` | S1 entitlements |
| Ordering gates | Legacy fallbacks in `wave1ReadAuthority` | `resolveGuestOrderingAllowed` only |
| Trial status API | `resolveTrialStatusRead` fallback | S1 only |

**Launch impact:** User 14760004 ordering and feature gates activate after M4 + P1.

#### P2 — Admin dashboard

| Consumer | From | To |
|----------|------|-----|
| Users commercial columns | S5 | `truth(user.id)` per row |
| Restaurant commercial columns | S3 scoped badge | `truth(restaurant.userId)` |
| Subscription modals | S2 scoped create | Account-scoped admin writes |
| KPI strip (non-MRR) | S3+S6 client merge | Server canonical fields |

#### P3 — Metrics

| Consumer | From | To |
|----------|------|-----|
| MRR / ARR | S6 row sum | Canonical per-owner aggregation (AR-2 §6) |
| Subscriber counts | S6 row count | Count owners by `truth(O).status` |
| Plan distribution | S6 row group | Group by `truth(O).plan` |
| Trial counts | S3/S5/S6 mixed | `truth(O).status === trial` |

**Launch DB note:** Test user MRR expected to **decrease** from 3× scoped to 1× owner — **correct**, not regression.

#### P4 — Reports

| Consumer | From | To |
|----------|------|-----|
| `getRevenueByMonth` | S6 `createdAt` buckets | Canonical-derived or relabeled infra |
| `getSubscriptionDetails` | S6 flat list | Owner-centric canonical list |
| Invoice PDF | S4 pick | S1 |

#### P5 — Legacy utilities

| Consumer | Action |
|----------|--------|
| `getAllRestaurantsWithSubscriptions` | Venues + owner canonical sub |
| `subscription.getByRestaurant` | Deprecate or show account sub copy |
| `admin.createRestaurantSubscription` | Disable scoped creates |

**Exit criteria:** ADA-1 screen map re-run → admin commercial surfaces on S1.

---

### Phase M6 — Legacy Deprecation

**Goal:** Disable legacy authority paths; mark transitional paths deprecated.

| Strategy | Action |
|----------|--------|
| **S2** | **Disable** — return errors or redirect to account APIs |
| **S3** | **Disable** — limits/ordering use S1 only |
| **S5** | **Disable** — remove `find()` pick |
| **S4** | **Deprecated** — warn in logs; migrate stragglers |
| **S6** | **Retain** — infrastructure analysis only; label non-product |

| Legacy component | Deprecation action |
|------------------|-------------------|
| `resolveOrderingSubscriptionRow` | No new callers |
| `restaurantAllowsTableOrdering` | Remove (ASN-4C E-04) |
| `resolveTrialStatusRead` fallback | Remove branch |
| `admin.createRestaurantSubscription` | Block scoped inserts |
| `computeAdminKPIs` client merge | Remove — server KPIs only |

**Exit criteria:** No product path invokes S2/S3/S5; S6 endpoints documented as infra-only.

---

### Phase M7 — Legacy Removal

**Goal:** Delete legacy code paths after parity verification.

**Eligibility (all required):**

| # | Gate |
|---|------|
| 1 | M3 authority parity — zero unintended owner mismatches |
| 2 | MRR canonical vs legacy reconciled (explained deltas documented) |
| 3 | Dashboard parity — all commercial screens agree per owner |
| 4 | Ordering parity — guest order gates match pre-migration entitled state |
| 5 | Billing parity — invoices/webhooks target account rows (H-E) |
| 6 | Restaurant delete invariant verified (§8) |
| 7 | Launch readiness gate (§10) — all 10 criteria pass |

**Removal scope:** S2/S3/S5 functions, dual-read UI, deprecated fallbacks (ASN-4C §6 retirement map E-01–E-14).

**Not in M7:** Raw SQL audit scripts (S6 infra).

---

## 5. Deliverable 4 — Backfill Strategy (AR-3.4)

### 5.1 Problem statement

An owner may have **multiple restaurant-scoped subscriptions**. Canonical model allows **one account subscription** per owner.

```text
Multiple scoped rows  →  One account row (restaurantId = 0)
```

### 5.2 Approved mechanical strategy

**Primary:** ASN-4C **R3-C Hybrid** (§4 M4).

**Per-cohort mechanics:**

| Cohort | Mechanism |
|--------|-----------|
| H-A | `UPDATE user_subscriptions SET restaurantId = 0 WHERE id = ?` (single row) |
| H-C | `INSERT` new account row; `UPDATE` scoped rows `status = 'expired'` |
| H-E | `INSERT` account row; re-link `invoices.subscriptionId`; preserve Stripe ids per billing sign-off |

### 5.3 Account row selection rules (pre-execution specification)

When consolidating multiple scoped rows into one account subscription, apply **in order**:

| Priority | Rule | Source |
|----------|------|--------|
| **BR-01** | Pick among scoped candidates using `pickCanonicalSubscription(all scoped for owner)` | `server/subscriptionResolver.ts` — entitled rank → period end → id |
| **BR-02** | Copy **status**, **planId**, **billingCycle**, period timestamps, Stripe fields from winning row | Preserve billing linkage |
| **BR-03** | Set `restaurantId = 0` on resulting account row | ASN account scope |
| **BR-04** | Retire non-winning scoped rows to `expired` (do not hard-delete if invoice FK) | Audit trail |

### 5.4 Implementation decisions (deferred — answer before M4 execution)

When BR-01 yields a tie or under-represents commercial intent:

| Question | Options | Launch DB relevance |
|----------|---------|---------------------|
| **Highest plan?** | Prefer highest catalog tier (e.g. PROFESSIONAL > BASIC) when multiple entitled `active` | **User 14760004** — 1 PRO + 2 BASIC |
| **Newest plan?** | Prefer latest `currentPeriodStart` or `createdAt` | Tie-break if tiers equal |
| **Active plan precedence?** | `active` beats `trial` beats `expired` | Already in `subscriptionCanonicalRank` |
| **Paid plan precedence?** | Row with `stripeSubscriptionId` wins | H-E rows |

**AR-3 recommendation for implementation decision:**

```text
BR-01 (pickCanonicalSubscription)
  then if planId differs among entitled active peers:
    BR-04a — prefer highest subscription_plans tier (price / feature rank)
  then BR-02 copy fields from winner
```

For **user 14760004**, expected account row: **PROFESSIONAL** / `active` sourced from sub **600002** (pending M4 verification run).

### 5.5 Post-backfill invariant

```text
At most ONE entitled account-scoped row per owner
Scoped rows: absent OR retired (non-entitled)
pickUserLevelSubscription(ownerRows) → deterministic single winner
```

### 5.6 Rollback specification

| Cohort | Rollback |
|--------|----------|
| H-A (R3-A) | Restore `restaurantId` from pre-M4 snapshot |
| H-C (R3-B) | Delete inserted account row; restore scoped `status` from snapshot |
| H-E | Billing-led rollback — requires invoice/Stripe reconciliation |

**Requirement:** Readonly snapshot + row-level backup before first M4 write.

### 5.7 Out of scope for backfill

| Item | Handling |
|------|----------|
| Restaurant **720002** without subscription (R2) | Separate ops — not subscription consolidation |
| Test user / venue cleanup | Optional post-migration; not required for authority parity |
| Admin `role: admin` bypass | AR-1 — disentangle from commercial metrics separately |

---

## 6. Deliverable 5 — Metrics Migration Rules (AR-3.5)

### 6.1 Unit of account change

| Model | Formula |
|-------|---------|
| **Current (invalid product truth)** | One subscription row = one MRR unit |
| **Target** | One owner = one MRR unit |

### 6.2 Canonical metric derivation

```text
payingOwners = { O | truth(O).status = active }
MRR = Σ monthlyEquivalent(truth(O).planPrice) for O in payingOwners
ARR = 12 × MRR (monthly catalog) or sum annual equivalents
trialOwners = { O | truth(O).status = trial }
planMix = GROUP BY truth(O).plan
```

### 6.3 Migration-period reporting

During M3–M5, operators may run **dual metrics**:

| Metric | Label |
|--------|-------|
| `mrr_canonical` | Product truth (S1-derived) |
| `mrr_legacy_raw` | Infrastructure (S6) — **not for product decisions** |

**Launch DB expected delta:**

| Owner | Legacy S6 contribution | Canonical contribution |
|-------|------------------------|------------------------|
| 1 | 1× BASIC active | 1× BASIC (post-backfill) or ADMIN excluded from MRR |
| 14760004 | 3× active rows | 1× PROFESSIONAL (post-merge) |

### 6.4 Admin role handling (metrics)

| Rule | Specification |
|------|---------------|
| Platform `admin` users | Exclude from subscriber/MRR counts **or** report in separate operator bucket — **implementation choice**; must not use scoped rows as commercial truth |

---

## 7. Deliverable 6 — Trial Migration Rules (AR-3.6)

### 7.1 Target authority

```text
trialState(O) = getCommercialEntitlements(O).status === 'trial'
trialEnd(O)   = canonical context period fields
```

### 7.2 Legacy fallback handling

| Path | Migration action |
|------|------------------|
| `resolveTrialStatusRead` → `isSubscriptionActive` when `plan === NONE` | **M6:** remove fallback |
| Scoped row `status = trial` | **Ignored** after M4 |
| Client trial badges from S3/S5/S6 | **M5:** replace with S1 |

### 7.3 Launch DB note

No `trial` status rows on launch DB (4× `active`). Trial migration rules apply to **future environments** and **post-trial registrations**.

---

## 8. Deliverable 7 — Restaurant Authority Rules (AR-3.7)

### 8.1 Direction rule (unchanged from AR-2)

```text
Allowed:   Subscription → Restaurant → Features
Forbidden: Restaurant → Subscription
```

### 8.2 Delete restaurant invariant (migration completion requirement)

Deleting a **restaurant** must **not** alter:

| Invariant | Verification |
|-----------|--------------|
| Owner plan | `truth(O).plan` unchanged |
| Owner subscription row | Account row survives |
| Owner entitlements | `getCommercialEntitlements(O)` unchanged |
| Owner MRR contribution | Canonical MRR unchanged |

**Current gap:** `deleteRestaurantCascade` deletes **scoped** subscription rows — affects S2/S3/S6 displays and **violates** invariant if scoped rows remain authority source.

**Migration remedy:**

| Step | Action |
|------|--------|
| M4 | Account row holds commercial truth |
| M5 | Admin displays read `truth(ownerId)` not scoped row |
| M6 | Scoped row deletion becomes **non-authoritative** cleanup |
| M7 | Optional: stop deleting scoped rows on restaurant delete **or** ensure no entitled scoped rows exist |

### 8.3 Post-delete refresh rule

```text
restaurant.delete success
  → invalidate ALL commercial queries (not only restaurant list)
  → refetch canonical metrics atomically
```

---

## 9. Deliverable 8 — Deprecation Plan (AR-3.3 M6–M7 + strategy matrix)

### 9.1 Strategy lifecycle

| Strategy | M4 | M5 | M6 | M7 |
|----------|----|----|----|-----|
| S1 | Unchanged | **Primary** | **Only truth** | **Only truth** |
| S2 | Rows retired | Consumers migrated | **Disabled** | **Removed** |
| S3 | Rows retired | Consumers migrated | **Disabled** | **Removed** |
| S4 | N/A | Migrated to S1 | **Deprecated** | **Removed** |
| S5 | N/A | Migrated | **Disabled** | **Removed** |
| S6 | Dual-report | Product path off | **Infra only** | **Infra only** |

### 9.2 Legacy retirement map reference

ASN-4C §6 (E-01–E-14) defines removable layers after backfill + consumer migration:

| Wave | Examples |
|------|----------|
| Ordering | `restaurantAllowsTableOrdering`, F-W1-03/04 fallbacks |
| Resolvers | `resolveOrderingSubscriptionRow` |
| Admin | `getAllRestaurantsWithSubscriptions` scoped-first |
| Writes | `admin.createRestaurantSubscription` scoped insert |

**AR-3 sequencing:** M4 → M5 P1 (ordering) → M5 P2–P3 → M6 → M7.

### 9.3 Write path normalization

| Path | Current | Target |
|------|---------|--------|
| `registerOwner` | Account trial (R1 done) | ✓ |
| `admin.createRestaurantSubscription` | Scoped insert | **Block** — account only |
| `admin.createUserSubscriptionByAdmin` | Often scoped | Account `restaurantId = 0` only |
| Payment webhooks | May target scoped id | Target account row id post H-E |

---

## 10. Deliverable 9 — Launch Readiness Gate (AR-3.8)

Migration is **complete** when all criteria pass:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Canonical authority exists | `getCommercialEntitlements` returns entitled state for each production owner |
| 2 | Account subscriptions exist | `COUNT(restaurantId = 0) >= entitled owner count` |
| 3 | Dashboard uses canonical authority | ADA-1 remap — 0 commercial columns on S2–S5 |
| 4 | Metrics use canonical authority | MRR/subscriber endpoints use per-owner derivation |
| 5 | Ordering uses canonical authority | `resolveGuestOrderingAllowed` only — no legacy OR |
| 6 | Trial logic uses canonical authority | No `isSubscriptionActive` fallback |
| 7 | S2 removed from product paths | Code search + integration tests |
| 8 | S3 removed from product paths | Code search + integration tests |
| 9 | S5 removed | No `find()` subscription pick |
| 10 | Authority parity validated | M3 report — zero unexplained owner-level mismatches |

### 10.1 Launch-without-migration posture (explicit)

| Condition | Allowed? |
|-----------|----------|
| Launch with dual authority | **Yes** — with documented ops awareness (Phase E) |
| Launch claiming commercial coherence | **No** — until gates 1–6 minimum |
| Launch with admin dashboard as billing source of truth | **No** — until gates 3–4 |

### 10.2 Environment matrix

| Environment | Subscriptions | Migration urgency |
|-------------|---------------|-----------------|
| **MineuQR launch** (`mineuqr`) | 4 scoped, 0 account | **High** — owner NONE vs scoped active |
| **Monu legacy** (workspace `.env`) | 0 subs (ASN-5A) | **Low** — R1-ready empty |
| **Future production** | Per ASN-5A audit | Run M1 per environment |

---

## 11. Migration Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL AUTHORITY RUNTIME (today)                │
│  S1 entitlements ──► NONE (launch users)                       │
│  S2/S3/S6 ──► scoped active rows visible to admin               │
└────────────────────────────┬────────────────────────────────────┘
                             │ M1 Observation
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ M2 Dual-read: canonical + legacy columns (no behavior cutover) │
└────────────────────────────┬────────────────────────────────────┘
                             │ M3 Compare
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ M4 Backfill: R3-C hybrid → account rows (scoped retired)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ M3 Re-compare (parity)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ M5 Consumers: P1 ordering → P2 admin → P3 metrics → P4/P5      │
└────────────────────────────┬────────────────────────────────────┘
                             │ M6 Deprecate S2/S3/S5
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ M7 Remove legacy ──► SINGLE AUTHORITY RUNTIME                  │
│   truth(O) = getCommercialEntitlements(O)  ∀ product paths     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. AR Program Sequence (updated)

| Phase | Document | Status |
|-------|----------|--------|
| AR-1 | Super Admin hard boundary | Complete |
| AR-2 | Canonical commercial authority spec | Complete |
| **AR-3** | **Migration strategy (this doc)** | **Complete** |
| AR-4 | Implementation plan — server read/metrics APIs | Future |
| AR-5 | Implementation plan — admin dashboard rebuild | Future |
| AR-6 | M4 backfill execution + verification runbook | Future |
| AR-7 | M6/M7 legacy removal execution | Future |

---

## 13. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Migration Principles | §2 |
| 2 | Current State Assessment | §3 |
| 3 | Migration Phases | §4 |
| 4 | Backfill Strategy | §5 |
| 5 | Metrics Migration Rules | §6 |
| 6 | Trial Migration Rules | §7 |
| 7 | Deprecation Plan | §9 |
| 8 | Launch Readiness Gate | §10 |
| 9 | Executive Recommendation | §1 |

---

## 14. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-REMEDIATION-AR-2.md` | Canonical target state |
| `ASN-4C-LEGACY-SUBSCRIPTION-BACKFILL-PLAN.md` | Cohort mechanics R3-C |
| `ADMIN-DASHBOARD-AUDIT-ADA-0.md` | S1–S6 discovery |
| `ADMIN-DASHBOARD-AUDIT-ADA-1.md` | Consumer migration targets |
| `DATA-INTEGRITY-1-AUDIT.md` Phase E | Launch DB legacy inventory |
| `ASN-5A-COMMERCIAL-DATA-REALITY-AUDIT.md` | Per-environment audit protocol |

---

```text
READY FOR FUTURE IMPLEMENTATION
LOW-RISK MIGRATION PATH
```

*End of AR-3. Strategy and migration specification only. No code, schema, database writes, backfill, or cleanup execution.*
