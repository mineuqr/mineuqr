# LIVE-PLAN-SCHEMA.md

After `0086` (not yet applied):

## Kept and evolved

| Table | Change |
|-------|--------|
| `commercial_plans` | ADD `featureBundleId`, `limitProfileId`, `trialPolicyId` |
| `commercial_prices` | `planId` NOT NULL; DROP `planVersionId` |
| `commercial_promotions` | `eligiblePlanIds` (was version ids) |
| `commercial_subscription_bindings` | `planId` NOT NULL + charged term columns; DROP `planVersionId`, `snapshotId` |
| Bundles, limits, trials, migrations, regions, billing cycles | Kept (wiped then bootstrapped) |

## Dropped

- `commercial_plan_versions`
- `commercial_snapshot_definitions`
- `commercial_publication_rules`
- `commercial_retirement_policies`

## Unchanged (forbidden domain)

`users`, `restaurants`, `user_subscriptions`, `subscription_plans`, `invoices`, `payments`, `subscription_history`, orders, settlement.
