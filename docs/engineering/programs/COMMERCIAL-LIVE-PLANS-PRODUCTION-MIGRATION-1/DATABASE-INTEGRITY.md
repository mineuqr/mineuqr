# DATABASE-INTEGRITY.md

## Live catalog after bootstrap

| Check | Result |
|-------|--------|
| Live standard plans | **exactly 3** (`basic`, `professional`, `enterprise`) |
| Snapshots | table **ABSENT** |
| Version rows | table **ABSENT** |
| Publication rows | table **ABSENT** |
| Retirement rows | table **ABSENT** |
| Duplicate plan codes | **0** |
| Duplicate capability mappings | **0** |
| Duplicate prices | **0** |
| Orphaned Live Plan mappings | **0** |
| Bindings | **0** |

## Forbidden tables — counts pre vs post

| Table | Pre (0085) | Post (0086 + bootstrap) |
|-------|-----------:|------------------------:|
| users | 3 | 3 |
| restaurants | 6 | 6 |
| user_subscriptions | 5 | 5 |
| subscription_plans | 3 | 3 |
| invoices | 7 | 7 |
| payments | 5 | 5 |
| subscription_history | 2 | 2 |
| orders | 42 | 42 |
| settlement_records | 39 | 39 |

No SQL in 0086 targeted those tables. Bootstrap writes commercial catalog aggregates only.

## Catalog aggregates after bootstrap

| Table | Count |
|-------|------:|
| commercial_plans | 3 |
| commercial_prices | 10 |
| commercial_feature_bundles | 3 |
| commercial_bundle_features | 35 |
| commercial_subscription_bindings | 0 |

## Migration governance

- Do **not** re-run 0086.
- Journal recognizes 0086 as applied (`cfaec30e54892eaf…`).
- Re-running bootstrap: `already_initialized`, no duplicates.
