# ADMIN DASHBOARD REMEDIATION — AR-2 — Canonical Commercial Authority Specification

**Program:** Admin Dashboard Remediation (AR)  
**Phase:** AR-2 — Canonical commercial authority specification  
**Date:** 2026-06-08  
**Status:** Complete — architecture specification only  

**Mode:** Specification only. No code changes, schema changes, migrations, cleanup, or implementation.

**Upstream:**

| Document | Classification | Role in AR-2 |
|----------|----------------|--------------|
| DATA-INTEGRITY-1 | Launch DB verified | 0 account-scoped subs; 4 scoped legacy rows |
| ADA-0 | **RED** | Six strategies S1–S6 inventory |
| ADA-1 | **RED** | Per-screen drift mapping |
| ADA-2 | **YELLOW** | Role model (orthogonal to commercial) |
| AR-1 | Architecture approved | Platform governance boundary (separate concern) |

---

## 1. Executive Recommendation

### 1.1 Adopted commercial authority model

MineuQR shall adopt **one** commercial authority hierarchy as the permanent answer to *“What is the commercial truth?”*

```text
Owner Account (users.id)
  ↓
Account Subscription (user_subscriptions WHERE restaurantId = 0)
  ↓
Resolved Plan (subscription_plans via planId)
  ↓
Commercial Entitlements (resolveCommercialEntitlements + planFeatureMatrix)
  ↓
Restaurants (consume limits; do not define authority)
  ↓
Features (ordering, menu limits, etc.)
  ↓
Ordering (resolveGuestOrderingAllowed → entitlements.features.ordering)
```

**Official read facade:**

```text
getCommercialEntitlements(ownerId)
  → buildCommercialContextFromDb
  → pickUserLevelSubscription
  → resolveCommercialEntitlements
  → planFeatureMatrix
```

### 1.2 Normative rule

All dashboards, metrics, permissions, ordering gates, and subscription displays **must consume** this authority chain. They **may not** derive competing commercial state independently.

| Surface | Rule |
|---------|------|
| Owner dashboard | READ canonical (already S1) |
| Admin dashboard | READ canonical per owner — **rebuild required** |
| Guest ordering | READ canonical (already S1) |
| Platform metrics (MRR, ARR, counts) | DERIVE from canonical per owner |
| Trial status | READ canonical only |
| Restaurant limits | READ `entitlements.maxRestaurants` |

### 1.3 Classification

```text
ARCHITECTURE APPROVED
READY FOR FUTURE IMPLEMENTATION
```

Commercial authority fragmentation (ADA-0/ADA-1 **RED**) is **resolved at specification level**. Implementation remains future work (AR-3+).

### 1.4 Relationship to AR-1 (platform governance)

| Concern | AR-1 | AR-2 |
|---------|------|------|
| Who may access `/admin`? | `platform_authority` tier | — |
| What subscription state is true for owner X? | — | `getCommercialEntitlements(X)` |
| `role: admin` → `plan: ADMIN` bypass | Governance entitlement | **Disentangle** — not commercial truth for billing/MRR |

Platform operators may retain operational bypass for feature visibility; **commercial metrics and subscription displays** must not use role bypass as subscription truth.

---

## 2. Deliverable 1 — Canonical Commercial Hierarchy (AR-2.1)

### 2.1 Authority flow (normative)

Only this hierarchy may determine commercial state:

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — Owner Account                                     │
│   Identity: users.id                                        │
│   Scope: all commercial truth anchors here                  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Layer 2 — Subscription                                      │
│   Row: user_subscriptions WHERE restaurantId = 0            │
│   Selection: pickUserLevelSubscription (deterministic)      │
│   At most ONE entitled commercial subscription per owner    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Layer 3 — Plan                                              │
│   Catalog: subscription_plans via subscription.planId       │
│   Resolution: mapPlanIdToCatalogPlan → planFeatureMatrix    │
│   Trial: status=trial overrides display plan to TRIAL       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Layer 4 — Commercial Entitlements                           │
│   Pure resolver: resolveCommercialEntitlements(context)     │
│   Outputs: plan, status, features, maxRestaurants, periods  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Layer 5 — Restaurants                                       │
│   Consume: maxRestaurants, feature gates                      │
│   Never: define plan, subscription, or entitlements         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Layer 6 — Features                                          │
│   Derived from entitlements (ordering, menu caps, etc.)     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Layer 7 — Ordering                                          │
│   Gate: resolveGuestOrderingAllowed → features.ordering     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Forbidden inversions

| Forbidden direction | Why |
|---------------------|-----|
| Restaurant → Subscription | Venue rows must not select commercial subscription |
| Restaurant → Plan | Plan is account-level |
| Scoped sub → Entitlements | Legacy `restaurantId > 0` rows are not authority |
| Raw row count → Limits | `COUNT(subscriptions)` ≠ `maxRestaurants` |
| MRR sum of scoped rows → Revenue truth | Duplicates owners; violates S1 |

### 2.3 Scoped subscription rows (legacy artifact)

`user_subscriptions` rows with `restaurantId > 0` are **legacy data** on the launch database (DATA-INTEGRITY-1 Phase E: 4 scoped, 0 account).

| Status in AR-2 | Meaning |
|----------------|---------|
| Not commercial truth | Must not drive entitlements, ordering, trial, or owner UI |
| May exist during migration | Display-only or historical until backfill + deprecation |
| Future writes | Account-scoped only (`restaurantId = 0`) per ASN-5 register model |

---

## 3. Deliverable 2 — Commercial Truth Definition (AR-2.2)

### 3.1 Single source of truth

**Question:** *What is the commercial truth for owner `O` at time `T`?*

**Answer:**

```text
truth(O, T) = getCommercialEntitlements(O, T)
```

No other function, query, client derivation, or dashboard component may answer this question for product behavior.

### 3.2 Authority chain (locked)

| Step | Function | Responsibility |
|------|----------|----------------|
| 1 | `buildCommercialContextFromDb(ownerId)` | Load user + account-scoped subscription rows |
| 2 | `pickUserLevelSubscription(rows)` | Deterministic pick among `restaurantId = 0` only |
| 3 | `buildCommercialContext(...)` | Map row + role → `CommercialContext` |
| 4 | `resolveCommercialEntitlements(context)` | Plan, status, features, limits |
| 5 | `planFeatureMatrix` | Feature flags and caps |

**Transport wrappers** (`commercial.getEntitlements`, `useCommercialEntitlements`) are **derived** — they must not add selection logic.

### 3.3 What commercial truth includes

| Field domain | Source in truth object |
|--------------|--------------------------|
| Plan identity | `entitlements.plan` |
| Subscription status | `entitlements.status` (trial / active / none / etc.) |
| Trial end | Context period fields from canonical row |
| Feature flags | `entitlements.features.*` |
| Restaurant cap | `entitlements.maxRestaurants` |
| Ordering allowed | `entitlements.features.ordering` |

### 3.4 What commercial truth excludes

| Excluded signal | Classification |
|-----------------|----------------|
| Scoped subscription row status | Legacy display only (post-migration: remove) |
| `Array.find` first row | **Invalid** (S5) |
| `SELECT *` aggregation | **Invalid** as truth (S6) |
| `getCanonicalUserSubscription` any-scope pick | **Transitional** (S4) — migrate to S1 |
| `isSubscriptionActive` any-row | **Legacy fallback** — prohibited as truth |
| Client-side KPI merging | **Invalid** — server returns canonical-derived metrics |

### 3.5 Admin dashboard rule (AR-2.5)

```text
Admin Dashboard MAY:    READ canonical authority (per owner)
Admin Dashboard MAY NOT: CREATE ITS OWN COMMERCIAL TRUTH
```

| Allowed | Forbidden |
|---------|-----------|
| Display `getCommercialEntitlements` output per user | Pick subscription via `find()` |
| Aggregate canonical results for platform metrics | Sum raw `user_subscriptions` rows as MRR |
| Show identical subscription state on all commercial screens | Mix S3 restaurant cards with S5 user columns |
| Use scoped rows as **infrastructure audit** (documented) | Use scoped rows as **entitlement authority** |

**Uniformity requirement:** For a given owner `O`, every admin commercial screen must show the **same** plan, status, and trial state — the output of `truth(O)`.

---

## 4. Deliverable 3 — Canonical Definitions (AR-2.3)

### 4.1 Subscription state

| Attribute | Canonical source | Never use |
|-----------|------------------|-----------|
| Active / trial / expired | Account subscription row via `pickUserLevelSubscription` | Restaurant-scoped row |
| Period end | Canonical row `trialEndsAt` / `currentPeriodEnd` | Arbitrary scoped row |
| Row identity | Single picked `restaurantId = 0` row | First matching row in array |

**No row →** `plan: NONE`, `status: none` (for `role: user`).

### 4.2 Plan state

| Attribute | Canonical source | Never use |
|-----------|------------------|-----------|
| Plan tier | `resolveCommercialEntitlements` → `plan` | Restaurant-scoped plan lookup |
| Plan catalog metadata | `subscription_plans` via canonical `planId` | Per-venue `planId` on scoped row |
| Trial display | TRIAL override when canonical `status = trial` | Scoped row trial badge |

### 4.3 Restaurant limits

| Attribute | Canonical source | Never use |
|-----------|------------------|-----------|
| Max restaurants | `entitlements.maxRestaurants` | Count subscription rows |
| Current usage | `COUNT(restaurants WHERE userId = owner)` | Count scoped subs |
| Create allowed | `usage < maxRestaurants` from entitlements | `resolvePlanLimitsForUser` scoped-first (S3) |
| Fallback basic limits | Only when canonical truth is NONE and product policy allows | Legacy plan table shortcuts |

### 4.4 Ordering permissions

| Attribute | Canonical source | Never use |
|-----------|------------------|-----------|
| Guest ordering | `resolveGuestOrderingAllowed` → `features.ordering` | `restaurantAllowsTableOrdering` (deprecated) |
| Owner ordering gate | Same canonical chain | `resolveOrderingSubscriptionRow` (S3) |
| Restaurant flags | **Never** authority | `restaurants.*` ordering flags if any |

---

## 5. Deliverable 4 — Subscription Resolution Rules (AR-2.6)

### 5.1 Per-owner resolution

For any owner `O`:

| Rule | Requirement |
|------|-------------|
| **SR-01** | At most **one** commercial subscription informs entitlements |
| **SR-02** | Selection domain: `restaurantId = 0` rows only |
| **SR-03** | Selection algorithm: `pickUserLevelSubscription` (deterministic sort) |
| **SR-04** | Forbidden: `Array.find`, `limit(1)` without canonical sort |
| **SR-05** | Forbidden: mixed scoped + account results in one truth object |
| **SR-06** | Forbidden: multiple competing subscriptions without explicit supersession rules |

### 5.2 Deterministic pick order (existing — retained)

`pickUserLevelSubscription` delegates to `pickCanonicalSubscription` with this ordering:

1. Entitled `trial` / `active` rows rank above elapsed / canceled
2. Newer period end wins ties
3. Higher `id` wins final tie

This algorithm is **normative** for AR-2. No alternative pick order is permitted for commercial truth.

### 5.3 Write path alignment (future implementation)

| Action | Required scope |
|--------|----------------|
| New owner registration | INSERT account trial `restaurantId = 0` (ASN-5) |
| Admin subscription create/update | Target account row only |
| Admin restaurant subscription create | **Deprecate** — migrate to account-level governance |
| Checkout / activation | Update or create account-scoped row |

### 5.4 Multi-row legacy state (launch DB)

When an owner has **only** scoped rows and **no** account row:

| Phase | Commercial truth | Display policy |
|-------|------------------|----------------|
| Pre-migration | `plan: NONE` (S1 correct) | Admin shows NONE; migration banner for ops |
| Post-backfill (ASN-4C) | Account row reflects consolidated state | All screens align |

**AR-2 does not execute backfill** — specifies that truth remains S1-consistent even when data is legacy-shaped.

---

## 6. Deliverable 5 — Metrics Authority Rules (AR-2.7)

### 6.1 Principle

Platform commercial metrics are **derived aggregations of canonical truth per owner**, not raw table scans.

```text
MRR     = Σ monthlyEquivalent(truth(O).planPrice)  for owners where truth(O).status = active
ARR     = MRR × 12 (or sum of annual equivalents per canonical plan)
Subscribers = COUNT(owners where truth(O).status ∈ { active })
Trial count = COUNT(owners where truth(O).status = trial )
Plan distribution = GROUP BY truth(O).plan
```

### 6.2 Metric definitions (target)

| Metric | Canonical derivation | Current violation |
|--------|---------------------|-------------------|
| **MRR** | One contribution per owner from account subscription | S6: sums every `active` row including scoped duplicates |
| **ARR** | Derived from canonical MRR | Not separately implemented; same S6 issue |
| **Active subscribers** | Owners with `truth(O).status = active` | S6: counts rows not owners |
| **Trial subscribers** | Owners with `truth(O).status = trial` | S3/S5/S6: three different trial counts |
| **Plan distribution** | Group owners by `truth(O).plan` | S6: groups raw rows |
| **Revenue by month** | Canonical MRR movement or recognized billing events | S6: buckets by row `createdAt` |
| **Active restaurants** | Operational metric — **not** subscription truth | S3 conflates venue sub status with commercial state |

### 6.3 S6 future role: DERIVED ONLY

| S6 usage | Future state |
|----------|--------------|
| `SELECT * FROM user_subscriptions` for MRR | **Remove** as product metric |
| Raw row counts on Statistics page | **Replace** with canonical aggregation |
| Infrastructure / DBA audit scripts | **Allowed** if labeled *infrastructure statistics* |
| DATA-INTEGRITY audits | **Allowed** — not product truth |

**Documentation requirement:** Any remaining raw-row report must carry explicit label: *“Infrastructure statistics — not commercial truth.”*

### 6.4 Admin KPI strip (rebuild spec)

Current `computeAdminKPIs` merges S3 + S6 client-side — **prohibited** in target architecture.

| KPI | Target source |
|-----|---------------|
| Estimated MRR | Server: `aggregateCanonicalMrr()` over all owners |
| Active subscriptions | Server: count owners with canonical `active` |
| Trial accounts | Server: count owners with canonical `trial` |
| Active restaurants | Operational count (venues) — **decoupled** from subscription row count |
| Expiring soon | Canonical period end within window per owner |

---

## 7. Deliverable 6 — Trial Authority Rules (AR-2.8)

### 7.1 Canonical trial source

Trial state **must** originate from:

```text
getCommercialEntitlements(ownerId)
  → context from account-scoped row
  → resolveCommercialEntitlements
  → status = trial when canonical row.status = trial and entitled
```

### 7.2 Prohibited trial sources

| Source | Status |
|--------|--------|
| `resolveTrialStatusRead` → `isSubscriptionActive` fallback | **Prohibited** as commercial truth |
| Scoped row `status = trial` | **Prohibited** as account trial indicator |
| Any-row entitlement check | **Prohibited** |
| Client-side badge from non-canonical sub | **Prohibited** |

### 7.3 Trial display rules

| Surface | Rule |
|---------|------|
| Owner dashboard trial banner | `truth(O).status === trial` |
| Admin user subscription column | Same |
| Statistics trial count | Same |
| Guest ordering during trial | `features.ordering` from canonical entitlements |

### 7.4 Launch DB implication

Test user `14760004` with scoped active rows but no account row:

| Path | Current behavior | Target behavior |
|------|------------------|-----------------|
| `getCommercialEntitlements` | `NONE` | `NONE` (correct) |
| `resolveTrialStatusRead` fallback | May show active trial | **Remove fallback** — show NONE until backfill |

---

## 8. Deliverable 7 — Restaurant Authority Rules (AR-2.9, AR-2.10)

### 8.1 Restaurant consumes authority (AR-2.9)

```text
Allowed:    Subscription → Plan → Entitlements → Restaurant operations
Forbidden:  Restaurant → Subscription → Plan
```

| Operation | Authority check |
|-----------|-----------------|
| Create restaurant | `COUNT(venues) < truth(O).maxRestaurants` |
| Enable ordering | `truth(O).features.ordering` |
| Menu limits | `truth(O).features.*` caps |
| Admin support view | Display venue **operational** status; subscription column from `truth(ownerId)` |

Restaurant-scoped subscription rows must **not** appear as the subscription state on restaurant cards in target admin UI. Optional: show *“legacy scoped row”* in migration diagnostics only.

### 8.2 Delete restaurant invariant (AR-2.10)

Deleting a restaurant must **never** alter:

| Invariant | Target guarantee |
|-----------|------------------|
| Account subscription row | Row survives; unchanged |
| Plan on account subscription | Unchanged |
| `getCommercialEntitlements(ownerId)` output | Unchanged |
| Commercial status for owner | Unchanged |
| MRR contribution for owner | Unchanged |

**Exception:** Explicit commercial workflow (admin cancel account subscription, plan change) — intentional governance mutation.

### 8.3 Current gap (documented — not fixed in AR-2)

Today `deleteRestaurantCascade` **deletes scoped** `user_subscriptions` rows for the venue. This:

- Does **not** change S1 truth when account row exists (invariant holds for canonical)
- **Does** change S6 raw counts and S3 restaurant card display (drift — ADA-1 §8)
- **Does** change perceived commercial state on admin screens still using S2/S3/S6

**Remediation (future):** Stop treating scoped row deletion as commercial state change by (a) removing scoped rows as authority source, and (b) optionally retaining scoped rows as non-authoritative history or eliminating scoped writes entirely.

### 8.4 Restaurant delete refresh rule (dashboard)

After restaurant delete, all commercial metrics queries must invalidate — not only restaurant list (ADA-1 gap). Target: single canonical metrics endpoint refetched atomically.

---

## 9. Deliverable 8 — Strategy Deprecation Matrix (AR-2.4)

### 9.1 Strategy definitions (reference)

| Strategy | Selector | ADA classification |
|----------|----------|-------------------|
| **S1** | `pickUserLevelSubscription` — account only | Canonical candidate |
| **S2** | `getSubscriptionForRestaurant` — scoped only | Legacy |
| **S3** | `resolveOrderingSubscriptionRow` — scoped first | Legacy |
| **S4** | `pickCanonicalSubscription(all scopes)` | Transitional |
| **S5** | `Array.find` first row | Invalid |
| **S6** | Raw all rows, no owner dedup | Invalid as truth |

### 9.2 Future state matrix

| Strategy | Future state | Action |
|----------|--------------|--------|
| **S1** | **CANONICAL** | Sole commercial truth path |
| **S2** | **REMOVE** | Replace reads with `truth(ownerId)`; stop scoped writes |
| **S3** | **REMOVE** | Replace limits/ordering with S1 entitlements |
| **S4** | **MIGRATE** | Redirect `getCanonicalUserSubscription`, invoice, activation to S1 |
| **S5** | **REMOVE** | Replace `getAllUsersWithSubscriptions` pick with per-owner `getCommercialEntitlements` |
| **S6** | **DERIVED ONLY** | Raw SQL allowed for infra audit; product metrics use canonical aggregation |

### 9.3 Resolver deprecation register

| Function / procedure | Strategy | Future |
|---------------------|----------|--------|
| `getCommercialEntitlements` | S1 | **Retain** — authority facade |
| `pickUserLevelSubscription` | S1 | **Retain** |
| `resolveCommercialEntitlements` | S1 | **Retain** |
| `resolveGuestOrderingAllowed` | S1 | **Retain** |
| `commercial.getEntitlements` | S1 | **Retain** |
| `getSubscriptionForRestaurant` | S2 | **Remove** from commercial displays |
| `getAllRestaurantsWithSubscriptions` | S3 | **Replace** — venues + `truth(ownerId)` |
| `resolveOrderingSubscriptionRow` | S3 | **Remove** |
| `resolvePlanLimitsForUser` (scoped branch) | S3 | **Replace** with entitlements |
| `restaurantAllowsTableOrdering` | S3 | **Remove** (deprecated) |
| `getCanonicalUserSubscription` | S4 | **Migrate** to S1 |
| `subscription.getCurrentSubscription` | S4 | **Migrate** to S1 |
| `resolveSubscriptionForActivation` | S4 | **Migrate** to account row |
| `admin.generateInvoicePDF` sub pick | S4 | **Migrate** to S1 |
| `getAllUsersWithSubscriptions` | S5 | **Remove** pick; use S1 per user |
| `getAdminStatistics` | S6 | **Replace** with canonical aggregation |
| `computeAdminMrr` | S6 | **Replace** — one owner = one MRR unit |
| `getRevenueByMonth` | S6 | **Replace** or relabel infra-only |
| `getSubscriptionDetails` | S6 | **Replace** — owner-centric canonical list |
| `computeAdminKPIs` (client merge) | S3+S6 | **Remove** — server-side canonical KPIs |
| `resolveTrialStatusRead` fallback | Legacy | **Remove** fallback branch |
| `isSubscriptionActive` (any row) | Legacy | **Remove** from product paths |
| `admin.createRestaurantSubscription` | S2 write | **Deprecate** — account-level admin writes |
| `admin.createUserSubscriptionByAdmin` (scoped default) | S2/S4 | **Migrate** — account scope only |

### 9.4 Admin screen realignment map

| Screen | Current | Target |
|--------|---------|--------|
| `/admin` KPI strip | S3 + S6 client merge | Canonical server aggregation |
| `/admin` Restaurants commercial columns | S3 scoped sub | `truth(restaurant.userId)` |
| `/admin` Users commercial columns | S5 find | `truth(user.id)` per row |
| `/statistics` all commercial blocks | S6 raw | Canonical aggregation |
| Owner `/dashboard` | S1 | S1 (unchanged) |
| Invoice PDF | S4 | S1 |

---

## 10. Deliverable 9 — Migration Acceptance Criteria (AR-2.11)

Commercial authority migration is **complete** when all criteria pass:

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | Every dashboard commercial screen consumes canonical authority | ADA-style screen map re-run → 0 non-S1 commercial columns |
| 2 | MRR derives from canonical authority (one unit per paying owner) | Compare `aggregateCanonicalMrr` vs manual per-owner truth |
| 3 | Trial status derives from canonical authority | Remove fallback; trial count matches `truth(O).status=trial` |
| 4 | Ordering derives from canonical authority | Guest order gate uses only `resolveGuestOrderingAllowed` |
| 5 | No resolver uses **S2** for commercial truth | Code search + integration tests |
| 6 | No resolver uses **S3** for commercial truth | Code search + integration tests |
| 7 | No resolver uses **S5** | `find()` pick eliminated from admin user list |
| 8 | **S6** is analytics/infrastructure only | Product metrics endpoints documented and canonical |
| 9 | Restaurant deletion cannot alter commercial truth for owner | Delete venue → `getCommercialEntitlements(owner)` unchanged |
| 10 | All commercial screens display **identical** subscription state per owner | Cross-screen consistency test for same `O` |

### 10.1 Data prerequisites (separate from AR-2)

| Prerequisite | Program | AR-2 reference |
|--------------|---------|----------------|
| Account-scoped rows for legacy owners | ASN-4C backfill | Without backfill, S1 correctly returns NONE — screens must agree on NONE |
| Scoped row deprecation policy | AR-3+ | Writes stop; reads migrate |
| Launch DB validation | DATA-INTEGRITY-1R | 0 account / 4 scoped baseline documented |

### 10.2 Suggested implementation sequence (documentation only)

| Phase | Scope |
|-------|-------|
| **AR-2** (this doc) | Canonical specification |
| AR-3 | Data backfill + scoped row policy spec |
| AR-4 | Server: canonical metrics + admin read procedures |
| AR-5 | Admin dashboard rebuild (uniform S1 consumption) |
| AR-6 | Legacy resolver removal + fallback deletion |

---

## 11. Commercial Truth Diagram

### 11.1 Target state (single path)

```text
                         ┌──────────────────┐
                         │   All surfaces   │
                         │ owner + admin UI │
                         │ metrics + gates  │
                         └────────┬─────────┘
                                  │ READ only
                                  ▼
                    ┌─────────────────────────────┐
                    │ getCommercialEntitlements │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │ buildCommercialContextFromDb│
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │ pickUserLevelSubscription   │
                    │ (restaurantId = 0 ONLY)     │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │ resolveCommercialEntitlements│
                    │ + planFeatureMatrix          │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        Plan / Status        Features           maxRestaurants
              │                   │                   │
              └───────────────────┴───────────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │ Metrics layer (DERIVED)     │
                    │ MRR, trials, plan mix       │
                    │ 1 row per owner             │
                    └─────────────────────────────┘
```

### 11.2 Retired paths (must not feed product truth)

```text
  S2 scoped-only ──────────────┐
  S3 scoped-first ─────────────┼──► X (removed from product truth)
  S5 find() ───────────────────┤
  S6 raw rows ─────────────────┘
                               │
  S4 any-scope ────────────────┼──► migrate ──► S1
  Legacy any-row fallback ─────┘
```

---

## 12. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Canonical Commercial Hierarchy | §2 |
| 2 | Commercial Truth Definition | §3 |
| 3 | Subscription Resolution Rules | §5 |
| 4 | Metrics Authority Rules | §6 |
| 5 | Trial Authority Rules | §7 |
| 6 | Restaurant Authority Rules | §8 |
| 7 | Strategy Deprecation Matrix | §9 |
| 8 | Migration Acceptance Criteria | §10 |
| 9 | Executive Recommendation | §1 |

---

## 13. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-AUDIT-ADA-0.md` | S1–S6 discovery |
| `ADMIN-DASHBOARD-AUDIT-ADA-1.md` | Screen-level drift evidence |
| `ADMIN-DASHBOARD-REMEDIATION-AR-1.md` | Platform governance boundary |
| `ASN-FINAL-EXECUTIVE-REPORT.md` | ASN canonical chain origin |
| `DATA-INTEGRITY-1-AUDIT.md` | Legacy scoped data footprint |
| `ASN-5A-COMMERCIAL-DATA-REALITY-AUDIT.md` | Launch DB commercial shape |

---

```text
ARCHITECTURE APPROVED
READY FOR FUTURE IMPLEMENTATION
```

*End of AR-2. Specification only. No code, schema, migration, or cleanup execution.*
