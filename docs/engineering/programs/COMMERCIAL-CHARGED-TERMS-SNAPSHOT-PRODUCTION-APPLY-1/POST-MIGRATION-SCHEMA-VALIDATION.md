# POST-MIGRATION SCHEMA VALIDATION

Post-apply `_POST-APPLY.json` `2026-08-15T17:43:23.747Z` / server `14:43:20Z`.

| Object | Result |
|--------|--------|
| Table `commercial_subscription_charged_terms` | **present** |
| Columns | id, subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleId, billingCycleCode, effectiveFrom, version, source, actorId, createdAt |
| PRIMARY | id |
| UNIQUE | `commercial_charged_terms_sub_version_uq` (subscriptionId, version) |
| INDEX | `commercial_charged_terms_sub_effective_idx` (subscriptionId, effectiveFrom) |
| Binding charged columns | still present (bindings unchanged) |
| Journal 0089 hash count | **1** (matches local) |
| Journal 0088 hash count | 1 |
