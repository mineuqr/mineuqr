# PAID REACTIVATION

Terminated row (canceled / expired / read-time period-ended):

1. Resolve selected Live Plan + cycle offer (amount > 0)
2. Period end = Admin date or cycle-derived; must be strictly future
3. TX: Snapshot N+1 + `status=active` + plan/cycle/period + Binding `planId`
4. Audit `commercial_subscription_reactivated` mode=paid

Same historical amount still inserts N+1. `effectiveFrom=now`.

Already entitled + current snapshot matches selected offer: idempotent, no N+2.
