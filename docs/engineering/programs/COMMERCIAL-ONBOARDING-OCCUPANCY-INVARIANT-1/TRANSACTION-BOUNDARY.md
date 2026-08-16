# TRANSACTION BOUNDARY

## Onboarding transaction (unchanged)

One Drizzle transaction:

1. insert user  
2. insert restaurant  
3. insert trial subscription  

## Capacity decision (this program)

`assertOnboardingFirstRestaurantPermitted()` runs **before** `db.transaction`.

If denied or unresolvable: **no** user, **no** restaurant, **no** trial row.

Catalog reads use the Commercial catalog services (not the occupancy lock table). They are not a second database connection for COUNT+INSERT of restaurants — there is no restaurant INSERT until the onboarding transaction starts.

## Why occupancy was not used

`withCommercialLimitOccupancy` always starts its own transaction. Nesting it would split:

- occupancy tx: lock + restaurant insert  
- onboarding tx: user + trial  

That is prohibited. The helper was **not** rewritten to accept an outer `tx`.

## Rollback

Occupancy-helper rollback does not apply. Fail-closed happens before the domain transaction. Unique-constraint failures inside the transaction still roll back user+restaurant+trial together (existing behavior).
