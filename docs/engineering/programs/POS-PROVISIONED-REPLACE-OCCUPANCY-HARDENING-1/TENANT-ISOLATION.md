# TENANT ISOLATION

## Commercial lock scope

Unchanged:

```
kind: "restaurant"
scopeId: restaurantId
limitKey: posTerminals
```

Lock table PK remains `(scopeKind, scopeId, limitKey)` from 0094. No global lock, no POS-global lock, no restaurant-independent lock, no `GET_LOCK`, no in-process mutex.

## Restaurant A cannot affect Restaurant B occupancy

Proven on isolated MySQL 8: concurrent `occupancyDelta: 0` replace on SCOPE_A and SCOPE_B both succeed; each tenant occupancy stays 1.

`countOccupancy` lists terminals for **that** `restaurantId` only.

## Terminal ownership

`PosTerminalService.replace` still:

1. `assertRestaurantAccess` at the router (`pos.terminal.replace`)
2. `requireOwned(restaurantId, terminalId)` — missing or other-restaurant terminal → `not_found`
3. Locked re-read: `current.restaurantId !== input.restaurantId` → `not_found`

POS_ACCESS is not required for terminal replace (same as before). No new permission.

Domain test: `requireOwned(RESTAURANT_B, terminalA.id)` throws. List of B is empty.
