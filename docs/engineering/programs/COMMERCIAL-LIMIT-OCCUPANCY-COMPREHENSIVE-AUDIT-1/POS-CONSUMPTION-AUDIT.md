# POS CONSUMPTION AUDIT

POS is a **consumer** of Commercial occupancy. No `PosOccupancyService`, no POS lock table, no POS occupancy counter as source of truth.

## Slot-consuming (helper)

- `register` (new)  
- `activate` from `deactivated`  
- `replace` when previous is **not** provisioned  

Cap: `checkLimit(restaurant.userId, posTerminals)`.  
COUNT: provisioned lifecycles via `PosTerminalStore.listByRestaurant(tx)`.

## Slot-neutral gap

`replace` of an already provisioned terminal calls `performReplace(null)`:

- **No** tenant lock  
- Insert replacement + mark previous replaced on default `getDb()`  
- Two concurrent replaces of the **same** provisioned terminal can insert **two** replacements and mark one previous `replaced` → **provisioned COUNT can exceed cap**

The helper already has `occupancyDelta: 0` for serialize-without-consume. POS does not use it here.

**REQUIRED NOW** (commercial invariant, not “POS roadmap later”).

## Authorization vs commercial

`posRouter` : `assertRestaurantAccess` then terminal service. Occupancy does not replace POS grants for sale/cashier.

## Entitlement read

`PosEntitlementService.resolve` is checkLimit + COUNT **without** lock (read model). Acceptable for display. Must not be used as the create gate (live create uses helper). `assertProvisioningAllowed` is unused on live create.

## Tenant

Lock and COUNT scoped by `restaurantId`. Cannot consume another restaurant’s POS cap.

## UI

Not in scope.
