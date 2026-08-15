# POST-MIGRATION DATA VALIDATION

`SELECT COUNT(*) FROM commercial_subscription_charged_terms` = **0** (required).

| Population | Before | After |
|------------|-------:|------:|
| subscriptions | 7 | 7 |
| bindings | 3 | 3 |
| plans | 3 | 3 |
| prices | 10 | 10 |
| snapshot rows | n/a | **0** |

Subscription identities/statuses/cycles and Binding charged fields are byte-equal to `_PRE-APPLY.json`.  
780001: active, yearly, plan `d836bd10-…`, unbound — unchanged.
