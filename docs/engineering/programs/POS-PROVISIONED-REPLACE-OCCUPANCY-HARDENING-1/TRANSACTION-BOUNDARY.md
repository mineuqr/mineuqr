# TRANSACTION BOUNDARY

## Required unit (provisioned replace)

One Drizzle transaction from `withCommercialLimitOccupancy`:

1. Tenant lock `SELECT … FOR UPDATE`  
2. COUNT provisioned terminals on `tx`  
3. `decide(occupancy + 0)` → `checkLimit`  
4. `getById(previous.id, tx)`  
5. `insert(replacement, tx)`  
6. `updateLifecycle(previous, replaced, tx)`  
7. COMMIT  

`PosTerminalStore.requireDb(tx)` uses the occupancy connection when `tx` is provided. **No** second `getDb()` on the locked path.

## Unlocked Vitest path

`NODE_ENV === "test"` without injected `db` still uses `tx=null` (in-memory domain tests). Concurrency proof injects isolated MySQL `db`.

## Blocker

None. Repository already accepted `tx`.
