# 06 — TRIAL LEGACY RETIREMENT

OD-3 already removed `resolveCanonicalLivePlanId(30002)`.

This program:

- `resolveTrialPolicyFromCatalog` no longer returns leftover integer identity
- Trial / register bind no longer reverse-maps leftover integers

Runtime trial path:

```
Trial Policy → Professional Live Plan UUID → user_subscriptions.planId
```

`TRIAL_DAYS` / `TRIAL_PLAN_SORT_ORDER` remain deprecated duration/sort leftovers, not plan identity.

Test fixtures may still mention `30002`. Classified test-only.
