# 03 — LEGACY PLAN ID RETIREMENT DESIGN

## Canonical runtime

```
UUID → commercial_plans.id → capabilities / Offer List Price / trial
```

## Allowed leftover (blocked retirement)

```
webhook metadata integer → parseWebhookPlanRef → resolveCanonicalLivePlanId
                         → LEGACY_PLAN_BRIDGE → UUID
```

Used only for in-flight provider payloads. Not public/admin/checkout.

## New resolver

`resolveLivePlanById(planId: string)` — UUID only.

`resolveCanonicalLivePlanId` kept as webhook dual-read. Do not use it for new public contracts.

## Bind

`ensureLivePlanBoundForSubscription({ planId: UUID })`.  
Does not reverse-map leftover integers. Writes `legacyPlanId: null` into the existing column.
