# OWNER-LIMIT-BEHAVIOR.md

Owner Access Mode architecture is **unchanged**. This program does not modify `platform_owner_access_mode` or add an owner-specific quota matrix.

## FULL_PLATFORM

`resolveFullPlatformEntitlements` sets:

```
restaurants: null
categories: null
items: null
```

`checkLimit` → unlimited. Restaurant create is not numerically capped.

## SIMULATED_PLAN

`resolvePlatformOwnerEntitlements` loads the **current** Live Plan composition for the selected code, including current limit values.

| Mode | Limit source |
|------|----------------|
| SIMULATED_BASIC | Current Basic Live Plan `restaurants` |
| SIMULATED_PROFESSIONAL | Current Professional Live Plan `restaurants` |
| SIMULATED_ENTERPRISE | Current Enterprise Live Plan `restaurants` (`null` today) |

If the administrator later changes Professional from 5 to 10, SIMULATED_PROFESSIONAL uses 10 after cache invalidation. No owner matrix and no hardcoded 1 / 5 / null in the owner resolver.

Invalid / missing simulated plan continues to fail closed (`NONE`).

## Customer admin vs Platform Owner

| Actor | Quota |
|-------|--------|
| Customer Admin + Basic | Basic current limit |
| Customer Admin + Professional | Professional current limit |
| Customer Admin + Enterprise | Unlimited (`null`) |
| Platform Owner FULL_PLATFORM | Unlimited |
| Platform Owner SIMULATED_PLAN | Selected Live Plan limits |
