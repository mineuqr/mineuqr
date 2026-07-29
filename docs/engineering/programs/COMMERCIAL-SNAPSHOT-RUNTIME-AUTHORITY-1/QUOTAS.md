# QUOTAS

`resolvePlanLimitsForUser`:

- Binding present + Snapshot readable → `snapshotQuotaLimits` (restaurants / items / categories)
- Binding present + Snapshot unreadable → fail closed (zeros)
- No binding → Legacy `subscription_plans.max*`
