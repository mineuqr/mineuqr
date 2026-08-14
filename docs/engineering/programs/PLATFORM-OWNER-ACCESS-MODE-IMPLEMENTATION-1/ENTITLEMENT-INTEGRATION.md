# ENTITLEMENT-INTEGRATION.md

Single authority: `getCommercialEntitlements` → `resolveOwnerEntitlements`.

```
getCommercialEntitlements(user)
  isPlatformOwner(user)?
    NO  → existing customer path (bind → Live Plan, else Legacy Bridge)
    YES → load platform_owner_access_mode
            FULL_PLATFORM   → all current FEATURE_KEYS, unlimited commercial limits
            SIMULATED_PLAN  → current Live Plan composition by catalog code
            invalid/missing → DENIED (not Full Platform)
```

Owner path does **not** read `user_subscriptions` and does **not** fall through to `planFeatureMatrix`.

`resolvePlanLimitsForUser` consumes the same hub result for the Platform Owner so quota checks cannot bypass owner mode via the expired `600001` row.
