# LONG-TERM QUALITY GATE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  

G-07 **did not certify** occupancy serialization on TiDB. Same-tenant concurrent create exceeded cap on `mineuqr-stagIn` (TiDB v8.5.3-serverless, pessimistic, REPEATABLE-READ).

Do **not** claim:

- MySQL 8 concurrency implies TiDB
- 0094 presence implies serialization
- Cross-tenant PASS implies same-tenant PASS
- Unlocked Vitest occupancy tests imply locking

A successor program may investigate **why** `SELECT … FOR UPDATE` on `commercial_limit_occupancy_locks` did not serialize two overlapping Drizzle transactions on this engine. That successor must not silently add Redis/app/POS/global locks without a new architecture program.

Do not deploy occupancy to Production until this gap is resolved or explicitly accepted.
