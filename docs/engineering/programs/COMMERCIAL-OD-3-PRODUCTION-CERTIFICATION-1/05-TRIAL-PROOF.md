# 05 — TRIAL PROOF

Static / service-level and read-only. **No new trial subscription was created.**

## Expected path

```
Trial Policy
  → Professional Live Plan UUID
  → user_subscriptions.planId
```

Deployed `resolveTrialPlanId()`:

1. `ensureCatalogReady()`
2. `resolveTrialPolicyFromCatalog()`
3. require `policy.professionalPlanId`
4. fail closed `trial_plan_unresolved` if missing

There is **no** `resolveCanonicalLivePlanId(30002)` fallback.  
There is **no** `getSubscriptionPlans` lookup.

`buildTrialSubscriptionPayload.planId` is `string` (UUID).

## Production observation

Current Production `user_subscriptions`:

| status | n |
|--------|---|
| trial | 0 |
| active | 5 |
| expired | 2 |

No integer `30002` persistence. Professional storage UUID is `0ade795a-02fa-4d3e-b9b5-262515bade09` (4 rows).

## Tests

`server/create-trial-subscription.test.ts` and OD-3 UUID contract tests cover UUID persistence and integer-fallback removal.

## Decision

**TRIAL GATE: PASS**
