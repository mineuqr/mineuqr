# LIMIT-RUNTIME-AUTHORITY.md

## Authoritative path (Live Plan customers)

```
Subscription
  ↓
Current Live Plan (binding)
  ↓
Current Live Plan Limits (`commercial_limit_values`, key `restaurants`)
  ↓
resolveOwnerEntitlements / resolveEntitlementsFromLivePlan
  ↓
checkLimit({ ownerId, limitKey: "restaurants", proposedTotal })
  ↓
assertRestaurantCreateAllowed
```

`resolvePlanLimitsForUser` is now a **hub adapter** only. It reads `result.entitlements.limits.*`. It does not read:

- plan name
- hardcoded Basic / Professional / Enterprise constants
- `PLAN_LIMITS`
- `subscription_plans.maxRestaurants`
- UI state
- role

`null` remains unlimited at the hub (`checkLimit` policy `unlimited`). The adapter maps `null` → `Number.MAX_SAFE_INTEGER` only for the legacy `PlanLimits` numeric shape used by older callers. Enforcement uses `checkLimit`, which keeps `null`.

## NONE / never-subscribed

No subscription → existing hub path (`legacy_bridge` / plan `NONE`).

`checkLimit` for `plan === "NONE"` denies with `cap: 0`.

This program does **not** restore “no subscription → Basic 1”. That fallback was a competing quota authority. NEVER-SUBSCRIBED remains commercial account state **NONE**. Restaurant create is denied by the existing entitlement policy, not by a new invented plan.

## Unbound / Legacy Bridge

Unbound subscriptions still resolve through the documented Legacy Bridge (`getCommercialEntitlementsFromContext` → `PLAN_LIMITS`). That is a **legacy compatibility boundary**, not Live Plan customer runtime.

Live Plan bound customers resolve limits from the current Live Plan profile.
