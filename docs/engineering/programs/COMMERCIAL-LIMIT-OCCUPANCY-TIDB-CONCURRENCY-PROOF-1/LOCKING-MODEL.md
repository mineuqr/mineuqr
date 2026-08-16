# LOCKING MODEL

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**TiDB lock-wait evidence:** NONE

## Lock identity

Mutex row in `commercial_limit_occupancy_locks`:

`(scopeKind, scopeId, limitKey)`

Examples:

| Mutation | Lock key |
|----------|----------|
| Create restaurant | `(owner, <userId>, restaurants)` |
| Create category | `(restaurant, <restaurantId>, categories)` |
| Create item | `(restaurant, <restaurantId>, items)` |
| POS provision / replace | `(restaurant, <restaurantId>, posTerminals)` |

Restaurants and categories for the same restaurant **do not** share a lock (different `limitKey`). Tenant A and tenant B **do not** share a lock (different `scopeId`). There is **no** global occupancy lock. There is **no** POS-specific lock table. `commercial_limit_values` is not locked.

## Acquisition

1. Insert the mutex row if absent (`ON DUPLICATE KEY UPDATE` no-op).
2. `SELECT … FOR UPDATE` that row.

The lock row is a **mutex**, not occupancy. Occupancy is domain COUNT inside the same transaction after the row lock is held.

## Intended contention behavior — **disproven on this TiDB**

Same lock key (observed on `mineuqr-stagIn`, pessimistic REPEATABLE-READ):

- Two overlapping `withCommercialLimitOccupancy` calls **both created**.
- T2 did **not** wait then fail `COMMERCIAL_LIMIT_EXCEEDED`.
- Final occupancy **exceeded** cap.

Different lock keys (other tenant or other limitKey) did not share occupancy (P6/P7 PASS).

## Retry / deadlock

Code unchanged (`MAX_LOCK_RETRIES=3`, errno 1213/1205). P12 8-way timed out at 5s. Policy not redesigned.

## Predecessor (not this proof)

Isolated Docker MySQL 8 passed same-key serialization. That is **not** G-07 evidence.
