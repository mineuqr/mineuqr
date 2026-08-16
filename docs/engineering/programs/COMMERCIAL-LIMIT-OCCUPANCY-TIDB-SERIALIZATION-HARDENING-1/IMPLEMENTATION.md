# IMPLEMENTATION

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  

File: `server/subscription-runtime/commercialLimitOccupancy.ts`

## Change

`runLocked`:

1. `ensureCommittedLockRow` → `INSERT IGNORE` on 0094 (autocommit / pool execute, **committed**)
2. `db.transaction(..., { isolationLevel: "read committed" })`
3. `acquireExistingLock` → `SELECT … FOR UPDATE` only (no INSERT in this txn)
4. `resolveExisting` / `countOccupancy` / `decide` / `create` unchanged
5. Retry 1213/1205, max 3, unchanged. `CommercialLimitExceededError` not retried.

Unlocked Vitest path unchanged (`NODE_ENV=test` without injected `db`).

## Adoption (same helper; no path left on ODKU-in-txn)

| Path | Still uses helper |
|------|-------------------|
| `createRestaurantWithCommercialLimit` | yes |
| `createCategoryWithCommercialLimit` | yes |
| `createMenuItemWithCommercialLimit` | yes |
| POS `consumeProvisionedSlot` (provision) | yes |
| POS replace `occupancyDelta: 0` | yes |

## Migration

None. 0094 not modified. Production 0094 not applied-to from this program.

## Guards

`INSERT IGNORE`, `read committed`, `FOR UPDATE`. Not `ON DUPLICATE KEY UPDATE`, not `GET_LOCK`.
