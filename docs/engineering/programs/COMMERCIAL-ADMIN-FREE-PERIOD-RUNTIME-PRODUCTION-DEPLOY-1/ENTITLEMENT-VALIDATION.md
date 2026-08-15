# ENTITLEMENT VALIDATION

Entitlement authority remains:

```
user_subscriptions.planId → Live Plan UUID → entitlement hub
```

Free Period does not set `status=trial` and does not change `planId` to a trial plan. Professional + 2-month concession remains Professional.

`getCommercialEntitlements` does not read concessions or Charged Terms. Catalog `publishedCatalogParticipatesInEntitlement` remains false.
