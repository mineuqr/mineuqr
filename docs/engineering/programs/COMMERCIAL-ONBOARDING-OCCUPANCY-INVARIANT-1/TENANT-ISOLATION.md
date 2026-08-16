# TENANT ISOLATION

## Owner identity

Created from the registration payload (new `users` row). Not taken from another tenant’s session.

## Capacity scope

The onboarding check is **plan-scoped** (the trial Live Plan), not a global `COUNT(*) FROM restaurants`.

- Owner A’s existing restaurants do not consume Owner B’s onboarding allowance.  
- Basic plan `restaurants = 0` does not block Professional-trial onboarding (catalog test).  
- Subsequent restaurant creates remain owner-scoped occupancy (`kind: "owner", scopeId: ownerUserId`).

## Locks

No global lock, no POS lock, no restaurant-independent lock, no `GET_LOCK`, no in-process mutex, no change to 0094.
