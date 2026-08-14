# PRE-MIGRATION-VALIDATION.md

**Queried:** 2026-08-14T21:28:41Z  
**Database:** `mineuqr` (TiDB Cloud)  
**Method:** SELECT only (`_snapshot.mjs pre` → `_pre.json`)  
**Result:** **PASS** — no STOP condition. Migration was authorized to proceed.

This is a **fresh** production preflight. It does not rely on the prior forensic JSON as the sole evidence.

---

## Gate table

| # | Check | Result |
|---|-------|--------|
| 1 | commercial bindings | **0** |
| 2 | commercial snapshots | **0** (`commercial_snapshot_definitions` existed, empty) |
| 3 | active subscription references a commercial catalog object | **none** — `user_subscriptions.planId` is `30002`, `30003` only |
| 4 | invoice references commercial catalog | **none** (no catalog columns) |
| 5 | payment references commercial catalog | **none** (no catalog columns) |
| 6 | restaurant references commercial catalog | **none** (no catalog columns) |
| 7 | user_subscription references commercial catalog | **none** (no version/snapshot/UUID catalog columns) |
| 8 | orphaned Tap payment unchanged | **60001** 349.00 SAR `captured`, paidAt 2026-05-19T09:39:13Z |
| 9 | owner `600001` unchanged vs forensics | userId 1, restaurantId 0, planId 30002, status `active`, period end 2026-08-07T21:00:00Z, updatedAt 2026-06-09T18:28:40Z |
| 10 | production migration terminus | **0085** (`c104e894606f…`, `__drizzle_migrations.id` 5994103) |

Live plan columns were **absent** on `commercial_plans` (0086 not yet applied). Price rows still keyed by `planVersionId`. Binding rows still keyed by `planVersionId` / `snapshotId` (0 rows).

---

## Pre-migration catalog inventory (to be wiped)

| Table | Count |
|-------|------:|
| commercial_plans | 5 (`001`, `002`, `basic`, `professional`, `enterprise`) |
| commercial_plan_versions | 5 |
| commercial_snapshot_definitions | 0 |
| commercial_publication_rules | 0 |
| commercial_retirement_policies | 3 |
| commercial_prices | 14 |
| commercial_subscription_bindings | 0 |
| commercial_feature_bundles | 5 |
| commercial_bundle_features | 65 |
| commercial_limit_profiles | 5 |
| commercial_limit_values | 29 |
| commercial_billing_cycles | 2 |
| commercial_trial_policies | 3 |
| commercial_migration_policies | 3 |
| commercial_regions | 1 |
| commercial_promotions | 0 |

Users = 3 (unchanged vs forensics: two INTERNAL admins + one COMMERCIAL test). No new customer subscriptions discovered.

---

## Platform fingerprint (must not change)

| Table | Count |
|-------|------:|
| users | 3 |
| restaurants | 6 |
| user_subscriptions | 5 |
| subscription_plans | 3 |
| invoices | 7 |
| payments | 5 |
| subscription_history | 2 |
| orders | 42 |
| settlement_records | 39 |

Checkout book before migrate:

| ID | Monthly USD | Yearly USD |
|----|-------------|------------|
| 30001 | 19.00 | 175.00 |
| 30002 | 39.00 | 349.00 |
| 30003 | 99.00 | 899.00 |

Governance: `pnpm db:governance-check` OK. `pnpm db:preflight` pending **only** `0086_commercial_live_plans`.
