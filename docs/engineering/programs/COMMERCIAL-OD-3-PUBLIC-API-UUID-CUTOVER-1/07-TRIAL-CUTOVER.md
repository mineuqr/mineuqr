# 07 — TRIAL CUTOVER

## Before

```
catalog professionalPlanId
  or resolveCanonicalLivePlanId(30002)
→ persist UUID
```

## After

```
Trial policy → professional Live Plan UUID
→ persist user_subscriptions.planId
```

If catalog has no `professionalPlanId`: **FAIL CLOSED** (`trial_plan_unresolved`).

Unchanged: 14-day duration fallback, eligibility, Charged Terms, bind reverse-map `legacyPlanId`.

Bridge is not removed.
