# TRANSACTION MODEL

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Source of truth:** `withCommercialLimitOccupancy` / `runLocked` / `getDb()`  
TiDB session evidence (Phase 3): VERSION `8.0.11-TiDB-v8.5.3-serverless`; `@@transaction_isolation` = REPEATABLE-READ; `@@tidb_txn_mode` = pessimistic. Drizzle mysql2 `transaction()` issues `BEGIN` on a checked-out pool connection.

Same-tenant concurrent create still exceeded cap. Isolation/txn-mode settings alone did not provide the required serialization.

## Application model (code)

```
db.transaction(async (tx) => {
  INSERT lock row ON DUPLICATE KEY UPDATE
  SELECT … FOR UPDATE on lock PK
  optional resolveExisting(tx)
  occupancy = countOccupancy(tx)
  decision = decide(occupancy + delta)
  if !allowed → throw CommercialLimitExceededError
  return create(tx)
})
```

- **One** Drizzle transaction per attempt.
- Drizzle mysql2 `transaction()` checks out **one** pool connection, `BEGIN`, runs the callback, `COMMIT` or `ROLLBACK`.
- Production pool: `createRuntimeMysqlPool(DATABASE_URL)` in `server/db.ts` — single process-wide mysql2 pool. TLS injected for `*.tidbcloud.com`.
- Tests that prove locking inject `db` so `NODE_ENV === "test"` does not take `runUnlocked`.

## Isolation / autocommit (code)

`getDb()` / `createRuntimeMysqlPool` do **not** issue `SET TRANSACTION ISOLATION LEVEL` or `SET autocommit`.

Expected protocol defaults (MySQL / TiDB): session autocommit on; explicit `BEGIN` inside `db.transaction`; default isolation typically REPEATABLE-READ. **Not measured on a TiDB session in this program.**

## Retry wrapper (outside the transaction)

```
for attempt 1..3:
  try runLocked
  catch CommercialLimitExceededError → rethrow (no retry)
  catch deadlock 1213 / lock wait 1205 → sleep 25*attempt, retry
  else rethrow
```

A successful retry starts a **new** transaction (new lock, new COUNT, new decide). That is the intended “see committed occupancy after the winner commits” path — **unproven on TiDB**.

## Unlocked path (not production)

When `NODE_ENV === "test"` and no injected `db`, COUNT/decide/create run without a transaction. Vitest unit tests use this. Concurrency tests must inject a real `db`.

## OccupancyDelta

| delta | proposedTotal | Use |
|-------|---------------|-----|
| 1 | occupancy + 1 | create restaurant / category / item / new POS slot |
| 0 | occupancy | provisioned POS replace (serialize; do not consume a second slot) |

Cap authority remains `checkLimit()`. Occupancy remains caller `COUNT(*)` (or equivalent list+filter for POS lifecycle). The lock table is not a counter.
