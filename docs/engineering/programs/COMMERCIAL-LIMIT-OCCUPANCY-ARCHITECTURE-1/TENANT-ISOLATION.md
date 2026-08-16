# TENANT ISOLATION

## Current

Occupancy counts are already tenant-scoped:

- restaurants → `userId`  
- categories / items / posTerminals → `restaurantId`

Restaurant B at occupancy 0 and cap 2 can create while A is at cap. The race does not leak B’s capacity into A.

`checkLimit` uses **owner** entitlements. Category/item callers pass **actor** `userId` (owner in the non-admin path). Admin skips category/item caps (support exceed). POS always uses `restaurant.userId`.

## Future lock granularity (required)

Lock key **must** include tenant scope:

- `restaurants`: `(limitKey=restaurants, ownerUserId)`  
- `categories` / `items` / `posTerminals`: `(limitKey, restaurantId)`

Never lock by Live Plan profile id.

## Scenario (must remain true)

A: limit 2, occupancy 2 → create denied.  
B: limit 2, occupancy 0 → create allowed, including concurrently with A’s denied attempts.

A’s `FOR UPDATE` on A’s lock row must not wait behind B.
