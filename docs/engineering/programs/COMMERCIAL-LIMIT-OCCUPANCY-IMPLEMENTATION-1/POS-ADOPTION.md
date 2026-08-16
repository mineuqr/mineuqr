# POS ADOPTION

POS Terminal provisioning consumes the **shared** helper. There is no `PosTerminalLock`, `PosOccupancyService`, or POS occupancy table.

## Slot-consuming paths

All go through `PosTerminalService.consumeProvisionedSlot` → `withCommercialLimitOccupancy`:

- `register` (new identity)  
- `activate` from `deactivated` (re-enters provisioned occupancy)  
- `replace` when the previous terminal is **not** provisioned  

## Slot-neutral path

Replace of an already provisioned terminal inserts the replacement and marks the previous `replaced` **without** occupancy (net provisioned count unchanged).

## Cap and occupancy

- Cap: `checkLimit({ ownerId: restaurant.userId, limitKey: posTerminals })`  
- Occupancy: count of restaurant terminals in provisioned lifecycles (`registered` + `active`)  
- Lock: `(restaurant, restaurantId, posTerminals)`  

## Idempotency

Sequential same-code `register` still returns the existing row before the lock.

Concurrent same-code `register` peeks `resolveExisting` **after** `FOR UPDATE`, so the loser returns the winner’s identity instead of consuming a second slot or failing the cap.

Unique `(restaurantId, code)` remains the identity constraint, not the occupancy source of truth.

## Entitlement vs occupancy

`PosEntitlementService` remains composition/read availability. Create-time capacity is Commercial occupancy + `checkLimit`. Constructor still accepts the entitlement service for composition compatibility (`void entitlements` on the terminal service).

## Persistence

`PosTerminalStore` methods accept the occupancy transaction so COUNT/INSERT/lifecycle updates share the lock connection. In-memory tests ignore `tx`; Drizzle production store uses it.
