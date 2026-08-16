# FORENSIC AUDIT

Verified against current code, not only the comprehensive audit.

## Call chain

```
pos.terminal.replace (posRouter)
  → assertRestaurantAccess(ctx, restaurantId, "pos.terminal.replace")
  → PosTerminalService.replace
      → requireOwned(restaurantId, terminalId)
      → consumeProvisionedSlot(..., occupancyDelta 0|1)
          → withCommercialLimitOccupancy
      → PosTerminalStore.insert + updateLifecycle(tx)
```

No PosAccessContext on replace. Authorization is restaurant access + `requireOwned` (terminal.restaurantId must match). POS_ACCESS is not required for terminal replace (unchanged).

## Why it bypassed the helper

When `previous` was provisioned (`registered` | `active`), replace called `performReplace(null)` to avoid consuming a slot (`occupancyDelta: 1` would have denied at cap). That skipped the tenant lock entirely.

## Before this program

| Step | Behavior |
|------|----------|
| Count before | provisioned N (includes previous) |
| Insert replacement `registered` | N+1 (visible to concurrent txs if committed separately) |
| Mark previous `replaced` | N again |
| Concurrent double replace | two inserts, one previous replaced → occupancy N+1 |

## After this program

Both provisioned (delta 0) and unprovisioned (delta 1) replace go through `consumeProvisionedSlot` → shared helper. Lifecycle is re-read inside the occupancy transaction; already-replaced throws `already_replaced`.
