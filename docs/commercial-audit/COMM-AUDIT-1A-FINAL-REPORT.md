# COMM-AUDIT-1A — Commercial Authority Regression Investigation

**Program:** Commercial Authority Program — Incident audit  
**Mode:** Read-only (code trace + archived launch DB artifacts)  
**Date:** 2026-06-09  
**Status:** Complete — root cause identified at authority-layer level  

**Incident operator:** `sam672@windowslive.com`  
**Reported regression:** Active Subscriptions `1 → 0`, MRR `$39 → $0`, ARR `$468 → $0`  
**Reported trigger:** Deleting one restaurant associated with the user  

---

## 1. Executive Summary

The incident is **not a CRS calculation bug**. It is an **authority-layer split** combined with a **subscription row that still exists in the database but is invisible to CRS metrics**.

### Conclusive answer

> **Why does the system believe the user already has a subscription, while Commercial Overview reports zero active subscriptions and zero MRR?**

Because **two different “has subscription” definitions** are in production:

| Layer | Question asked | Resolver |
|-------|----------------|----------|
| **Create guard** (`admin.createUserSubscriptionByAdmin`) | Does *any* subscription row exist for this user (any `restaurantId`)? | `getCanonicalUserSubscription` → `pickCanonicalSubscription(all rows)` |
| **CRS / metrics / Operations UI** | Does the user have an **account-scoped, period-valid** entitled subscription (`restaurantId = 0`)? | `pickUserLevelSubscription` → `resolveCommercialEntitlements` |

A user can therefore have:

- **Rows in DB** → create returns *“User already has a subscription”*
- **CRS `planCode: NONE` / `isEntitled: false`** → Operations shows *“No subscription”*, metrics show **0 / $0**

### User identification

| Field | Finding |
|-------|---------|
| Email `sam672@windowslive.com` in repo | **Not present** (no seeds, tests, or exports) |
| Strong correlate | **User `14760004`**, restaurant **`720002`**, slug **`sam672-Y7Y0ac`** |
| Evidence | `docs/commercial-audit/DATA-INTEGRITY-1-AUDIT.md` §E.2–E.3 |

Workspace `.env` targets **legacy Monu** (`gateway05` / empty DB). Live row-level verification of the incident moment requires **`gateway01` / `mineuqr`** (documented launch cluster). Archived **EXEC-4** artifacts on that cluster are used as evidentiary baseline below.

### Pre-incident baseline validation

Reported baseline **MRR = $39**, **ARR = $468** matches **exactly**:

```text
$39/month × 12 = $468 ARR
```

Launch catalog (**EXEC-4-DISCOVERY**): **Professional Plan (`30002`) `priceMonthly = "39.00"`**.

Post-**EXEC-4** backfill (**EXEC-4-VALIDATION-2026-06-08.json**):

- User **14760004** → account row **`660001`**, canonical plan **PROFESSIONAL**, entitled
- Platform canonical MRR contribution: **$39** from that single entitled paying owner

The baseline is consistent with **post-EXEC-4 canonical authority**, not legacy scoped-row counting.

### Root cause (most probable)

**Deleting restaurant `720002` (`sam672-Y7Y0ac`) alone cannot explain the regression** — that venue had **no subscription row** before or after EXEC-4.

The regression requires the **account-level subscription (`660001`, `restaurantId = 0`)** to stop contributing to CRS **while at least one `user_subscriptions` row remains** for the create guard.

Most probable triggers (ordered):

1. **Admin used “Delete subscription”** (not “Delete restaurant”) — hard-deletes account row `660001`; **expired scoped rows** on other venues can remain → CRS zero, create blocked.
2. **Account row still exists but is not period-entitled** (`currentPeriodEnd` in the past) — CRS treats as `NONE`; row still returned by `getCanonicalUserSubscription` → create blocked.
3. **Account row status `expired`/`canceled`** — same split as (2).

**Deleting a restaurant with only an already-expired scoped row** (post-EXEC-4: `630001`/`630002`/`600002`) removes that row but **does not touch** account row `660001` — metrics should **remain $39** unless (1)–(3) also occurred.

---

## 2. Subscription Reality Check

### 2.1 Archived launch state (post EXEC-4, 2026-06-08)

**Source:** `docs/commercial-audit/executions/EXEC-4-EXECUTION-2026-06-08.json`, `EXEC-4-VALIDATION-2026-06-08.json`, `EXEC-4-DISCOVERY-2026-06-08.json`

#### User `14760004` (sam672 correlate)

| Field | Post-EXEC-4 value |
|-------|-------------------|
| **user id** | `14760004` |
| **role** | `user` |
| **Account subscription id** | **`660001`** (INSERT via R3-B) |
| **Account `restaurantId`** | **`0`** |
| **Winner source** | Scoped row `600002` (PROFESSIONAL on `720006`) |
| **Plan** | `30002` → **PROFESSIONAL** |
| **Status (expected)** | `active` |
| **Billing cycle** | `monthly` |
| **MRR contribution** | **$39.00** |
| **Scoped rows retired** | `600002`, `630001`, `630002` → **`expired`** (not deleted) |

#### Pre-EXEC-4 scoped rows (historical)

| Sub ID | restaurantId | Plan | Status (pre-backfill) |
|--------|-------------|------|------------------------|
| 600002 | 720006 | PROFESSIONAL | active → expired |
| 630001 | 720003 | BASIC | active → expired |
| 630002 | 720005 | BASIC | active → expired |

#### Restaurant `720002` (sam672)

| Field | Value |
|-------|-------|
| Slug | `sam672-Y7Y0ac` |
| Owner | `14760004` |
| Scoped subscription | **None** (R2 gap — documented) |

**Conclusion:** Subscription record **did exist** at platform level post-EXEC-4 as account row **`660001`**. Deleting **`720002` only** does not remove that row.

### 2.2 Live DB note

Read-only probe against workspace `.env` (Monu cluster) returned **0 users / 0 subscriptions** for the email and slug — **wrong database**. Operator re-query on **`gateway01` / `mineuqr`** is required to capture **current** row-level state after the incident.

---

## 3. Restaurant Ownership Audit

### 3.1 Archived ownership (launch DB)

**User `14760004` — 4 restaurants** (`DATA-INTEGRITY-1-AUDIT.md`):

| Restaurant ID | Slug | Scoped sub (pre-EXEC-4) | Post-EXEC-4 sub on venue |
|---------------|------|---------------------------|--------------------------|
| **720002** | `sam672-Y7Y0ac` | **None** | None |
| 720003 | `sam-1WloHC` | 630001 (expired) | Expired row until venue deleted |
| 720005 | `sam12-Y6ldJq` | 630002 (expired) | Expired row until venue deleted |
| 720006 | `saaa-Ei7D02` | 600002 (expired) | Expired row until venue deleted |

### 3.2 Post-incident report alignment

Operator reports **restaurants still visible** on user dashboard — consistent with **partial restaurant deletion** (e.g. one of four removed). User dashboard lists **owned `restaurants` rows**; it does **not** require active commercial entitlement.

**Account subscription (`restaurantId = 0`) is independent of restaurant count** — deleting venues does not remove account rows unless subscription cascade or explicit subscription delete runs.

---

## 4. CommercialReadService Audit

### 4.1 Path for metrics and Operations UI

```text
commercialReadService.getAllOwnerCommercialStates(now)
  → per owner: getOwnerCommercialState(ownerId, now)
      → getCommercialEntitlements(ownerId, now)
          → buildCommercialContextFromDb
              → pickUserLevelSubscription(rows)   // restaurantId === 0 ONLY
      → mapToCommercialAuthority(...)
```

**Files:**

- `server/commercial/CommercialReadService.ts` L28–42, L54–61
- `server/commercial/buildCommercialContextFromDb.ts` L20–49
- `server/subscriptionResolver.ts` L78–86 (`pickUserLevelSubscription`)
- `src/lib/commercial/resolveCommercialEntitlements.ts` L43–80
- `server/commercial/mapToCommercialAuthority.ts` L47–54

### 4.2 Is `14760004` included in entitledOwners / activeSubscriptions / MRR?

**Post-EXEC-4 (validated):** **Yes** — `planCode: PROFESSIONAL`, `isEntitled: true`, `subscriptionStatus: active`, `countsInMrr: true` → MRR **$39**.

**Post-incident (reported):** **No** — metrics show 0.

### 4.3 Exclusion conditions (when CRS drops owner to zero contribution)

| Metric | Included when | Excluded when |
|--------|---------------|---------------|
| **entitledOwners** | `entitlements.plan !== "NONE"` | No account row; period invalid; `canceled`/`expired`; unknown `planId` |
| **activeSubscriptions** | `subscriptionStatus === "active"` | `null`, `trial`, `canceled`, `expired` |
| **countsInMrr / MRR** | `countsInMrr === true` + valid `planId` + catalog price | `NONE`, `TRIAL`, `ADMIN`; missing plan; period invalid |

**Scoped-only rows (`restaurantId > 0`) are never read by CRS** — documented in `CommercialReadService.test.ts` and parity tests.

### 4.4 Exclusion reason for incident symptom

For metrics **0** while create **blocked**, CRS must resolve user to:

```text
planCode: NONE
isEntitled: false
subscriptionStatus: null | expired | canceled | trial (not active)
countsInMrr: false
subscriptionId: null   // no account-level row picked
```

while **`getCanonicalUserSubscription(userId)` still returns a row** (typically expired scoped row or expired account row).

---

## 5. CanonicalMetricsService Audit

### 5.1 Source query

Single load per request:

```typescript
states = await commercialReadService.getAllOwnerCommercialStates(now)
```

`server/commercial/metrics/CanonicalMetricsService.ts` L71–72, L110

### 5.2 Why MRR and Active Subscriptions became 0

| Metric | Computation | Zero when |
|--------|-------------|-----------|
| **activeSubscriptions** | `states.filter(s => s.subscriptionStatus === "active").length` | No owner has DB status `"active"` in CRS view |
| **entitledOwners / commercialSubscribers** | `states.filter(s => s.commercialStatus.isEntitled).length` | All owners `planCode === "NONE"` (except admin `ADMIN` if entitled) |
| **MRR** | Sum `monthlyEquivalentPlanPrice` where `countsInMrr && planId` | No entitled paying catalog plan |

**Platform had 2 users post-EXEC-4.** Admin contributes **ADMIN** plan (entitled, **not** in MRR). User `14760004` was the **sole $39 MRR** source. When that owner drops out of CRS entitlement, **platform MRR → 0** and **activeSubscriptions → 0** (admin has `subscriptionStatus: null`).

### 5.3 Evidence chain

```text
Restaurant delete (720002, no sub) alone
  → no change to user_subscriptions account row 660001
  → CRS unchanged
  → MRR remains $39   ✗ does not match incident

Account row removed OR period/status invalid
  → CRS: 14760004 not entitled / not active
  → MRR: $0, activeSubscriptions: 0   ✓ matches incident

Any-scope row still in DB
  → getCanonicalUserSubscription → row found
  → createUserSubscriptionByAdmin → CONFLICT   ✓ matches incident
```

---

## 6. Restaurant Deletion Side Effects

### 6.1 Cascade path

```text
AdminManagement → trpc.restaurant.delete
  → deleteRestaurantCascade(restaurantId)
      → subscriptionIdsForRestaurant: SELECT user_subscriptions WHERE restaurantId = ?
      → DELETE invoices, renewal_notifications, user_subscriptions FOR those ids
      → DELETE restaurants
```

**File:** `server/db/cascadeDeletes.ts` L142–194

### 6.2 Can restaurant delete affect commercial visibility?

| Effect | Account row (`restaurantId = 0`) | Scoped row (`restaurantId = venue`) |
|--------|----------------------------------|-------------------------------------|
| **Restaurant delete** | **Not touched** | **Hard-deleted** if linked to venue |
| **CRS owner state** | Unchanged if account row intact | Irrelevant to CRS (scoped ignored) |
| **Create guard** | Unchanged | Removes that scoped row from canonical pick set |
| **Legacy S6 metrics** | Unchanged | Row count decreases |

### 6.3 Dependency chain (when delete *can* matter)

```text
deleteRestaurantCascadeTx
  → removes scoped user_subscriptions for deleted venue only
  → IF that was the LAST remaining row for user:
        getCanonicalUserSubscription → undefined
        create guard → ALLOWS create
  → IF account row 660001 still exists:
        CRS unchanged (still entitled) UNLESS period invalid
  → IF admin clicked "Delete subscription" on CRS subscriptionId:
        deleteSubscriptionCascade(account row id)
        CRS → NONE; expired scoped rows may remain → split-brain
```

**Separate UI action:** `admin.deleteRestaurantSubscription` deletes by **subscription id** (account id shown on restaurant cards) — **this removes commercial truth** regardless of which restaurant card initiated the action.

**Files:** `client/src/pages/AdminManagement.tsx` L1322, L1602; `server/routers.ts` L923–933, L1013–1027

### 6.4 sam672-specific (`720002`)

Documented **no subscription** on `720002`. **Restaurant delete for this venue cannot cause MRR/active regression** under any documented subscription shape.

---

## 7. Authority Consistency Matrix

| Layer | Sees subscription for `14760004`? | Evidence |
|-------|-----------------------------------|----------|
| **Database (post-EXEC-4)** | **Yes** — account row `660001` + expired scoped rows | `EXEC-4-EXECUTION-2026-06-08.json` |
| **Database (post-incident)** | **Yes** (at least one row) — inferred from create CONFLICT | `routers.ts` L1024–1026 requires `getCanonicalUserSubscription` truthy |
| **Operations UI** | **No** (displays “No subscription”) | `isOwnerEntitled(commercial)` false → `AdminManagement.tsx` L547–550; data from CRS via `getOwnerOverviewList` |
| **CRS** | **No** (not entitled / not active for metrics) | `pickUserLevelSubscription` + `resolveCommercialEntitlements` |
| **CanonicalMetricsService** | **No** — MRR 0, active 0 | Filters on CRS `OwnerCommercialState` |
| **Commercial Overview** | **No** — same snapshot | `admin.getCommercialOverview` → `getCommercialOverviewSnapshot` |

**Split-brain row:** DB has row(s) → Create says **exists**; CRS says **no commercial subscription** → UI/metrics **zero**.

---

## 8. Root Cause Analysis

### 8.1 Primary cause

**Inconsistent subscription existence checks** between:

1. **Write path (create):** any-scope canonical row  
2. **Read path (CRS/metrics/UI):** account-scope + period-valid entitlements  

Documented across EXEC-2, AR-3, AR-5, EXEC-5; not introduced by EXEC-7C.

### 8.2 Contributing cause (incident trigger)

One of:

| Trigger | Mechanism | Likelihood vs evidence |
|---------|-----------|------------------------|
| **A. Subscription delete (admin)** | Removes account row `660001`; scoped expired rows remain | **High** — immediate metric wipe + create block |
| **B. Period expiry on account row** | Row exists; CRS `NONE` | **Medium** — depends on `currentPeriodEnd` |
| **C. Delete restaurant `720002` only** | No sub on venue | **Ruled out** — insufficient to change metrics |
| **D. Delete restaurant with expired scoped row** | Removes expired row only; account row survives | **Low** for metric regression — CRS should stay $39 |

### 8.3 Why user still sees restaurants

Restaurant deletion is **per-venue**. Remaining `restaurants` rows for `userId = 14760004` continue to render on user dashboard. **Commercial entitlement is account-scoped**, not restaurant-scoped.

---

## 9. Affected Authority Layers

| Layer | Impact |
|-------|--------|
| `CommercialReadService` | Owner resolves to `NONE` — correct per rules, but diverges from create guard |
| `CanonicalMetricsService` | Correctly reports 0 when CRS has no entitled active payer |
| `admin.getCommercialOverview` | Faithful CRS snapshot — not broken |
| `admin.createUserSubscriptionByAdmin` | Blocks on stale / non-account rows |
| Operations UI | Correctly shows CRS truth (“No subscription”) |
| `restaurant.delete` cascade | Can remove scoped rows; **should not** remove account row `660001` |
| `deleteSubscriptionCascade` | **Can remove account commercial truth** |

---

## 10. Recommended Remediation (documentation only — not implemented)

### 10.1 Immediate operator actions

1. Re-query **`gateway01` / `mineuqr`** for user email `sam672@windowslive.com` / id `14760004`:
   - All `user_subscriptions` rows (id, `restaurantId`, status, period end)
   - Confirm whether **`660001`** exists and its status/period
2. If account row missing but expired scoped rows remain → **edit/reactivate** via `admin.updateUserSubscriptionByAdmin` (not create), or retire orphan scoped rows per ops runbook.
3. If account row exists but period expired → **extend period** or set status appropriately via admin edit.

### 10.2 Product / engineering (future phases)

| Priority | Remediation |
|----------|-------------|
| **P0** | Align **create guard** with CRS: use `pickUserLevelSubscription` + entitled check, or allow create when CRS `planCode === "NONE"` even if expired scoped rows exist |
| **P1** | **Restaurant delete** must not hard-delete subscription rows that are the only remaining commercial artifact until account row is canonical (AR-4 invariant) |
| **P1** | Distinguish UI actions: **“Delete restaurant”** vs **“Delete subscription”** with clearer labeling; confirm destructive scope |
| **P2** | Orphan **expired scoped row** cleanup job after EXEC-4 backfill |
| **P2** | Single **“commercial existence”** helper shared by create, edit, CRS, and metrics |

### 10.3 Validation after remediation

- `admin.getCommercialOverview` MRR/ARR/active counts match CRS for `14760004`
- Operations UI status badge matches metrics
- Create vs edit path consistent for same owner state

---

## 11. Success Criteria — Answered

**Question:** Why does the system believe the user already has a subscription, while Commercial Overview reports zero active subscriptions and zero MRR?

**Answer:**

The **create API** checks for **any** `user_subscriptions` row (including expired, restaurant-scoped rows) via `getCanonicalUserSubscription`. **CRS and Commercial Overview** only recognize an **account-level (`restaurantId = 0`), period-valid, entitled** subscription via `pickUserLevelSubscription` + `resolveCommercialEntitlements`.

After the incident, **at least one row still exists** in the database (create blocked), but **CRS no longer treats that user as commercially active** (metrics zero). The reported baseline (**MRR $39**) identifies user **`14760004`** with post-EXEC-4 account PROFESSIONAL row **`660001`**. **Deleting restaurant `720002` (sam672) alone cannot produce this regression**; the account subscription was removed or invalidated separately — most likely via **subscription delete** or **period/status invalidation** — while **leftover rows** still satisfy the create guard.

---

## 12. Evidence Index

| Artifact | Path |
|----------|------|
| Launch DB discovery | `docs/commercial-audit/executions/EXEC-4-DISCOVERY-2026-06-08.json` |
| Backfill execution | `docs/commercial-audit/executions/EXEC-4-EXECUTION-2026-06-08.json` |
| Post validation | `docs/commercial-audit/executions/EXEC-4-VALIDATION-2026-06-08.json` |
| Data integrity / sam672 venue | `docs/commercial-audit/DATA-INTEGRITY-1-AUDIT.md` |
| CRS facade | `server/commercial/CommercialReadService.ts` |
| Metrics | `server/commercial/metrics/CanonicalMetricsService.ts` |
| Create conflict | `server/routers.ts` L1024–1026 |
| Canonical pick (any scope) | `server/db.ts` L443–445 |
| Account pick (CRS) | `server/subscriptionResolver.ts` L78–86 |
| Restaurant cascade | `server/db/cascadeDeletes.ts` L153–194 |
| Operations UI | `client/src/pages/AdminManagement.tsx`, `client/src/lib/admin/ownerCommercialDisplay.ts` |

---

*COMM-AUDIT-1A — audit complete. No code, database, or remediation changes applied.*
