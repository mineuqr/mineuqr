# RESOURCE INVENTORY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Independent search: `checkLimit(`, `limitKey`, `withCommercialLimitOccupancy`, `COMMERCIAL_LIMIT_FILTER_KEYS`, domain INSERTs.

## Live occupancy (enforced)

| RESOURCE | LIMIT KEY | CAP SOURCE | OCCUPANCY SOURCE | HELPER | PARENT LOCK |
|----------|-----------|------------|------------------|--------|-------------|
| restaurants | `restaurants` | `checkLimit` via owner entitlements | `COUNT(*)` restaurants by `userId` | `createRestaurantWithCommercialLimit` | owner mutex |
| categories | `categories` | `checkLimit(restaurant.userId)` | `COUNT(*)` categories by `restaurantId` | `createCategoryWithCommercialLimit` | occupancy + restaurant row |
| menu items | `items` | `checkLimit(restaurant.userId)` | `COUNT(*)` items by `restaurantId` | `createMenuItemWithCommercialLimit` | occupancy + restaurant row |
| POS terminals | `posTerminals` | `checkLimit(restaurant.userId)` | provisioned COUNT (`registered`+`active`) | `PosTerminalService.consumeProvisionedSlot` | occupancy + restaurant row |

## Catalog-only quantity keys (no occupancy primitive)

`staffAccounts`, `branches`, `devices`, `ordersPerMonth`, `qrCodes`, `storage`, `images`

`screens` is not a Commercial limit key (operational-device pairing rate limits use a different `limitKey: burst|sustained`).

**Classification:** INTENTIONAL / ACCEPTED. Do not invent COUNT paths in this audit.

## `commercial_limit_values`

Catalog limit-profile storage. Not an occupancy counter. Cap catalog ≠ occupancy SSOT.

## Create / admin / owner / internal

| Resource | Owner | Admin | Internal |
|----------|-------|-------|----------|
| restaurants | `routers` → helper | same helper (`ownerUserId` resolved) | onboarding `registerOwner` (G-04, not helper) |
| categories | `routers` → helper | same helper (G-09) | residual `db.createCategory` only as helper unlocked fallback |
| items | `routers` → helper | same helper (G-09) | residual `db.createMenuItem` fallback |
| POS | `posRouter.terminal.register` | same service + restaurant access | no separate provisioner |

## Delete / lifecycle / plan

See `DELETE-PATH-MATRIX.md` and `LIFECYCLE-MATRIX.md`. Plan change does not mutate these rows (G-11).
