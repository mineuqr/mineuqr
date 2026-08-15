# ARCHITECTURE-GUARDS

File: `server/commercial-catalog/__tests__/livePlanIdentity.guards.test.ts`

| Guard | Meaning |
|-------|---------|
| GUARD-IDENTITY-01 | Live Plan UUID PK + unique code |
| GUARD-IDENTITY-02 | `subscription_plans.id` does not drive checkout/MRR |
| GUARD-IDENTITY-03 | `legacyPlanId` is not checkout price authority |
| GUARD-IDENTITY-04/05 | Entitlements/limits from Live Plan hub |
| GUARD-IDENTITY-06 | MRR from Charged Terms only |
| GUARD-IDENTITY-07 | No third plan table |
