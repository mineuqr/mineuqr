# RESET-RECOMMENDATION.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1

---

## Recommended option: **C**

Full Commercial Catalog **data** reset + clean Live Plan bootstrap.

Not current `0086`. Not in-place conversion of `001`/`002`/retired v1.

---

## Why C is the only simple path

1. **No catalog consumer:** 0 bindings, 0 snapshots, 0 invoice/subscription FKs into `commercial_*`.
2. **Wrong published catalog:** only `001` and `002` are published; approved codes are retired.
3. **Owner and test subscriptions live on `subscription_plans` 30002/30003**, which C must **keep**.
4. Converting in place (A) would certify the admin experiment as production live plans.

---

## May be removed / truncated (catalog only)

- `commercial_plans`
- `commercial_plan_versions`
- `commercial_snapshot_definitions` (empty)
- `commercial_prices`
- `commercial_feature_bundles` / `commercial_bundle_features`
- `commercial_limit_profiles` / `commercial_limit_values`
- `commercial_trial_policies`
- `commercial_migration_policies`
- `commercial_retirement_policies`
- `commercial_promotions` (empty)
- `commercial_publication_rules` (empty)
- `commercial_regions` (re-seed `sa` with bootstrap if required)
- `commercial_billing_cycles` (re-seed monthly/yearly with bootstrap)
- `commercial_subscription_bindings` rows (already 0; **keep the table**)

---

## Must be retained

- `users`, `restaurants`
- `user_subscriptions` (including owner `600001` and internal `780001`)
- `invoices` (7 pending)
- `payments` (including orphan captured 349 SAR)
- `subscription_history`
- `subscription_plans` (30001–30003)
- `renewal_notifications`
- `orders`, `settlement_records`, check/settlement tables
- `__drizzle_migrations` history

---

## Future customer safety (architecture constraint)

Reset of catalog **must not** make billing history mutable:

| Layer | Rule after reset |
|-------|------------------|
| Live plan | Current capabilities and current list price |
| Binding (when subscribers exist) | Current-period **charged** amount stored on the binding |
| Invoice / payment | Immutable; never rewritten by plan edit or bootstrap |

Do **not** introduce a new snapshot freeze for standard plans. Do **not** backfill charged terms from live list price when null.

---

## Owner P0

C does not delete owner subscription `600001`. It does not create a new owner trial. Expired access remains a **separate P0** (`currentPeriodEnd` 2026-08-07). Flag as dependency for that repair; do not “fix” it inside the reset.
