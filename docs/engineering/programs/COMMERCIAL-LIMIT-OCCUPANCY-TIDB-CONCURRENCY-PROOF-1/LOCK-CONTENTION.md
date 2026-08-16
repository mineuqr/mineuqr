# LOCK CONTENTION

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** FAIL  

## P11 / P13

T1: pool A, 800ms delay inside `create` after lock.  
T2: started ~80ms later on **pool B** (independent mysql2 pool, same TiDB, same lock key). Last slot (cap 2, occ 1).

Expected: T2 waits, then `CommercialLimitExceededError`. Occupancy 2.  
Observed: **both fulfilled**. Serialization via `SELECT … FOR UPDATE` did not make T2 observe T1’s committed occupancy.

## P12

Eight concurrent creates, cap 1, empty occupancy. Timed out at 5000ms. No occupancy result recorded. Retry/deadlock policy was not redesigned.

## Observation

Drizzle mysql2 `transaction()` issues `BEGIN` on a checked-out connection. Cross-tenant work used two `CONNECTION_ID`s. Same-tenant last-slot work still double-created. The gap is in **concurrent same-key occupancy decisions on this TiDB**, not in missing Vitest injection.
