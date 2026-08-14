# SUBSCRIPTION-DATA-FORENSICS.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1  
**Source:** `user_subscriptions` + `users` + `restaurants` + `commercial_subscription_bindings`  
**As of:** 2026-08-14 (UTC)

---

## Totals

| Metric | Count |
|--------|-------|
| Total subscriptions | 5 |
| Status `active` (column) | 4 |
| Status `expired` (column) | 1 |
| Status `canceled` | 0 |
| Status `trial` | 0 |
| Account-level (`restaurantId = 0`) | 4 |
| Restaurant-level | 1 |
| Stripe subscription / customer IDs | **0 / 0** |
| Catalog bindings | **0** |
| Snapshot bindings | **0** |
| Period already ended (`currentPeriodEnd < UTC_TIMESTAMP()`) | **4 of 5** |

Plan references are **only** legacy `subscription_plans.id`: `30002` (Professional) × 4, `30003` (Enterprise) × 1.  
No `planVersionId`. No `snapshotId`. No `commercial_plans.id`.

---

## Row-level classification

| Sub ID | User | Scope | Legacy plan | Status col | Period end | Period ended? | Stripe | Class |
|--------|------|-------|-------------|------------|------------|---------------|--------|-------|
| 600001 | 1 Khaled Sh (INTERNAL admin) | account | 30002 Professional | active | 2026-08-07 | **YES** | no | **B. Owner/developer** |
| 600002 | 14760004 مطعم sam (COMMERCIAL) | restaurant 720006 | 30002 | expired | 2026-07-07 | YES | no | **C. Dev/test** |
| 690001 | 14760004 | account | 30002 | active | 2026-06-13 | **YES** | no | **C. Dev/test** (stale active) |
| 750001 | 14760004 | account | 30002 | active | 2026-07-16 | **YES** | no | **C. Dev/test** (stale active) |
| 780001 | 21630002 سليمان (INTERNAL admin) | account | 30003 Enterprise | active | 2027-06-21 | no | no | **B. Internal developer** |

Orphan history (not in `user_subscriptions`):

| History sub ID | User ID | Plan | Amount | Notes |
|----------------|---------|------|--------|-------|
| 240001 | **2700049** (user **absent**) | 30002 yearly | 349 SAR captured Tap | **E. Orphaned** — user and subscription rows gone |

---

## Does any subscription belong to an actual customer?

**No paying customer subscription exists.**

Evidence against user `14760004` (the only `COMMERCIAL` classification):

- `openId` prefix `local_sa…` (local/dev identity, not a production OAuth owner)
- Three restaurants (`sam672`, `saaa`, `يييي`) with **0 orders**
- Last sign-in 2026-06-28
- No Stripe, no paid invoice, no captured payment on this user
- All of this user’s periods have ended

Evidence against calling the INTERNAL admins “customers”:

- User `1`: `accountClassification=INTERNAL`, `role=admin`, first platform user (2026-04-01), owns the only restaurant with orders (42)
- User `21630002`: `INTERNAL` admin; unpaid pending invoices; 0 restaurant orders

---

## Bindings

`commercial_subscription_bindings`: **0 rows**.

0086 `DELETE FROM commercial_subscription_bindings WHERE planId IS NULL` would delete **nothing**.

Runtime today: every subscriber is **unbound** → entitlement falls through the legacy `subscription_plans` / `planFeatureMatrix` path, not a catalog snapshot.
