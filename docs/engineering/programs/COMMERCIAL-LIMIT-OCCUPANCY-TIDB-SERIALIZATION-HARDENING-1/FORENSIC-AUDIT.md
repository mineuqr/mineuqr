# FORENSIC AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  
**Date:** 2026-08-16  
**Target:** `mineuqr-stagIn` / `mineuqr` via `G07_DATABASE_URL`  
**Engine:** 8.0.11-TiDB-v8.5.3-serverless, pessimistic, session isolation REPEATABLE-READ  

## Predecessor failure (not reinterpreted)

G-07: same-tenant last slot, two independent connections, both creates succeeded; occupancy 3 vs cap 2.

## Code under audit (before this program)

`withCommercialLimitOccupancy` / `runLocked`:

1. One Drizzle transaction (default isolation = session REPEATABLE-READ)
2. `INSERT … ON DUPLICATE KEY UPDATE` mutex row **inside** that transaction
3. `SELECT … FOR UPDATE` on that PK
4. Caller `COUNT(*)` (plain SELECT)
5. `checkLimit` / `decide`
6. Domain `create`
7. COMMIT

0094 table unchanged: PK `(scopeKind, scopeId, limitKey)`. Not a counter.

## TiDB semantics that matter

From TiDB pessimistic docs and **this branch’s experiments**:

- `SELECT FOR UPDATE` locks the latest **committed** version, not uncommitted inserts in the same transaction.
- TiDB does not provide InnoDB-style gap locks for absent ranges.
- Plain `SELECT` / `COUNT(*)` in REPEATABLE-READ uses the snapshot at transaction start — **not** a current read after waiting on a lock.
- `SELECT COUNT(*) … FOR UPDATE` is a current read.
- Occupancy transaction `SET TRANSACTION ISOLATION LEVEL READ COMMITTED` makes subsequent `COUNT(*)` a current read (confirmed on this branch).

## Experiments (controlled, non-Production)

| ID | Setup | Result |
|----|--------|--------|
| E1 | `FOR UPDATE` on an **already committed** lock row; T1 holds 800ms | T2 waited **978ms**. Existing-row mutex works. |
| E2 | After that wait, T1 inserted a second forensic row then committed | Plain `COUNT(*)` = **1** (stale). `COUNT(*) FOR UPDATE` = **2** (current). |
| E3 | G-07 primitive: ODKU + `FOR UPDATE` + snapshot COUNT in **one** txn; cap 2 occ 1 | Both counted **1**. Final occupancy **3**. Cap exceeded. |
| E4 | `INSERT IGNORE` **committed**, then txn `FOR UPDATE` + `COUNT FOR UPDATE` | One success counted 1, loser counted 2. Final **2**. Serialized. |
| E5 | Committed lock row + occupancy txn **READ COMMITTED** + plain `COUNT(*)` after wait | COUNT = **2**. Current read without locking every occupancy row. |

## Causal mechanism (not a guess)

Two cooperating TiDB facts:

1. **Absent / uncommitted mutex.** Creating the lock row inside the occupancy transaction does not give the other transaction a committed row to wait on the way InnoDB gap/unique locking did in Docker MySQL 8. E3 reproduced the G-07 overflow.

2. **Snapshot COUNT.** Even when `FOR UPDATE` on an **existing** committed mutex serializes (E1), a Repeatable-Read `COUNT(*)` after the wait still sees occupancy from transaction start (E2). T2 would still insert.

Both must be fixed. Fixing only pre-create, or only COUNT, is insufficient.

MySQL 8 proof is **not** this engine.
