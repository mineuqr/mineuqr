# OCCUPANCY HELPER

**Module:** `server/subscription-runtime/commercialLimitOccupancy.ts`  
**Export:** `withCommercialLimitOccupancy` (also re-exported from `server/subscription-runtime/index.ts`)

## Ownership split

| Owner | Responsibility |
|-------|----------------|
| Commercial helper | Acquire tenant lock; call `decide(proposedTotal)`; fail closed; rollback on throw |
| Caller (domain) | `countOccupancy`, `create`, optional `resolveExisting`, `decide` → `checkLimit` |

The helper never inserts restaurants, categories, items, or POS terminals itself.

## Control flow (locked path)

```
db.transaction
  INSERT lock row ON DUPLICATE KEY UPDATE
  SELECT … FOR UPDATE
  resolveExisting? → return existing (no COUNT, no slot)
  occupancy = countOccupancy(tx)
  decision = decide(occupancy + delta)
  if !allowed → CommercialLimitExceededError (rollback)
  create(tx)
COMMIT
```

## Errors

| Error | When |
|-------|------|
| `CommercialLimitExceededError` | `decide.allowed === false` (includes `limit_exceeded`, `not_entitled`, `limit_key_unsupported`) |
| `CommercialOccupancyUnavailableError` | database handle missing (`getDb()` null / explicit null outside the unlocked test path) |

Domain errors from `create` propagate; the transaction rolls back.

## Test path

`NODE_ENV === "test"` **and** no injected `db` → unlocked check-then-act. This is **not** concurrency proof. Concurrency tests inject isolated Docker Drizzle.

## Retry

On MySQL/TiDB `ER_LOCK_DEADLOCK` (1213) or `ER_LOCK_WAIT_TIMEOUT` (1205): retry the whole transaction up to 3 times with short sleep. Limit-exceeded is never retried.
