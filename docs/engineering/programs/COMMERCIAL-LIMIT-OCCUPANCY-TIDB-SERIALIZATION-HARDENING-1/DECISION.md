# DECISION

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  

## Decision

Keep `commercial_limit_occupancy_locks` (0094). Do not modify 0094.

Change **application** occupancy helper only:

1. Commit mutex with `INSERT IGNORE` **outside** the occupancy transaction.
2. Run occupancy work in **READ COMMITTED**.
3. `SELECT … FOR UPDATE` the existing mutex row.
4. Caller COUNT / decide / create / COMMIT unchanged in ownership.

## Why this is correct on TiDB today

Proven on `mineuqr-stagIn`: existing-row `FOR UPDATE` waits; RC `COUNT(*)` sees committed occupancy after the wait; last-slot races keep `occupancy <= cap`.

## Why not parent-row locks

Would serialize unrelated `limitKey` values onto one restaurant/user row.

## Why not counters / 0095 / Redis

COUNT can be a current read. 0094 already is the mutex. No second limiter.

## Quality gate

| Class | Item |
|-------|------|
| A REQUIRED NOW | Committed mutex before occupancy txn; current occupancy read on TiDB |
| B FOUNDATION | All quantity mutations keep using this helper |
| C SAFE TO DEFER | 0095, counter table, lock-wait tuning, G-08 domain races |
| D NEVER | App-memory lock, Redis lock, POS lock, global lock, locking `commercial_limit_values`, creating mutex inside the occupancy race |

## Scale

Many restaurants: one mutex row per `(scopeKind, scopeId, limitKey)`, not a global lock.  
Many terminals: `posTerminals` key is restaurant-scoped.  
Branches: each TiDB branch has its own lock rows.  
Future resources: add a `limitKey`, same helper.

## Debt intentionally avoided

No second occupancy number. No new migration this program. Production 0094 untouched.
