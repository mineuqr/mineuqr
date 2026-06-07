# ASN-5A — Commercial Data Reality Audit

**Program:** Commercial Governance (ASN — Authority Scope Normalization)  
**Phase:** ASN-5A — Commercial data reality audit  
**Date:** 2026-06-07  
**Status:** Complete — read-only audit, no changes  

**Mode:** Read-only forensic audit. No code, schema, migration scripts, database writes, updates, or deletes.

**Inputs:**

- `ASN-4C-LEGACY-SUBSCRIPTION-BACKFILL-PLAN.md` (cohort definitions H-A–H-E)
- `COMMERCIAL-DATA-SNAPSHOT.md` (PG-1B.2 baseline)
- `SUBSCRIPTION-SCOPE-AUDIT.md`
- `scripts/data-integrity-audit-phase2-readonly.mjs` (query patterns)

**Objective:** Replace ASN-4C planning assumptions with verified facts from the database reachable at audit time.

---

## 1. Executive summary

Read-only `SELECT` queries were executed against the database identified by local `DATABASE_URL` (`.env`). Results are **factual counts**, not estimates.

| Finding | Verified reality |
|---------|------------------|
| **Commercial activity** | **None** — zero restaurants, zero subscriptions, zero invoices |
| **User base** | **1 admin user**, 0 regular (`role = user`) owners |
| **Legacy scoped subscriptions** | **0** — ASN-4C cohorts H-A through H-E all **0** |
| **Billing-linked records** | **0** — no invoices, Stripe ids, or renewal notifications |
| **Backfill complexity** | **Level 1** — minimal legacy footprint |
| **R1 register cutover** | **Safe to proceed** on this database (no legacy rows to break) |
| **ASN-4C backfill execution** | **Not required for this database**; remains required **architecturally** for any environment with scoped rows |

**Critical scope note:** This audit reflects the database named `fcy9GqTzfuy9H9eCsDbdLA` as connected from the developer machine's `.env` at capture time. It is consistent with `COMMERCIAL-DATA-SNAPSHOT.md` (same database, same counts, captured ~8.5 hours earlier). If production or staging uses a **different** `DATABASE_URL`, this document does **not** substitute for a repeat audit on those targets. ASN-5 execution must re-run §2 queries per environment before backfill.

---

## 2. Audit provenance

| Item | Value |
|------|-------|
| **Captured at (UTC)** | `2026-06-07T19:24:46.646Z` |
| **Database name** | `fcy9GqTzfuy9H9eCsDbdLA` |
| **Connection source** | Local `.env` → `DATABASE_URL` |
| **Query method** | Ephemeral read-only Node script (not committed); `mysql2` `SELECT` only |
| **Tables read** | `users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `renewal_notifications` |
| **Writes performed** | **None** |
| **Secrets recorded** | **None** — passwords, hashes, tokens, Stripe ids, and connection URL omitted |

**Cross-check:** `COMMERCIAL-DATA-SNAPSHOT.md` captured `2026-06-07T10:56:51.462Z` on the same database name with identical commercial counts (0 subscriptions, 0 restaurants, 1 admin user). No commercial data drift detected between snapshots.

---

## 3. Deliverable A — Actual Subscription Inventory

### 3.1 Row totals

| Metric | Count |
|--------|------:|
| **Total subscription rows** (`user_subscriptions`) | **0** |
| Account-scoped (`restaurantId = 0`) | **0** |
| Restaurant-scoped (`restaurantId > 0`) | **0** |
| Null `restaurantId` | **0** |

### 3.2 Status breakdown

| Status | Count |
|--------|------:|
| `trial` | 0 |
| `active` | 0 |
| `canceled` | 0 |
| `expired` | 0 |
| **Total** | **0** |

*No rows — scope × status matrix empty.*

### 3.3 Invalid / integrity rows

| Check | Count | Evidence |
|-------|------:|----------|
| Invalid `planId` (no matching `subscription_plans`) | **0** | `LEFT JOIN subscription_plans` — no subscription rows |
| Orphan user (`userId` missing from `users`) | **0** | — |
| Orphan restaurant (`restaurantId > 0`, restaurant missing) | **0** | — |
| Owner mismatch (`restaurantId > 0`, `restaurants.userId ≠ sub.userId`) | **0** | — |
| Expired trials (`status = trial` AND `trialEndsAt < UTC_TIMESTAMP()`) | **0** | — |

### 3.4 Duplicate authority rows

| Pattern | Count | Notes |
|---------|------:|-------|
| Users with multiple subscription rows | **0** | — |
| Users with multiple `active` rows | **0** | — |
| Users with multiple account rows (`restaurantId = 0`) | **0** | — |
| Restaurants with multiple scoped rows | **0** | — |
| Duplicate entitled per `(userId, restaurantId)` (S6 pattern) | **0** | No entitled rows exist |

### 3.5 Supporting entity counts

| Entity | Count |
|--------|------:|
| Users | 1 |
| Restaurants | 0 |
| Subscription plans (catalog) | 3 |
| Invoices | 0 |
| Renewal notifications | 0 |

### 3.6 Subscription row listing

*No rows in `user_subscriptions`.*

---

## 4. Deliverable B — Owner Classification

Classification applies to **users with subscription rows** unless noted. Counts are from actual data.

| Group | Definition used | Count | Evidence |
|-------|-----------------|------:|----------|
| **Admin owner** | `users.role = 'admin'` | **1** | User id 1, `k.sh61@yahoo.com`, created `2026-04-01` |
| **Admin with subscription** | Admin user owning ≥1 sub row | **0** | No subscription rows |
| **Regular owner** | `users.role = 'user'` | **0** | — |
| **Legacy test owners** | Heuristic: non-production email patterns + scoped subs | **0** | No `role = user` users; no subs |
| **Demo owners** | Heuristic: demo/test naming + subs | **0** | No qualifying users or subs |
| **Trial owners** | Distinct `userId` with `status = trial` | **0** | — |
| **Paid owners** | Distinct `userId` with `status = active` | **0** | — |
| **Mixed owners** | Same user has both `restaurantId = 0` and `> 0` rows | **0** | — |
| **Multi-subscription owners** | Same user, `COUNT(*) > 1` subscription rows | **0** | — |
| **Scoped-only owners** | Scoped rows, no account row | **0** | — |

### 4.1 User listing (non-secret fields)

| User ID | Email | Role | Created At (UTC) |
|---------|-------|------|------------------|
| 1 | k.sh61@yahoo.com | admin | 2026-04-01T19:12:37.000Z |

### 4.2 Restaurant listing

*No rows in `restaurants`.*

### 4.3 Ownership map (actual)

```text
User 1 (k.sh61@yahoo.com, admin)
└─ (no restaurants)
└─ (no subscriptions)
```

---

## 5. Deliverable C — Billing Reality Audit

There is **no separate `payments` table** in schema. Billing evidence is drawn from `invoices`, `user_subscriptions.stripeSubscriptionId` / `stripeCustomerId`, and `renewal_notifications`.

### 5.1 Record counts

| Record type | Total | Linked to scoped sub | Linked to account sub |
|-------------|------:|---------------------:|----------------------:|
| Invoices | **0** | 0 | 0 |
| Subscriptions with Stripe id(s) | **0** | 0 | 0 |
| Renewal notifications | **0** | — | — |
| Renewal notifications with `subscriptionId` | **0** | — | — |

### 5.2 Classification

| Class | Count | Evidence |
|-------|------:|----------|
| **Real** (paid invoices, live Stripe subscription ids on entitled rows) | **0** | No invoice rows; no Stripe columns populated |
| **Test** (admin-generated invoices, sandbox Stripe patterns) | **0** | No billing artifacts |
| **Unknown** | **0** | Nothing to classify |

### 5.3 Billing history conclusion

**No billing-linked commercial history exists** in this database. PayPal/Tap webhook activation paths have **no subscription rows** to target. MRR and admin invoice flows operate on an **empty** subscription set.

**D-09 billing protection:** Still applies to **code paths** and **future** data; not exercised by current rows.

---

## 6. Deliverable D — Cohort Validation (ASN-4C)

ASN-4C defined planning cohorts H-A through H-E. Each count below uses the exact SQL predicates from `ASN-4C-LEGACY-SUBSCRIPTION-BACKFILL-PLAN.md` §3.1 / §4.3, executed read-only.

| Cohort | Definition (summary) | **Exists?** | **Count** | Notes |
|--------|----------------------|-------------|----------:|-------|
| **H-A** | Single scoped row; no account row; valid restaurant; ≤1 restaurant | **No** | **0** | No scoped rows |
| **H-B** | Account row + one or more scoped rows (mixed) | **No** | **0** | No subscription rows |
| **H-C** | Multiple scoped rows; no account row | **No** | **0** | — |
| **H-D** | Orphan scoped (missing restaurant or owner mismatch) | **No** | **0** | — |
| **H-E** | Scoped row with Stripe ids and/or invoices | **No** | **0** | — |

### 6.1 ASN-4C assumption vs reality

| ASN-4C assumption | Reality in this database |
|-------------------|--------------------------|
| "Existing production data **may** contain `restaurantId > 0` rows" | **Does not** — count is 0 |
| "B-11 scoped-only single restaurant — expected largest pre-R1 cohort" | **N/A** — cohort empty |
| "H-E requires billing sign-off" | **N/A** — no billing-linked scoped rows |
| R3-C hybrid backfill needed before F-W1-03 removal | **Code-level yes**; **data-level no** for this DB |

**Verified fact:** All five ASN-4C execution cohorts are **empty**. Planning assumptions are **not instantiated** in this database.

---

## 7. Deliverable E — Backfill Complexity Assessment

### 7.1 Complexity levels (ASN-5A scale)

| Level | Definition | Applies? |
|-------|------------|----------|
| **Level 1** | Single admin owner; minimal legacy data | **Yes** |
| **Level 2** | Small legacy footprint | No — footprint is zero |
| **Level 3** | Multiple mixed-authority owners | No |
| **Level 4** | Billing-linked migration | No |

### 7.2 Recommended complexity level

**Level 1**

**Evidence:**

- 1 user (admin only)
- 0 restaurants
- 0 subscription rows (scoped or account)
- 0 invoices / Stripe linkage
- 0 ASN-4C cohort members

### 7.3 Implications for ASN-4C R3-C

| R3-C action | Required on this database? |
|-------------|----------------------------|
| H-A in-place `restaurantId → 0` | **No** — no rows |
| H-B account canonical + scoped retirement | **No** |
| H-C merge multi-scoped → account row | **No** |
| H-D manual orphan remediation | **No** |
| H-E billing reconciliation | **No** |

**ASN-4C execution scripts** may be **skipped or limited to verification-only** on this database after R1 deploy. They remain **mandatory** for any environment where §3 counts are non-zero.

---

## 8. Deliverable F — ASN-5 Readiness

### 8.1 Can R1 proceed safely?

**Yes — on this database.**

| Factor | Assessment |
|--------|------------|
| Legacy scoped rows at risk | **0** — R1 changes register INSERT only; no existing rows to diverge |
| Billing rows at risk | **0** |
| Multi-owner ambiguity | **0** owners with subscriptions |
| F-3 exposure from existing data | **None** — no owners with scoped-only authority |

**Caveat:** Safe for **this** `DATABASE_URL`. Repeat §2 queries on production/staging URLs if they differ before those cutovers.

---

### 8.2 Is ASN-4C still required?

| Lens | Answer |
|------|--------|
| **This database (data execution)** | **No** — zero legacy rows; no backfill mutations needed |
| **ASN program (architecture / other environments)** | **Yes** — code still contains scoped-authority paths; any future or external DB with scoped rows needs ASN-4C |
| **F-W1-03 removal** | On this DB, removable after R1 + Wave A **without** data migration; on legacy-heavy DBs, ASN-4C still blocks |

---

### 8.3 Which cohorts actually require migration?

| Cohort | Migration required? |
|--------|-------------------|
| H-A | **No** (count 0) |
| H-B | **No** (count 0) |
| H-C | **No** (count 0) |
| H-D | **No** (count 0) |
| H-E | **No** (count 0) |

**All cohorts can be ignored for data migration on this database.**

---

### 8.4 Which cohorts can be ignored?

**All of H-A through H-E** — none exist.

Additional ignores for this database:

- Duplicate authority remediation (S6)
- Invoice re-linking
- Stripe id migration
- Orphan scoped cleanup (H-D)

---

### 8.5 Which legacy layers remain justified?

Legacy **code paths** remain justified until normalization waves ship, even when data is empty — they are the current runtime implementation.

| Layer | Justified? | Reason |
|-------|------------|--------|
| `resolveOrderingSubscriptionRow` | **Yes** | Still used by `order.create` until Wave A |
| `restaurantAllowsTableOrdering` | **Yes** | Write gate until Wave A |
| `resolveCanOrderRead` / F-W1-03 / F-W1-04 | **Yes** | `order.canOrder` until Wave A |
| `getSubscriptionForRestaurant` | **Yes** | Admin/owner APIs until Wave F |
| `registerOwner` scoped trial (pre-R1) | **Yes** | Active code until R1 deploy |
| Scoped admin create (`createRestaurantSubscription`) | **Yes** | Can create scoped rows if admin onboards a restaurant |

**Not justified by data on this DB:** None of the above are **exercised by existing rows** — only by **code** and **future** operations.

---

### 8.6 Which layers can be retired immediately after execution?

Interpretation: after **ASN-5 execution** (R1 + Wave A + verification on this database).

| Layer | Retire after execution on this DB? | Condition |
|-------|-----------------------------------|-----------|
| F-W1-04 OR branch | **Yes** | Wave A — single entitlements helper |
| `restaurantAllowsTableOrdering` on `order.create` | **Yes** | Wave A |
| F-W1-03 NONE → legacy branch | **Yes** | No scoped-only owners in data |
| `resolveCanOrderRead` shim | **Deferred** | Wave E — after Wave A stable |
| `resolveOrderingSubscriptionRow` | **Deferred** | Wave E — limits/admin may still use |
| Scoped register trial (R1) | **Yes** | R1 deploy — new rows use `restaurantId = 0` |
| ASN-4C backfill scripts | **Skip** | No rows to migrate on this DB |

**Cannot retire immediately without other waves:**

- Admin scoped subscription APIs (ASN-5 admin normalization)
- `subscription.getByRestaurant` strict scoped read (Wave F)
- `getAllRestaurantsWithSubscriptions` hybrid display (Wave F)

---

## 9. Success criteria — verified facts

| # | Question | Verified answer |
|---|----------|-----------------|
| 1 | What commercial subscription data exists? | **None** — 0 rows; plan catalog only (3 plans) |
| 2 | What legacy scoped data exists? | **0** restaurant-scoped rows |
| 3 | What billing-linked data exists? | **0** invoices, 0 Stripe-linked subs, 0 renewal notifications |
| 4 | Do ASN-4C cohorts exist? | **No** — all counts 0 |
| 5 | What is migration complexity? | **Level 1** |
| 6 | Can assumptions replace facts? | **Yes for this DB** — ASN-4C cohort assumptions are **uninstantiated** |
| 7 | What must repeat before other environments? | Full §3–§6 query suite on each distinct `DATABASE_URL` |

---

## 10. Query reference (reproducible)

Read-only queries used for cohort validation (identical to ASN-4C §3.1):

```sql
-- Totals
SELECT COUNT(*) FROM user_subscriptions;
SELECT COUNT(*) FROM user_subscriptions WHERE restaurantId = 0;
SELECT COUNT(*) FROM user_subscriptions WHERE restaurantId > 0;

-- H-A
SELECT COUNT(DISTINCT s.userId) FROM user_subscriptions s
WHERE s.restaurantId > 0
  AND NOT EXISTS (SELECT 1 FROM user_subscriptions a WHERE a.userId = s.userId AND a.restaurantId = 0)
  AND (SELECT COUNT(*) FROM user_subscriptions x WHERE x.userId = s.userId AND x.restaurantId > 0) = 1
  AND EXISTS (SELECT 1 FROM restaurants r WHERE r.id = s.restaurantId AND r.userId = s.userId)
  AND (SELECT COUNT(*) FROM restaurants r2 WHERE r2.userId = s.userId) <= 1;

-- H-B
SELECT COUNT(DISTINCT userId) FROM user_subscriptions
WHERE userId IN (SELECT userId FROM user_subscriptions WHERE restaurantId > 0)
  AND userId IN (SELECT userId FROM user_subscriptions WHERE restaurantId = 0);

-- H-C
SELECT COUNT(*) FROM (
  SELECT userId FROM user_subscriptions WHERE restaurantId > 0
  GROUP BY userId HAVING COUNT(*) > 1
) t
WHERE userId NOT IN (SELECT userId FROM user_subscriptions WHERE restaurantId = 0);

-- H-D
SELECT COUNT(*) FROM user_subscriptions s
LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId > 0
WHERE s.restaurantId > 0 AND (r.id IS NULL OR r.userId != s.userId);

-- H-E
SELECT COUNT(*) FROM user_subscriptions s
WHERE s.restaurantId > 0
  AND (
    s.stripeSubscriptionId IS NOT NULL OR s.stripeCustomerId IS NOT NULL
    OR EXISTS (SELECT 1 FROM invoices i WHERE i.subscriptionId = s.id)
  );
```

**Re-run command pattern** (no repo script committed):

```text
DATABASE_URL='<target-url>' node scripts/data-integrity-audit-phase2-readonly.mjs
AUDIT_TARGET=production|staging
```

---

## 11. Risks and gaps

| Gap | Severity | Action |
|-----|----------|--------|
| Single database audited (local `.env`) | **High** if prod differs | Re-run ASN-5A queries on production and staging URLs before backfill |
| No `role = user` accounts | Low | First real registration post-R1 creates account-scoped trial — monitor |
| Admin-only user may not reflect production user mix | Medium | Classify production owners after prod audit |
| Heuristic demo/test owner detection | Low | 0 subs — heuristics moot on this DB |

---

## 12. Recommended ASN-5 execution sequence (this database)

```text
1. Confirm DATABASE_URL target (document which environment)
2. R1 register cutover (restaurantId = 0 trial)     ← safe; no legacy rows
3. Wave A ordering alignment                         ← safe; no scoped authority in data
4. ASN-4C backfill                                   ← SKIP data migration; run zero-row verification only
5. Remove F-W1-03 / F-W1-04 per Wave A + empty cohort
6. Wave E/F admin and resolver cleanup               ← code retirement; schedule per ASN-3
```

If a **production** audit later shows non-zero cohorts, insert **ASN-4C R3-C execution** between steps 3 and 5.

---

## 13. Related documents

| Document | Relationship |
|----------|--------------|
| `ASN-4C-LEGACY-SUBSCRIPTION-BACKFILL-PLAN.md` | Cohort definitions validated here (all 0) |
| `COMMERCIAL-DATA-SNAPSHOT.md` | Prior snapshot — consistent with this audit |
| `ASN-4B.1-REGISTER-MIGRATION-PLAN.md` | R1 cleared for this data reality |
| `ASN-4B.2-WAVE-A-ORDERING-ALIGNMENT-PLAN.md` | Wave A unblocked for this data reality |

---

*End of ASN-5A audit. Read-only. No code, schema, or database changes were performed.*
