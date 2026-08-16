# FAIL-CLOSED BEHAVIOR

## Rules verified

| Condition | POS behavior |
|-----------|----------------|
| Commercial state unavailable / live plan unreadable | `denyEntitlementsFailClosed` → cap 0 → deny |
| Limit key missing (customer) | `readLimitValue` → 0 → deny provision and operate |
| Limit key missing (ADMIN / isAdmin) | unlimited unless explicit `posTerminals` |
| `checkLimit` / resolver throws | mutation does not catch-and-allow; request fails |
| Restaurant missing | `PosEntitlementDeniedError("restaurant_not_found")` |
| Restaurant scope missing | `assertRestaurantAccess` / `assertRestaurantPosScope` FORBIDDEN |
| Subscription NONE | `checkLimit` `not_entitled`, cap 0 |
| Cap 0 | `available: false`, `provisioningAllowed: false` |
| `devices` used as POS limit | unsupported / denied; not consulted |

## Explicit non-assumptions (held)

- “No limit means unlimited” — **false** for customer `posTerminals`.  
- “Resolver unavailable means allowed” — **false**.  

## `available` vs `provisioningAllowed`

Fail-closed for **use** is `included > 0` (or unlimited).  
Fail-closed for **new slots** is `checkLimit(provisioned+1)`.

Over-limit after downgrade (included=2, provisioned=5): use remains allowed; new slots deny. That is plan-change semantics, not fail-open on missing state.

## PLATFORM_OWNER invalid mode

Invalid owner access mode → fail-closed entitlements. PLATFORM_OWNER simulation unavailable → fail-closed. FULL_PLATFORM → admin unlimited unless explicit cap.
