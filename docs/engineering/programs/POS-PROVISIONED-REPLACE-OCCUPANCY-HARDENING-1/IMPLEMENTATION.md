# IMPLEMENTATION

**File:** `server/pos/services/PosTerminalService.ts` only (plus tests/guards/docs).

## Change

`replace` always calls `consumeProvisionedSlot`.

- Provisioned previous: `occupancyDelta: 0`  
- Unprovisioned previous: `occupancyDelta: 1` (same as before)  
- Locked re-read of previous; `already_replaced` / `lifecycle_conflict`  
- `insertRegistered` and `updateLifecycle` receive `tx`

`consumeProvisionedSlot` takes `occupancyDelta` (default `1`) and passes it to `withCommercialLimitOccupancy`. Register/activate-from-deactivated unchanged (default 1).

## Not changed

Commercial helper internals · 0094 · POS authorization · `posTerminals` meaning · POS_ACCESS · no POS lock table.
