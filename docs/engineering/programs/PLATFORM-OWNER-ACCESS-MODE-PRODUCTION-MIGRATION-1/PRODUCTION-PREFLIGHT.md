# PRODUCTION-PREFLIGHT.md

Read-only. `_pre.json`.

## Terminus

Latest: **0086** id `6024102` hash `cfaec30e54892eaf…`

0087 hash not present. Table `platform_owner_access_mode` absent.

## Protected baseline

| Table | Count |
|-------|------:|
| commercial_plans | 3 |
| commercial_prices | 10 |
| commercial_subscription_bindings | 0 |
| commercial_feature_bundles | 3 |
| commercial_bundle_features | 34 |
| commercial_limit_profiles | 3 |
| commercial_limit_values | 9 |
| commercial_billing_cycles | 2 |
| users | 3 |
| restaurants | 6 |
| user_subscriptions | 5 |
| subscription_plans | 3 |
| invoices | 7 |
| payments | 5 |
| subscription_history | 2 |
| orders | 42 |
| settlement_records | 39 |

Live plans: `basic`, `professional`, `enterprise`.

Owner user 1: INTERNAL admin, openId prefix `j4Ztx2Wi`.

Subscription `600001`: userId 1, restaurantId 0, planId 30002, status `active`, period end 2026-08-07T21:00:00Z, updatedAt 2026-06-09T18:28:40Z.

Tap `60001`: 349.00 SAR `captured`, paidAt 2026-05-19T09:39:13Z.

Bindings: 0.

**Preflight gate: PASS.**
