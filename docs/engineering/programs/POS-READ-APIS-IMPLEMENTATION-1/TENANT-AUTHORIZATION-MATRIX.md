# TENANT AUTHORIZATION MATRIX

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
Reuses POS-TERMINAL-ACCESS-IMPLEMENTATION-1. Does **not** invent a device auth layer.

## Layers (existing)

1. **Session** — `verifiedProcedure` (authenticated + email policy).
2. **Restaurant POS scope** — `assertRestaurantPosScope`: owner **or** admin **or** `hasAnyGrant(restaurantId, userId)`. Missing restaurant / wrong tenant → `FORBIDDEN`.
3. **Terminal access** — `PosAccessService.resolvePosTerminalAccess`:
   - terminal exists
   - `terminal.restaurantId === requested restaurantId` else `terminal_foreign`
   - lifecycle `active` else `terminal_inactive`
   - entitlement `resolve` available else `entitlement_unavailable` (capacity **read**, not occupancy write)
   - explicit `POS_ACCESS` grant else `pos_permission_denied`
4. **Effective tenant** — `decision.context.restaurantId` / `terminalId` used for downstream queries.

Client `restaurantId` / `terminalId` are **claims to validate**, not authorization.

Owner ≠ cashier. Admin ≠ cashier. RBAC does not grant commercial or POS capabilities.

## Procedure matrix

| Caller | Restaurant | Terminal | Grant | Result |
|--------|------------|----------|-------|--------|
| anonymous | any | any | — | UNAUTHORIZED |
| staff, grant on A, terminal A active | A | A | POS_ACCESS | allow; query restaurant A |
| owner of A, no POS_ACCESS | A | A | none | FORBIDDEN `pos_permission_denied` |
| admin, no POS_ACCESS | A | A | none | FORBIDDEN `pos_permission_denied` |
| staff grant on A | B | B | none on B | FORBIDDEN (scope) |
| staff grant on A | A | terminal of B | POS_ACCESS | FORBIDDEN `terminal_foreign` |
| staff grant on A | A | deactivated A | POS_ACCESS | FORBIDDEN `terminal_inactive` |
| staff grant on A | missing restaurant | any | — | FORBIDDEN (scope) |
| device token (Kitchen) | — | — | — | **not a caller of `pos.read.*`**; uses `deviceProcedure` |

## Device / screen vs POS terminal

Certified operational screens (Kitchen, Expo, Pickup, Customer, Print Monitor, Kiosk) authenticate via Device Management. POS cashier authenticates as a **user + POS terminal**. This program does not accept `deviceId` / `screenId` as POS scope.

## Channel scopes

| Channel | Identity | POS read? |
|---------|----------|-----------|
| `cashier_pos` | POS terminal | yes (this program) |
| Table / waiter | waiter + table session | no — waiter APIs |
| Kiosk | device session | no — kiosk APIs |
| QR | public / table | no |

Kiosk must not read waiter data. Waiter must not read another tenant. POS must not flatten those contracts.

## Commercial occupancy

`PosAccessService.evaluate` already calls `PosEntitlementService.resolve` → `checkLimit`. That is an existing **read** of terminal capacity. POS read files do not call `withCommercialLimitOccupancy`, `occupancyDelta`, or occupancy helpers. Occupancy mutex / COUNT / 0094 / G-07…G-11 **unchanged**.
