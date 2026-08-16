# ARCHITECTURE AUDIT

## Intended chain

```
Commercial Catalog
  → Live Plan (commercial_limit_values)
    → resolveOwnerEntitlements
      → checkLimit()                    // cap oracle
        → withCommercialLimitOccupancy  // tenant lock + serialize
          → domain COUNT(*)             // occupancy
            → domain create             // resource owner
```

## Actual ownership (verified)

| Concern | Owner | Evidence |
|---------|-------|----------|
| Plan / catalog | Commercial catalog + Live Plan | `commercial_plans`, `commercial_limit_values` |
| Entitlement | Subscription runtime | `resolveOwnerEntitlements` |
| Capacity decision | `checkLimit` | `server/subscription-runtime/enforcement.ts` |
| Serialization | Commercial occupancy helper | `withCommercialLimitOccupancy` |
| Occupancy count | Domain caller | COUNT of `restaurants` / `categories` / `menu_items` / provisioned `pos_terminals` |
| Resource persistence | Domain | `subscriptionPlanLimits` inserts; `PosTerminalStore` |
| Authorization | Restaurant/RBAC | `assertRestaurantAccess` before occupancy |

Separation is **preserved** on adopted paths. Commercial does not insert domain rows except by invoking caller `create(tx)`.

## What is not a second limiter

`withCommercialLimitOccupancy` does not store a counter. `PosEntitlementService` is a **read** of `checkLimit` + COUNT; create-time capacity is the occupancy helper.

## Invalid architecture (not found on adopted locked paths)

```
Commercial tx → lock → count → domain service → other getDb() → insert
```

Adopted `create(tx)` uses the supplied `tx` (`tx.insert` / `store.insert(..., tx)`).

## Invalid architecture (found)

1. **Admin category/item:** `createCategory` / `createMenuItem` via `getDb()` with **no** lock, **no** `checkLimit`.  
2. **POS slot-neutral replace:** `performReplace(null)` — insert + mark replaced **outside** occupancy transaction.  
3. **Onboarding:** `registerOwnerTransactional` inserts restaurant on its own tx without occupancy.  
4. **Deployed Production:** old check-then-act still live.

`checkLimit()` inside the occupancy transaction uses `resolveOwnerEntitlements` → **another** connection. That does **not** split COUNT+INSERT. It only reads the cap. Occupancy serialization remains on the lock connection.
