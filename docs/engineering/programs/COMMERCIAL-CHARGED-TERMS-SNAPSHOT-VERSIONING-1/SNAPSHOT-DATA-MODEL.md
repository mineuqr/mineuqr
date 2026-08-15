# SNAPSHOT DATA MODEL

Table: `commercial_subscription_charged_terms`

| Column | Role |
|--------|------|
| id | UUID PK (not provider id) |
| subscriptionId | Parent subscription |
| planId | Live Plan UUID at commitment |
| chargedAmount / chargedCurrency | Frozen offer |
| billingCycleCode / billingCycleId | Frozen cycle |
| effectiveFrom | Commit timestamp |
| version | Per-subscription integer, unique with subscriptionId |
| source | admin_create / admin_update / webhook_bind / migration_0089 |
| actorId | Admin/webhook actor |
| createdAt | Insert time |

Insert-only. No UPDATE of financial columns. Unique `(subscriptionId, version)`.
