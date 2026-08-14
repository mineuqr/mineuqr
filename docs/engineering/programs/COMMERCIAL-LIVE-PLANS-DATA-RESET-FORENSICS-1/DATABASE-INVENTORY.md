# DATABASE-INVENTORY.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1  
**Queried at:** 2026-08-14T21:03:26Z  
**Database:** `mineuqr` (TiDB Cloud)  
**Migration terminus:** **0085** (`__drizzle_migrations.id` 5994103). **0086 not applied.**  
**Method:** SELECT / `information_schema` only. Evidence: `_QUERY-EVIDENCE.json`, `_QUERY-EVIDENCE-PAYMENTS.json`.

Local `.env` did **not** contain `OWNER_OPEN_ID`, so owner matching is by account relationships (user `id=1`), not env equality.

---

## Schema vs 0086

| Object | Production today | 0086 / uncommitted Drizzle |
|--------|------------------|----------------------------|
| `commercial_plans.featureBundleId` | **absent** | expected |
| `commercial_prices.planVersionId` | **present** | dropped |
| `commercial_prices.planId` | **absent** | required |
| bindings `planVersionId` / `snapshotId` | **present** | dropped |
| bindings `planId` / `chargedAmount` | **absent** | required |
| `commercial_plan_versions` | present, 5 rows | DROP |
| `commercial_snapshot_definitions` | present, **0 rows** | DROP |

---

## Table inventory

Tables named in the brief that **do not exist:**  
`commercial_snapshots`, `commercial_publications`, `commercial_retirements`, `commercial_bindings`, `commercial_capability_mappings`, `commercial_plan_limits`.

| Table | Rows | Oldest | Newest | Notes |
|-------|------|--------|--------|-------|
| `commercial_plans` | 5 | 2026-07-30 | 2026-08-02 | 3 bootstrap + 2 admin `001`/`002` |
| `commercial_plan_versions` | 5 | 2026-07-30 | 2026-08-02 | 3 retired (standard), 2 published (`001`,`002`) |
| `commercial_snapshot_definitions` | **0** | — | — | Empty |
| `commercial_prices` | 14 | 2026-07-30 | 2026-08-02 | Tied to versions |
| `commercial_billing_cycles` | 2 | 2026-07-30 | 2026-07-30 | `monthly`, `yearly` |
| `commercial_feature_bundles` | 5 | 2026-07-30 | 2026-08-02 | 3 bootstrap + 2 admin |
| `commercial_bundle_features` | 65 | — | — | Capability rows |
| `commercial_limit_profiles` | 5 | 2026-07-30 | 2026-08-02 | |
| `commercial_limit_values` | 29 | — | — | |
| `commercial_trial_policies` | 3 | 2026-07-30 | 2026-08-02 | |
| `commercial_migration_policies` | 3 | 2026-07-30 | 2026-08-02 | |
| `commercial_retirement_policies` | 3 | 2026-07-30 | 2026-08-02 | |
| `commercial_regions` | 1 | 2026-07-30 | 2026-07-30 | `sa` / SAR |
| `commercial_promotions` | **0** | — | — | |
| `commercial_publication_rules` | **0** | — | — | |
| `commercial_subscription_bindings` | **0** | — | — | No live account is catalog-bound |
| `subscription_plans` | 3 | 2026-04-30 | 2026-04-30 | Legacy IDs 30001–30003 |
| `user_subscriptions` | 5 | 2026-06-08 | 2026-06-21 | See SUBSCRIPTION-DATA-FORENSICS |
| `invoices` | 7 | 2026-06-09 | 2026-08-03 | All `pending`, none paid |
| `payments` | 5 | 2026-05-19 | 2026-05-19 | 4 declined + 1 captured orphan |
| `subscription_history` | 2 | 2026-05-19 | 2026-05-19 | Orphan activation for missing user |
| `renewal_notifications` | 47 | — | — | All `new_order` (ops, not billing) |
| `users` | 3 | 2026-04-01 | 2026-06-21 | 2 INTERNAL admin + 1 COMMERCIAL |
| `restaurants` | 6 | 2026-06-07 | 2026-06-21 | |
| `orders` | 42 | — | — | All on owner restaurant `720007` |
| `settlement_records` | 39 | — | — | Restaurant settlement, not SaaS billing |
| `check_settlement_transactions` | 35 | — | — | Same |

Check-split payment tables: all **0** rows.

---

## Foreign-key / live-account references

There are **no SQL foreign keys** from `user_subscriptions` / `invoices` / `payments` into `commercial_*` tables.

| Consumer | Catalog reference? |
|----------|-------------------|
| `user_subscriptions.planId` | Legacy `subscription_plans.id` (30001–30003) only |
| `invoices.subscriptionId` | `user_subscriptions.id` |
| `payments` | `userId` / `subscriptionId` / `invoiceId` — **not** catalog version IDs |
| `commercial_subscription_bindings` | **empty** |
| Snapshots | **empty** |

**No live account row references a commercial plan version, snapshot, or publication.**

---

## Classification of catalog rows

| Set | Evidence | Class |
|-----|----------|--------|
| `basic` / `professional` / `enterprise` + v1 | Created 2026-07-30 18:14 by persistent catalog bootstrap; **retired 12 minutes later** (18:26) | **D. Bootstrap/seed** then abandoned |
| `001` / `002` + published v2 | Created 2026-08-02 07:29–07:35 via admin catalog UI; Arabic names; not approved codes | **C. Development/test** (admin experiment) |
| Bundles/limits/trials `*-features` / `001-*` / `002-*` | Same timestamps as plans | **D / C** |
| Snapshots / promotions / publication rules / bindings | Zero rows | **F. Empty infrastructure** |
