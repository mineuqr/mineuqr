# ENTITLEMENT IMPACT

Entitlement remains:

```
Subscription → Live Plan UUID → Commercial Entitlement Hub
```

Binding / Charged Terms are **not** required for entitlement (`getCommercialEntitlements` / `resolveOwnerEntitlements`). Unbound UUID subscriptions still resolve live-plan capabilities.

A failed Charged Terms persist does not create a second entitlement system. Compensate deletes the lifecycle row so a failed create does not leave an entitled-but-incomplete commercial success.
