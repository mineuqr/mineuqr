# POS MUTATION GATES

Enforcement boundary: **not** every store method. Router is thin. Services call the correct gate.

`COMMERCIAL` = restaurant entitled to POS (limit available / provisioning allowed).  
`AUTHORIZATION` = authenticated user + restaurant scope helper.  
`TENANT` = restaurant id matches resource.  
`TERMINAL` = identified terminal, restaurant-owned, lifecycle as required.  
`PERMISSION` = explicit POS grant for the command.

## Matrix

| Mutation | Commercial | Authorization | Tenant | Terminal | Permission |
|----------|------------|---------------|--------|----------|------------|
| Terminal provision (`pos.terminal.register`) | **PASS** `assertProvisioningAllowed` | **PASS** `assertRestaurantAccess` (owner/admin) | **PASS** restaurantId | N/A (creates) | N/A (not cashier) |
| Terminal activate | **PASS** if deactivated (slot+1); registered already counted | **PASS** owner/admin | **PASS** `requireOwned` | **PASS** | N/A |
| Terminal deactivate | N/A (does not consume; fail-open commercial is correct) | **PASS** owner/admin | **PASS** | **PASS** | N/A |
| Terminal replace | **PASS** if previous not provisioned; else slot-neutral | **PASS** owner/admin | **PASS** | **PASS** | N/A |
| Permission grant | **PASS** at use-time, not at grant persist | **PASS** owner/admin | **PASS** | N/A | N/A (admin mutation) |
| Permission revoke | same as grant | **PASS** | **PASS** | N/A | N/A |
| POS Sale | **PASS** `entitlement.available` | **PASS** `assertRestaurantPosScope` | **PASS** | **PASS** active | **PASS** `POS_ACCESS` + `SALE_CREATE` |
| Check Intake | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** `POS_ACCESS` + `CHECK_INTAKE` |
| Settlement Initiation | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** `POS_ACCESS` + `SETTLEMENT_INITIATE` |
| Register Open | **PASS** | **PASS** | **PASS** | **PASS** + register bind | **PASS** `POS_ACCESS` + `SHIFT_OPEN` |
| Register Close | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** `POS_ACCESS` + `SHIFT_CLOSE` |
| Shift Open | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** `POS_ACCESS` + `SHIFT_OPEN` |
| Shift Close | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** `POS_ACCESS` + `SHIFT_CLOSE` |
| Drawer Movement | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** `POS_ACCESS` + `REGISTER_ADJUST` |

Grant/revoke do not call `checkLimit`. That is not a commercial-use mutation: grants cannot operate while `available` is false. Pre-assigning cashiers before a plan includes POS, and retaining grants after expiry, is compatible with existing SaaS subscription restore.

## Shared operational path

Sale, Check Intake, Settlement, Register/Shift, Drawer Movement:

```
verifiedProcedure
  → command service
  → assertRestaurantPosScope
  → resolvePosTerminalAccess (terminal + commercial available + required permission)
  → POS_ACCESS + command permission
  → domain façade (Order / Check / Settlement / CRMP)
```

## Compat method (non-production command path)

`PosAccessService.authorize()` checks lifecycle + grant only. The router `pos.access.authorize` **does not** call it; it calls `resolvePosTerminalAccess`. Command services also use `resolvePosTerminalAccess`. Documented footgun; not a live bypass. See LONG-TERM-QUALITY-GATE (SAFE TO DEFER to align).
