# TRIAL-IMPACT

Trial behavior and the 14-day Professional policy were not changed.

## Today

```
Catalog trial policy
    → professional Live Plan UUID (already known)
    → legacy integer (policy.legacyPlanId or LEGACY_PLAN_BRIDGE 30002)
    → user_subscriptions.planId = integer
    → bind Live Plan UUID + legacyPlanId
```

The integer exists because the subscription column is int.

## Future

Trial can write `commercial_plans.id` of the Professional Live Plan directly, once `user_subscriptions.planId` accepts UUID.

Do not hard-code a replacement UUID. Resolve the Professional plan by current catalog (`code = professional` → that row’s `id`) at trial time, or from the trial policy’s existing UUID field.

Policy (14 days, Professional) stays unchanged.
