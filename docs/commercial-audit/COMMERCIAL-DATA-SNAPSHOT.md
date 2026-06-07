# COMMERCIAL-DATA-SNAPSHOT.md

**PG-1B.2 — Phase 1 Commercial Data Snapshot**  
**Mode:** Read-only forensic snapshot  
**Branch:** main  
**Captured at:** 2026-06-07T10:56:51.462Z (UTC)  
**Database:** `fcy9GqTzfuy9H9eCsDbdLA` (from `DATABASE_URL` in local `.env`)  

No code changes, schema changes, database writes, commits, or fixes were performed.

**Method:** Read-only `SELECT` queries via local `DATABASE_URL`. Passwords, hashes, tokens, and connection secrets were not queried or recorded.

---

## SECTION 1 — User Inventory

### Totals

| Metric | Count |
|---|---|
| **Total users** | **1** |
| Admin users (`role = admin`) | 1 |
| Regular users (`role = user`) | 0 |

### User listing

| User ID | Email | Role | Created At (UTC) |
|---|---|---|---|
| 1 | k.sh61@yahoo.com | admin | 2026-04-01T19:12:37.000Z |

---

## SECTION 2 — Restaurant Inventory

### Totals

| Metric | Count |
|---|---|
| **Total restaurants** | **0** |

### Restaurant listing

*No rows in `restaurants`.*

### Ownership map

```
User 1 (k.sh61@yahoo.com, admin)
└─ (no restaurants)
```

---

## SECTION 3 — Subscription Inventory

### Totals

| Metric | Count |
|---|---|
| **Total subscription rows** | **0** |

### Scope classification

| Class | Definition | Count |
|---|---|---|
| **A — Account-level** | `restaurantId = 0` | 0 |
| **B — Restaurant-scoped** | `restaurantId > 0` | 0 |

### Subscription rows

*No rows in `user_subscriptions`.*

| Sub ID | User ID | User Email | Restaurant ID | Plan ID | Status | Billing Cycle | Period Start | Period End | Trial Ends At |
|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — | — |

---

## SECTION 4 — Active Subscriptions

### Count

| Metric | Count |
|---|---|
| **`status = active`** | **0** |

### Grouping

| Group by | Result |
|---|---|
| User | *(none)* |
| Plan | *(none)* |
| Restaurant scope (`restaurantId = 0` vs `> 0`) | *(none)* |

### Users with multiple active subscriptions

| User ID | Active row count |
|---|---|
| *(none)* | — |

---

## SECTION 5 — Trial Inventory

### Count

| Metric | Count |
|---|---|
| **`status = trial`** | **0** |

### Trial rows

| User ID | User Email | Plan ID | Restaurant Scope | Trial End Date |
|---|---|---|---|---|
| *(none)* | — | — | — | — |

### Expired trials still marked `trial`

Query: `status = 'trial' AND trialEndsAt IS NOT NULL AND trialEndsAt < UTC_TIMESTAMP()`

| Sub ID | User ID | Plan ID | Restaurant ID | Trial Ends At |
|---|---|---|---|---|
| *(none)* | — | — | — | — |

---

## SECTION 6 — Plan Inventory

### Totals

| Metric | Count |
|---|---|
| **Total plans** | **3** |
| Active plans (`isActive = 1`) | 3 |

### Plan catalog (`subscription_plans`)

| ID | Name (EN) | Name (AR) | Monthly Price (USD) | Yearly Price (USD) | Max Restaurants | Max Items | Max Categories | Sort Order | Active |
|---|---|---|---|---|---|---|---|---|---|
| 30001 | Basic Plan | الخطة الأساسية | 19.00 | 175.00 | 1 | 100 | 10 | 1 | Yes |
| 30002 | Professional Plan | الخطة الاحترافية | 39.00 | 349.00 | 5 | 500 | 25 | 2 | Yes |
| 30003 | Enterprise Plan | الخطة المؤسسية | 99.00 | 899.00 | 999 | 9999 | 100 | 3 | Yes |

**Forensic note (not an anomaly fix):** Plan id `30001` is named **Basic Plan** in this database. Application code also defines `BASIC_FREE_PLAN_ID = 30001` as the ordering-block tier (`server/subscriptionEntitlement.ts:7`). This alignment is documented for pre-change baseline; see PG-1A.6 inconsistency I-15.

**Price note:** Live plan prices (e.g. Professional $39/mo) differ from seed script reference values in `server/seed-plans.mjs` (Professional $35/mo). Snapshot reflects **database rows as stored**.

---

## SECTION 7 — Invoice Inventory

### Totals

| Metric | Count |
|---|---|
| **Total invoices** | **0** |

### Invoice listing

*No rows in `invoices`.*

| Invoice ID | User ID | User Email | Subscription ID | Amount | Currency | Status | Issued At | Created At |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

### Invoice → Subscription → User mapping

```
(no invoice rows)
```

---

## SECTION 8 — Commercial Anomalies

Identified only. **None fixed.**

| Check | Result |
|---|---|
| Multiple active subscriptions for same user | **None** (0 subscription rows) |
| Trial + active simultaneously for same user | **None** |
| Restaurant-scoped active subscriptions | **None** |
| Account-level subscriptions (`restaurantId = 0`) | **None** |
| Missing plan references on subscriptions | **None** |
| Missing user references on subscriptions | **None** |
| Orphan invoices (subscription id missing) | **None** |
| Expired trial records (`trial` status + past `trialEndsAt`) | **None** |
| Restaurants with no subscription coverage for owner | **None** (0 restaurants) |
| Duplicate commercial rows (same user/restaurant/plan) | **None** |

### Environmental / baseline observations (not row-level anomalies)

| Observation | Detail |
|---|---|
| **No commercial activity rows** | Zero restaurants, subscriptions, and invoices — snapshot is plan catalog + single admin user only |
| **Single admin-only user base** | No `role = user` accounts in database at capture time |
| **Plan id `30001` naming** | DB label "Basic Plan" vs code constant used for ordering denial (see Section 6) |

---

## SECTION 9 — Summary Statistics

| Statistic | Value |
|---|---|
| Total users | 1 |
| Admin users | 1 |
| Regular users | 0 |
| Total restaurants | 0 |
| Total subscription rows | 0 |
| Total active subscriptions | 0 |
| Total trial subscriptions | 0 |
| Total expired subscriptions (`status = expired`) | 0 |
| Total canceled subscriptions (`status = canceled`) | 0 |
| Total plans | 3 |
| Total invoices | 0 |
| Users with multiple active subscriptions | 0 |
| Users with trial + active | 0 |
| Restaurant-scoped subscription count (`restaurantId > 0`) | 0 |
| Account-level subscription count (`restaurantId = 0`) | 0 |

---

## Snapshot Provenance

| Item | Detail |
|---|---|
| Query tool | Ephemeral read-only script (temp file, not committed to repo) |
| Tables read | `users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices` |
| Writes performed | **None** |
| Connection | Local `.env` → `DATABASE_URL` |

---

*End of snapshot. Forensic baseline only. No migration. No cleanup. No fixes.*
