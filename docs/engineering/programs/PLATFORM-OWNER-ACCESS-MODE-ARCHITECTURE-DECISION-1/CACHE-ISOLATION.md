# CACHE-ISOLATION.md

Today’s key is `ownerId:second`. That would mix Full Platform and Simulated Professional for the same owner, and is one reason implementation must change the key **before** modes ship.

## Required cache identity

```
customer:  { kind: "customer", ownerId, second }
owner:     { kind: "platform_owner", ownerId, mode, simulatedPlanCode|-, second }
```

Owner Full Platform and Owner Simulated Professional are **different** entries.

Customer Professional (user 14760004, etc.) never shares a key with the platform owner.

## Invalidation

- Owner mode change → invalidate keys for that `ownerId` only
- Live Plan capability save → existing catalog/entitlement invalidation (customers + any owner simulation of that plan)
- Do **not** write owner simulation results into public catalog cache

## Public Pricing / catalog cache

Owner mode is irrelevant. Public offerings stay Live Plan projections. No owner context in those keys.
