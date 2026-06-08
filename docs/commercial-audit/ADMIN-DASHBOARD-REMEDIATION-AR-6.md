# ADMIN DASHBOARD REMEDIATION — AR-6 — Commercial Authority Backfill Execution Runbook

**Program:** Admin Dashboard Remediation (AR)  
**Phase:** AR-6 — Commercial authority backfill execution runbook  
**Date:** 2026-06-08  
**Status:** Complete — runbook only  

**Mode:** Execution runbook only. **No execution, database writes, or migrations during AR-6 drafting.**

**Executes:** AR-3 Phase **M4** — Account Subscription Backfill  
**Target environment:** MineuQR launch database — `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr`  
**Not in scope:** Workspace `.env` Monu legacy database (`fcy9GqTzfuy9H9eCsDbdLA` — 0 subscriptions per ASN-5A)

**Upstream:** AR-1 through AR-5, ASN-4C (R3-C hybrid), DATA-INTEGRITY-1 Phase E / E1 / 1R

---

## 1. Executive Recommendation

Execute migration in **controlled phases** on the **launch database only**, with readonly dry-run and full backup before any write.

```text
Backup
  ↓
Dry Run (readonly)
  ↓
H-A — User 1
  ↓
Validation
  ↓
H-C — User 14760004
  ↓
Validation
  ↓
Parity Check (M3)
  ↓
Legacy Retirement (status=expired only — no hard delete)
```

| Rule | Statement |
|------|-----------|
| Never | Direct replacement of runtime authority code during backfill |
| Never | Hard-delete scoped subscription rows |
| Always | Preserve invoice FK and subscription row ids where possible |
| Prefer | R3-A in-place for H-A (preserves `600001` id + invoice link) |
| Use | R3-B create-and-expire for H-C |

**Classification:**

```text
EXECUTION READY
CONTROLLED MIGRATION APPROVED
LOW-RISK BACKFILL PATH
```

**Launch DB scale:** 2 owners, 4 scoped rows, 1 invoice — bounded blast radius.

---

## 2. Deliverable 1 — Preconditions Checklist (AR-6.1)

**No execution before ALL gates pass.**

| Gate | Requirement | Verification | Status at AR-6 draft |
|------|-------------|--------------|----------------------|
| **A** | Production backup exists | TiDB point-in-time or logical dump of `mineuqr` with `user_subscriptions`, `invoices`, `renewal_notifications` | **Pending execution** |
| **B** | Rollback plan documented | §8 — full restore, no partial | **Complete** (this doc) |
| **C** | DATA-INTEGRITY audit archived | `DATA-INTEGRITY-1-AUDIT.md` Phase E/E1 + 1R JSON snapshot dated | **Complete** |
| **D** | AR-2 authority model approved | `ADMIN-DASHBOARD-REMEDIATION-AR-2.md` | **Complete** |
| **E** | AR-4 API implementation complete | `CommercialReadService`, `admin.getDashboardSummary`, `getOwnerOverview*` deployed | **Pending implementation** |
| **F** | `CommercialReadService` deployed | Staging smoke: `getCommercialEntitlements` returns non-NONE for backfilled owners | **Pending implementation** |
| **G** | Parity comparison completed | AR-3 M3 dry-run report baseline stored | **Pending dry run** |

### 2.1 Additional operational preconditions

| # | Check |
|---|-------|
| 1 | Operator uses **MineuQR** `DATABASE_URL` (not workspace Monu `.env`) |
| 2 | ASN-5 Wave A ordering alignment deployed (`resolveGuestOrderingAllowed` canonical) |
| 3 | Execution window communicated — admin dashboard may show dual metrics during validation |
| 4 | `PROTECTED_USER_IDS` user `1` — no user delete/demote during migration |
| 5 | Readonly dry-run script output archived before writes |

### 2.2 Gate dependency graph

```text
A (backup) + C (audit) + D (AR-2 approved)
  → G (dry run / parity baseline)
  → E + F (AR-4 server live)
  → EXECUTION AUTHORIZED
```

---

## 3. Deliverable 2 — Cohort Classification (AR-6.2)

### 3.1 Launch database owner cohorts

| Owner | Role | Scoped rows | Account row | Restaurants | Cohort | Risk | Mechanism |
|-------|------|-------------|-------------|-------------|--------|------|-----------|
| **1** | `admin` | **1** (`600001` BASIC → `720007`) | **0** | 1 (`720007`) | **H-A** | **LOW** | **R3-A** in-place `restaurantId → 0` |
| **14760004** | `user` | **3** (600002 PRO, 630001 BASIC, 630002 BASIC) | **0** | 4 (720002–720006) | **H-C** | **HIGH** | **R3-B** INSERT account + expire scoped |

**Not present on launch DB:** H-B (mixed account+scoped), H-D (orphan), H-E as primary cohort — but **H-E checks still required** for invoice/Stripe on User 1.

### 3.2 Cohort definitions

| Cohort | Pattern | Launch example |
|--------|---------|----------------|
| **H-A** | Owner → exactly **1** scoped row, no account row | User `1` |
| **H-B** | Account row exists + scoped rows | — (0 owners) |
| **H-C** | Multiple scoped rows, no account row | User `14760004` |
| **H-D** | Orphan / owner mismatch | — (0 rows, 1R clean) |
| **H-E** | Billing linkage on scoped row | **Verify** User `1` invoice → sub `600001` |

### 3.3 Subscription row reference

| Sub ID | User | restaurantId | Status | planId | Plan |
|--------|------|-------------|--------|--------|------|
| 600001 | 1 | 720007 | `active` | 30001 | BASIC |
| 600002 | 14760004 | 720006 | `active` | 30002 | PROFESSIONAL |
| 630001 | 14760004 | 720003 | `active` | 30001 | BASIC |
| 630002 | 14760004 | 720005 | `active` | 30001 | BASIC |

### 3.4 Billing artifacts (pre-execution facts)

| Artifact | Count | Owner attribution |
|----------|------:|-------------------|
| Invoices | **1** (system total) | **User 1** — preserve; confirm `subscriptionId = 600001` at dry run |
| Stripe ids on scoped rows | Verify at dry run | Query L6 (ASN-4C §3.1) |
| `renewal_notifications` | **91** (system) | User `14760004` share — remain on retired row ids (no hard delete) |

---

## 4. Deliverable 3 — Dry Run Procedure (AR-6.3)

### 4.1 Objective

Readonly simulation producing winner/loser table. **No writes.**

### 4.2 Environment setup

```text
DATABASE_URL = <MineuQR TiDB console URL for mineuqr>
NODE_TLS_REJECT_UNAUTHORIZED = (per AUDIT-TOOLING-1 / tidb-audit-connection)
```

Use `scripts/data-integrity-1r-mineuqr-readonly.mjs` or ephemeral readonly script — **SELECT only**.

### 4.3 Mandatory readonly queries (pre-execution)

```sql
-- DR-1: Full scoped inventory
SELECT id, userId, restaurantId, planId, status, billingCycle,
       currentPeriodStart, currentPeriodEnd, trialEndsAt,
       stripeSubscriptionId, stripeCustomerId, createdAt
FROM user_subscriptions
ORDER BY userId, id;

-- DR-2: Account rows (expect 0 pre-backfill)
SELECT COUNT(*) AS account_rows FROM user_subscriptions WHERE restaurantId = 0;

-- DR-3: Invoice linkage
SELECT i.id, i.userId, i.subscriptionId, s.restaurantId, s.planId, s.status
FROM invoices i
LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId;

-- DR-4: Renewal notifications per subscription
SELECT subscriptionId, COUNT(*) AS c
FROM renewal_notifications
GROUP BY subscriptionId;

-- DR-5: Orphan / owner mismatch (expect 0)
SELECT s.id, s.userId, s.restaurantId, r.userId AS restaurant_owner
FROM user_subscriptions s
LEFT JOIN restaurants r ON r.id = s.restaurantId
WHERE s.restaurantId > 0 AND (r.id IS NULL OR r.userId != s.userId);

-- DR-6: Plan catalog (tier ranking)
SELECT id, nameEn, priceMonthly, priceYearly FROM subscription_plans ORDER BY id;
```

### 4.4 Dry-run winner selection (apply §5 rules in script or spreadsheet)

Run `pickCanonicalSubscription` logic + tier override (§5.2) per owner.

### 4.5 Expected dry-run output (launch DB — confirm at execution)

| Owner | Candidates | BR-01 pick | Tier override | **Winner** | **Losers** | Mechanism |
|-------|------------|------------|-----------------|------------|------------|-----------|
| **1** | 600001 | 600001 | N/A (single row) | **600001** | — | R3-A in-place |
| **14760004** | 600002, 630001, 630002 | *period/id dependent* | **600002** if PRO tier wins | **600002** (PROFESSIONAL) | 630001, 630002 | R3-B insert + expire |

**Result column (post-simulation):**

| Owner | Expected canonical plan | Expected account row source |
|-------|-------------------------|----------------------------|
| 1 | BASIC `active` | 600001 with `restaurantId = 0` |
| 14760004 | PROFESSIONAL `active` | New INSERT copied from 600002 |

### 4.6 Dry-run verification checklist

| Check | Pass criteria |
|-------|---------------|
| Chosen subscription | Matches §5 rules |
| Chosen plan | Highest tier among entitled actives (14760004 → PRO) |
| Invoice links | User 1 invoice remains on sub `600001` after R3-A |
| Restaurant links | Scoped `restaurantId` values documented; account row uses `0` |
| No account row pre-exists | `account_rows = 0` |

**Archive:** Dry-run JSON + query output → `docs/commercial-audit/executions/AR-6-DRY-RUN-<date>.json` (create at execution time).

---

## 5. Deliverable 4 — Canonical Selection Procedure (AR-6.4)

### 5.1 Rule stack (normative)

**Rule 1 — Base pick**

```text
pickCanonicalSubscription(scoped_rows_for_owner)
```

Uses `server/subscriptionResolver.ts` ordering:

1. Entitled `trial`/`active` rank above elapsed/canceled  
2. Furthest period end (`currentPeriodEnd` / `trialEndsAt`)  
3. Highest `id` tie-break  

**Rule 2 — Tier override (multi-plan peers)**

When multiple entitled `active` rows remain after Rule 1 **or** Rule 1 picks a lower tier while a higher tier peer is equally entitled:

```text
Priority order:
  1. Highest entitlement tier (catalog rank: PROFESSIONAL > BASIC > …)
  2. Furthest active period end
  3. Newest createdAt
  4. Highest id
```

**AR-6 decision for launch DB User 14760004:** Winner = **600002** (PROFESSIONAL) regardless of id tie-break among BASIC rows.

**Rule 3 — Account row creation**

| Cohort | Action |
|--------|--------|
| H-A winner | **Same row** — `UPDATE restaurantId = 0` |
| H-C winner | **New row** — `INSERT` with `restaurantId = 0`, fields copied from winner |

**Copy fields from winner:** `userId`, `planId`, `status`, `billingCycle`, `stripeSubscriptionId`, `stripeCustomerId`, `currentPeriodStart`, `currentPeriodEnd`, `trialEndsAt`, `canceledAt`

---

## 6. Deliverable 5 — Execution Procedure (AR-6.5, AR-6.6, AR-6.7)

### 6.1 Execution order

```text
1. H-A — User 1        (LOW risk — single row, invoice preservation)
2. Validate User 1
3. H-C — User 14760004 (HIGH risk — merge)
4. Validate User 14760004
5. Global parity check
```

**Rationale:** Invoice-linked admin row first; learnings before multi-row merge.

---

### 6.2 H-A execution — User 1 (AR-6.5)

**Pre-check:**

| Check | Expected |
|-------|----------|
| Cohort | H-A |
| Scoped count | 1 (`600001`) |
| Account row | 0 |
| Invoice | If `invoices.subscriptionId = 600001` → R3-A **preferred** (id preserved) |

**Action (R3-A):**

```sql
-- TEMPLATE ONLY — execute only after Gate A backup + operator sign-off
START TRANSACTION;

UPDATE user_subscriptions
SET restaurantId = 0,
    updatedAt = UTC_TIMESTAMP()
WHERE id = 600001
  AND userId = 1
  AND restaurantId = 720007
  AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions a
    WHERE a.userId = 1 AND a.restaurantId = 0 AND a.id != 600001
  );

-- Expect affected_rows = 1
COMMIT;
```

**Post-state:**

```text
Sub 600001: userId=1, restaurantId=0, status=active, planId=30001 (BASIC)
```

**User 1 special case (`role = admin`):**

| Path | Expected |
|------|----------|
| `getCommercialEntitlements(1)` | May still return `plan: ADMIN` (role bypass) |
| `pickUserLevelSubscription` | Returns 600001 — **account row exists** |
| Non-admin metrics | User 1 excluded from paying MRR per AR-4 policy |

---

### 6.3 H-C execution — User 14760004 (AR-6.6)

**Pre-check:**

| Check | Expected |
|-------|----------|
| Cohort | H-C |
| Scoped count | 3 |
| Account row | 0 |
| Invoices on scoped rows | **0** attributed (E1) — expire safe |
| Winner | **600002** PROFESSIONAL |

**Action (R3-B) — template:**

```sql
-- TEMPLATE ONLY — execute only after Gate A backup + operator sign-off
START TRANSACTION;

-- Step 1: INSERT account row from winner 600002 (columns from DR-1 snapshot)
INSERT INTO user_subscriptions (
  userId, restaurantId, planId, status, billingCycle,
  stripeSubscriptionId, stripeCustomerId,
  currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt,
  createdAt, updatedAt
)
SELECT
  userId, 0, planId, status, billingCycle,
  stripeSubscriptionId, stripeCustomerId,
  currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt,
  UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM user_subscriptions
WHERE id = 600002 AND userId = 14760004;

SET @new_account_sub_id = LAST_INSERT_ID();

-- Step 2: Retire scoped rows (NO HARD DELETE)
UPDATE user_subscriptions
SET status = 'expired',
    updatedAt = UTC_TIMESTAMP()
WHERE userId = 14760004
  AND restaurantId > 0
  AND id IN (600002, 630001, 630002);

COMMIT;
```

**Note:** Winner `600002` is both copied to new account row **and** expired as scoped — account row holds entitled state; scoped copy is historical.

**Alternative (if billing requires single row id):** H-E path — re-link notifications to `@new_account_sub_id` before expiring 600002; document in execution log.

**Post-state:**

```text
New account row: restaurantId=0, PROFESSIONAL, active (from 600002)
600002, 630001, 630002: status=expired, restaurantId unchanged
```

---

### 6.4 Invoice protection (AR-6.7)

**Before modifying any row:**

```sql
SELECT * FROM invoices WHERE subscriptionId IN (
  SELECT id FROM user_subscriptions WHERE userId IN (1, 14760004)
);
```

| Rule | Action |
|------|--------|
| Invoice references subscription | **NO HARD DELETE** of that subscription row |
| R3-A on invoiced row | **Allowed** — same `id`, only `restaurantId` changes |
| R3-B with new INSERT | Re-link `invoices.subscriptionId` to new account row **if** invoice pointed at retired scoped id |
| No invoice | Expire scoped rows in place |

**Launch DB expectation:**

| Owner | Invoice risk | Action |
|-------|--------------|--------|
| User 1 | **1 invoice** on `600001` | R3-A preserves FK |
| User 14760004 | **0 invoices** | Expire only |

### 6.5 Renewal notification protection

| Rule | Detail |
|------|--------|
| `renewal_notifications.subscriptionId` | Remains on original row ids after expire |
| Hard delete | **Forbidden** if notifications exist |
| Future cleanup | Optional housekeeping post-launch — not part of AR-6 |

---

## 7. Deliverable 6 — Validation Procedure (AR-6.8)

Run **after each owner** and **once globally**.

### 7.1 Commercial validation (per owner)

| Check | Command / API | Pass criteria |
|-------|---------------|---------------|
| Account row exists | `SELECT * FROM user_subscriptions WHERE userId=? AND restaurantId=0` | Exactly **1** entitled row |
| `pickUserLevelSubscription` | Server unit test or script | Returns account row |
| Plan | `CommercialReadService.getOwnerCommercialState(userId)` | Matches dry-run winner plan |
| Entitlements | `getCommercialEntitlements(userId)` | `features.*` match plan matrix |
| Trial | `commercial.getOwnerTrialStatus` | `isTrial = false` (all active pre-backfill) |

**User 14760004 expected post-backfill:**

```text
plan: PROFESSIONAL (or NONE if period invalid — verify periods at dry run)
status: active
ordering: per resolveGuestOrderingAllowed
```

### 7.2 Dashboard validation (requires AR-4 + AR-5 deployed)

| Surface | API | Pass criteria |
|---------|-----|---------------|
| Users panel | `admin.getOwnerOverviewList` | Same plan/status as §7.1 |
| KPI strip | `admin.getDashboardSummary` | `activeSubscriptions` = owner count, not row count |
| Statistics table | `admin.getSubscriptionOverview` | **1 row per owner** |
| Restaurant cards | `admin.listRestaurants` | `ownerCommercial` identical for same `userId` |

### 7.3 Metrics validation

| Metric | Before (S6) | After (canonical) | Launch expectation |
|--------|-------------|-------------------|-------------------|
| MRR | 4× row sum | Owner sum | **Decrease** — 14760004: 3→1 unit |
| Active subscriptions | 4 rows | 2 owners (or 1 paying user) | **Correct** |
| User 1 MRR | 1× BASIC | Excluded if `ADMIN` policy | Per AR-4 |

**Parity rule:** Document explained deltas in execution log — not a rollback trigger if expected.

### 7.4 Ordering validation

| Check | Method |
|-------|--------|
| Guest ordering on `720007` | `resolveGuestOrderingAllowed` for owner `1` |
| Test venues `720003`–`720006` | Ordering follows **owner** entitlements, not scoped row |

### 7.5 Per-owner validation sign-off

| Owner | Commercial ✓ | Dashboard ✓ | Metrics ✓ | Ordering ✓ | Operator initial |
|-------|:------------:|:-------------:|:---------:|:----------:|------------------|
| 1 | | | | | |
| 14760004 | | | | | |

---

## 8. Deliverable 7 — Rollback Procedure (AR-6.9)

### 8.1 Rollback triggers

| Trigger | Severity |
|---------|----------|
| Plan mismatch vs dry-run | **ROLLBACK** |
| Entitlement mismatch (ordering denied unexpectedly) | **ROLLBACK** |
| Dashboard shows conflicting states per owner | **ROLLBACK** |
| Metric mismatch **unexpected** | **ROLLBACK** |
| Invoice FK broken | **ROLLBACK** |
| Partial owner success with later owner failure | **ROLLBACK** (full) |

**Not rollback triggers (document only):**

| Expected delta | Example |
|----------------|---------|
| MRR decrease from deduplication | 14760004 3→1 |
| Legacy S6 dashboard still wired | Fix forward — AR-5 client |

### 8.2 Rollback action

```text
STOP all write operations
  ↓
Restore mineuqr from Gate A backup (full database or table-level user_subscriptions + invoices)
  ↓
Verify DR-1 query matches pre-execution snapshot
  ↓
Re-run DATA-INTEGRITY-1R readonly suite
  ↓
Incident log + root cause before re-attempt
```

| Rule | Statement |
|------|-----------|
| **No partial rollback** | Restore entire backup snapshot |
| **No** manual patch of single row in production without backup |
| Re-attempt | New dry run required |

### 8.3 H-A specific rollback

```sql
-- TEMPLATE: restore restaurantId if row-level restore from snapshot
UPDATE user_subscriptions SET restaurantId = 720007 WHERE id = 600001 AND userId = 1;
```

### 8.4 H-C specific rollback

```sql
-- TEMPLATE: delete inserted account row; restore scoped statuses from snapshot
DELETE FROM user_subscriptions WHERE userId = 14760004 AND restaurantId = 0 AND id = @new_account_sub_id;
UPDATE user_subscriptions SET status = 'active' WHERE id IN (600002, 630001, 630002);
```

Prefer **full backup restore** over manual H-C rollback.

---

## 9. Deliverable 8 — Completion Criteria (AR-6.10)

Migration **complete** when:

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Account subscriptions exist | `COUNT(restaurantId=0) >= 2` entitled rows on launch DB |
| 2 | `CommercialReadService` resolves correctly | API test per owner |
| 3 | Dashboard parity verified | AR-5 §8 criteria |
| 4 | Metrics parity verified | Canonical MRR documented |
| 5 | Ordering parity verified | Guest order smoke test |
| 6 | Scoped rows retired | 3 rows `expired` for 14760004; User 1 row at `restaurantId=0` |
| 7 | No consumer reads scoped authority | AR-5 client migration complete (follow-on) |

**Post-AR-6 follow-on (not blocking backfill):**

| Item | Program |
|------|---------|
| Client dashboard migration | AR-5 execution |
| Legacy resolver removal | AR-3 M6/M7 |
| Test user / venue cleanup | DATA-INTEGRITY Phase F — optional |

---

## 10. Deliverable 9 — Launch Sign-Off Checklist (AR-6.11)

### 10.1 Technical sign-off

| Item | Owner | ✓ |
|------|-------|:-:|
| Authority parity — `getCommercialEntitlements` per owner | Engineering | |
| Metrics parity — canonical MRR documented | Engineering | |
| Dashboard parity — overview APIs match truth | Engineering | |
| DATA-INTEGRITY-1R re-run PASS | Engineering | |
| Dry-run archive attached | Engineering | |
| Execution log attached | Engineering | |

### 10.2 Commercial sign-off

| Item | Owner | ✓ |
|------|-------|:-:|
| Subscription state matches business intent | Product/Ops | |
| User 1 demo venue BASIC preserved (account-scoped) | Product/Ops | |
| User 14760004 PROFESSIONAL merge approved | Product/Ops | |
| Billing / invoice intact (User 1) | Product/Ops | |
| MRR deduplication acknowledged | Product/Ops | |

### 10.3 Operational sign-off

| Item | Owner | ✓ |
|------|-------|:-:|
| Backup verified restorable | Ops | |
| Rollback drill documented | Ops | |
| MineuQR `DATABASE_URL` used (not Monu) | Ops | |
| No hard deletes performed | Ops | |
| `renewal_notifications` preserved on retired ids | Ops | |

---

## 11. Execution Timeline (recommended)

| Step | Duration | Owner |
|------|----------|-------|
| Gate A — backup | 30 min | Ops |
| Gate G — dry run | 1 hr | Engineering |
| H-A User 1 + validate | 30 min | Engineering |
| H-C User 14760004 + validate | 1 hr | Engineering |
| Global parity + sign-off | 1 hr | Engineering + Product |
| **Total** | ~4 hr | |

---

## 12. Post-execution state diagram

```text
BEFORE:
  User 1:        [600001 scoped BASIC @ 720007]
  User 14760004: [630001 BASIC @ 720003] [630002 BASIC @ 720005] [600002 PRO @ 720006]
  Account rows:  0

AFTER:
  User 1:        [600001 ACCOUNT BASIC @ restaurantId=0]
  User 14760004: [NEW_ID ACCOUNT PRO @ restaurantId=0]
                 [600002, 630001, 630002 expired scoped — historical]
  Account rows:  2
```

---

## 13. Deliverables Checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Preconditions Checklist | §2 |
| 2 | Cohort Classification | §3 |
| 3 | Dry Run Procedure | §4 |
| 4 | Canonical Selection Procedure | §5 |
| 5 | Execution Procedure | §6 |
| 6 | Validation Procedure | §7 |
| 7 | Rollback Procedure | §8 |
| 8 | Completion Criteria | §9 |
| 9 | Launch Sign-Off Checklist | §10 |

---

## 14. Related documents

| Document | Relationship |
|----------|--------------|
| `ADMIN-DASHBOARD-REMEDIATION-AR-3.md` | M4 phase definition |
| `ASN-4C-LEGACY-SUBSCRIPTION-BACKFILL-PLAN.md` | R3-C cohort mechanics |
| `DATA-INTEGRITY-1-AUDIT.md` Phase E/E1 | Launch inventory |
| `ADMIN-DASHBOARD-REMEDIATION-AR-4.md` | Post-backfill read APIs |
| `ADMIN-DASHBOARD-REMEDIATION-AR-5.md` | Dashboard consumer migration |

---

```text
EXECUTION READY
CONTROLLED MIGRATION APPROVED
LOW-RISK BACKFILL PATH
```

*End of AR-6. Runbook only. No execution, database writes, or migrations performed during drafting.*
