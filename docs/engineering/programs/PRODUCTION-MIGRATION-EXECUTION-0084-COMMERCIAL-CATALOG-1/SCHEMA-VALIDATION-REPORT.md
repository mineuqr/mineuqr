# SCHEMA-VALIDATION-REPORT — 0084

## Tables (15/15 present)

| Table | Present |
|-------|---------|
| commercial_plans | ✓ |
| commercial_plan_versions | ✓ |
| commercial_prices | ✓ |
| commercial_billing_cycles | ✓ |
| commercial_feature_bundles | ✓ |
| commercial_bundle_features | ✓ |
| commercial_limit_profiles | ✓ |
| commercial_limit_values | ✓ |
| commercial_trial_policies | ✓ |
| commercial_promotions | ✓ |
| commercial_regions | ✓ |
| commercial_publication_rules | ✓ |
| commercial_migration_policies | ✓ |
| commercial_retirement_policies | ✓ |
| commercial_snapshot_definitions | ✓ |

## Constraints / indexes

- Primary keys on all tables: **present**
- Unique code constraints (plans, cycles, bundles, limits, trials, promotions, regions, policies, publication rules): **present**
- Composite unique (`planId`+`versionCode`, bundle features, limit values): **present**
- Supporting indexes (version, region, profile, bundle): **present**
- `information_schema.STATISTICS` rows for commercial_* : **37**

## Foreign keys

SQL migration defines **application-level** references (no `FOREIGN KEY` DDL). Valid per foundation design.

## Drift

- Preflight post: **no pending** journal migrations  
- Expected tables: **none missing**  
- Additive only — no ALTER of existing tenant/business tables
