# FINAL-REPORT.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1  
**Date:** 2026-08-14  
**Database:** `mineuqr` (TiDB Cloud)  
**Terminus:** 0085. **0086 not applied.**  
**Mode:** READ-ONLY. No commit, push, deploy, seed, or data change.

---

# SAFE FOR CLEAN RESET

Clean reset means: **Commercial Catalog aggregate/versioning tables only**, then bootstrap Basic / Professional / Enterprise as live plans.

It does **not** mean deleting subscriptions, invoices, payments, users, or restaurants.

---

## Mandatory answers

### 1. Do real customer subscriptions exist?

**No.**

Three users. Two INTERNAL admins. One COMMERCIAL-classified user (`14760004`, `openId` prefix `local_sa…`) with zero orders, no Stripe, unpaid invoices only, all periods ended. Five `user_subscriptions` rows; four periods already ended; one internal admin yearly until 2027 with unpaid invoices. Zero catalog bindings.

### 2. Do real customer billing facts exist?

**No paid customer invoices.** Paid invoice count = 0.

**One orphaned captured Tap payment** (349 SAR, 2026-05-19, user `2700049` and subscription `240001` both **absent**). Charge IDs are `chg_TS*` / `cus_TS*` (Tap test-style). **Retain the row. It does not attach to the catalog.**

Seven pending USD invoices (owner / test / internal) are unpaid documents. **Retain. Do not rewrite.**

Restaurant `settlement_records` (39) are operational, not SaaS AR.

### 3. Are current Commercial Catalog records production business data or test/bootstrap data?

**Bootstrap + admin experiment.**

- 2026-07-30: persistent catalog bootstrap created Basic / Professional / Enterprise v1, then **retired them ~12 minutes later**.
- 2026-08-02: admin UI created published `001` / `002` (Arabic names). Those are the only published versions.
- Snapshots 0. Bindings 0. Promotions 0. Publication rules 0.

### 4. Can Versioned Catalog data be safely reset?

**Yes**, with the retain-list below. No live account references a version or snapshot.

### 5. Can 0086 safely be redesigned as a clean reset migration?

**Yes. Current 0086 must not be applied.** It would convert `001`/`002` into live plans and copy retired v1 onto the approved codes. Replace it with additive schema + catalog wipe + three-plan bootstrap. DROPs of version tables are optional phase 2 after hydrate is proven.

### 6. Should existing Basic / Professional / Enterprise records be preserved?

**No.** Their versions are retired; Basic list price is 0.00 USD; they are not the published catalog. Recreate from Projection bootstrap.

### 7. What is the safest and simplest migration path?

**OPTION C:** reset `commercial_*` catalog data, add live-plan columns, bootstrap the three approved live plans. Keep `subscription_plans` 30001–30003 and all instance/financial tables. Do not bind or rewrite owner subscription `600001`.

---

## Records/tables that may be removed (catalog)

`commercial_plans`, `commercial_plan_versions`, `commercial_snapshot_definitions`, `commercial_prices`, `commercial_feature_bundles`, `commercial_bundle_features`, `commercial_limit_profiles`, `commercial_limit_values`, `commercial_trial_policies`, `commercial_migration_policies`, `commercial_retirement_policies`, `commercial_promotions`, `commercial_publication_rules`, `commercial_regions`, `commercial_billing_cycles`.

Keep table `commercial_subscription_bindings` (0 rows).

---

## Records that must be retained

`users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `payments`, `subscription_history`, `renewal_notifications`, `orders`, `settlement_records`, check/settlement tables, `__drizzle_migrations`.

---

## Runtime references (section 12)

| Entity | Uncommitted live-plan code | Production DB | Notes |
|--------|----------------------------|---------------|--------|
| `commercial_plan_versions` | No Drizzle table; **0086 SQL only** + architecture test that forbids the table | 5 rows | Test-only + historical migration 0084 |
| `commercial_snapshot_definitions` | Not in schema; 0086 DROP | 0 rows | Empty |
| `commercial_publication_rules` | Not in schema; 0086 DROP | 0 rows | Empty |
| `commercial_retirement_policies` | Not in schema; 0086 DROP | 3 rows | Catalog metadata only |
| `planVersionId` | Removed from new Drizzle bindings/prices | Present on prices + bindings | Deploy-before-0086 still blocked for **code**, not because of customer data |
| Bindings | Live `planId` + charged terms in uncommitted schema | 0 rows, old columns | |
| `planFeatureMatrix` | Unbound fallback | Production entitlement path today (all unbound) | Must remain until subscribers are bound to live plans — **not** a catalog-table dependency |
| Admin catalog UI | Live save (uncommitted) | Would still show `001`/`002` if data kept | Reason to wipe rather than convert |
| Discovery / Projection / Presentation | Intact in code | N/A | Do not reset those layers |
| `subscription_plans` | Legacy checkout SSOT | 3 rows in use | **Runtime read+write for checkout/invoices** — retain |

No production code path requires keeping version **rows**. Uncommitted code already assumes they are gone from the schema; production schema still has them until a redesigned migration.

---

## Owner access

Owner `user_subscriptions.id=600001` is account-level Professional, status `active`, **period ended 2026-08-07**. Unbound. Catalog reset does not remove this row and does not create a trial. **P0 remains open and separate.**

---

## Future billing immutability

A clean catalog reset is compatible with:

- Live plan = current definition  
- Billing cycle / binding charged amount = historical commercial terms (when subscribers exist)  
- Invoice / payment = immutable  

Do not backfill charged terms from the live list price. Do not rewrite the 7 invoices or 5 payments.

---

## STOP

No migration applied. No data deleted. No owner repair. No commit / push / deploy.

Supporting evidence: `_QUERY-EVIDENCE.json`, `_QUERY-EVIDENCE-PAYMENTS.json`.
