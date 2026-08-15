# ADMIN FLOW

No Production admin mutation was executed.

## Admin create (source)

1. `resolveLivePlanById` (UUID only)
2. `currentPriceForPlan(planId, selectedCycle)`
3. create subscription
4. create Binding
5. Snapshot #1 (`admin_create`)
6. fail closed / compensate if financial persist fails

## Admin plan/cycle change (source)

Inside `db.transaction` (`applyAdminCommercialIdentityChange`):

1. resolve Live Plan UUID
2. resolve current Live Plan offer for selected cycle
3. insert new immutable snapshot (`admin_update`) when offer differs
4. update current subscription identity
5. update enrollment `planId` only — leftover Binding charged columns are not rewritten

Previous snapshot rows are not UPDATE/DELETE rewritten.
