# FORENSIC AUDIT

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1 (G-10)  

## Occupancy queries (live)

| Resource | Limit key | COUNT |
|----------|-----------|--------|
| restaurants | `restaurants` | All rows `WHERE userId = owner` — **no `isActive` filter** |
| categories | `categories` | `COUNT(*) WHERE restaurantId = ?` — **no `isActive` filter** |
| items | `items` | `COUNT(*) WHERE restaurantId = ?` — **no `isAvailable` filter** |
| POS terminals | `posTerminals` | `listByRestaurant` filtered by `isProvisionedLifecycle` = **registered \| active only** |

Unlocked fallback `getRestaurantStats` is the same unfiltered COUNT(*).

## Lifecycle labels actually in MineuQR

There is **no** shared enum `DISABLED` / `SUSPENDED` / `ARCHIVED` on catalog rows.

| Resource | Flags / states |
|----------|----------------|
| restaurants | `isActive` boolean. Hard delete via cascade. No soft-delete table. |
| categories | `isActive` boolean. Hard delete (`deleteCategory` also deletes items). |
| menu items | `isAvailable` boolean (not named isActive). Hard delete. |
| POS terminals | `registered` · `active` · `deactivated` · `replaced`. No hard-delete API. |

Public ordering rejects `restaurant.isActive === false`. That is **runtime availability**, not occupancy release.

## POS deactivate vs occupancy

`PosTerminalService.deactivate` updates lifecycle **without** `withCommercialLimitOccupancy`. Occupancy drops because COUNT no longer includes `deactivated`.

`activate` from `deactivated` **does** call `consumeProvisionedSlot` (delta 1). At cap it fails closed.

`replace` of provisioned previous uses `occupancyDelta = 0` (certified). `replaced` is not provisioned.

## Staff / branches / devices

Limit keys exist in the capability matrix. **No live occupancy COUNT create path.** Devices are `requireFeature`. Not G-10 quantity occupancy.

## Prior audit

G-08 classified inactive catalog occupy as G-10 policy. Code already occupied. This program decides that is **correct** for catalog, and POS provisioned COUNT is the correct occupancy definition for `posTerminals`.
