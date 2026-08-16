# TRANSACTION BOUNDARY

## Required atomic unit

One Drizzle `db.transaction` on one mysql2 connection:

1. Acquire tenant lock (`FOR UPDATE`)  
2. Resolve commercial cap (`decide` → `checkLimit`)  
3. Domain `COUNT(*)` on that connection  
4. Compare occupancy + delta to cap  
5. Domain create on that connection  
6. COMMIT  

Any throw → ROLLBACK. No occupancy consumed. No partial domain row.

## Why a normal transaction was not enough

InnoDB/TiDB non-locking `COUNT(*)` does not serialize two transactions. Both can observe spare capacity and both INSERT. The lock row is the serialization point.

## Connection rule

`countOccupancy` and `create` receive the transaction object. Production adapters (`createRestaurantWithCommercialLimit`, Drizzle POS store) **must** use `tx` when provided so COUNT and INSERT see each other.

Unlocked Vitest path passes `tx = null` and uses existing `getRestaurantsByUser` / `createRestaurant` helpers.

## POS slot-neutral replace

Replacing an already provisioned terminal does **not** enter the occupancy transaction (net occupancy unchanged). Slot-consuming register / activate-from-deactivated / replace-from-unprovisioned **do**.

## Onboarding exception (preserved)

`registerOwnerTransactional` inserts the first restaurant in the owner-registration transaction without the occupancy helper (new user 0→1). Product onboarding is unchanged. Subsequent `restaurant.create` uses occupancy.
