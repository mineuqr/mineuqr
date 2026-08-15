# MIGRATION-REPORT

```
BEFORE                          AFTER
subscription_plans ── listPlans     Live Plan ── listPlans (else [])
subscription_plans ── DTO plan      Live Plan view
subscription_plans ── CRS name      Live Plan / bridge
subscription_plans ── trial id      Catalog / LEGACY_PLAN_BRIDGE
subscription_plans ── webhooks      Bridge identity + Live Plan name
subscription_plans ── invoice $     Charged Terms
subscription_plans ── notify name   Live Plan display
subscription_plans ── admin MRR     Canonical MRR (Charged Terms)
```

Unchanged: Checkout (already Live Plan), MRR calculator (already Charged Terms), entitlement hub, Charged Terms write policy, payment settlement.
