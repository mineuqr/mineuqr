# TIDB CONCURRENCY TEST PLAN

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  

Harness: `commercialLimitOccupancy.tidb.concurrency.test.ts`  
Connection: `G07_DATABASE_URL` only. Injected Drizzle `db` (locked path). Two mysql2 pools. P14: two OS processes.

| # | Scenario | Pass rule |
|---|----------|-----------|
| 1 | Same tenant last slot cap 2 occ 1 | exactly one create; occ=2 |
| 2 | At cap concurrent creates | all `CommercialLimitExceededError`; occ=cap |
| 3 | 8 concurrent cap 1 | exactly one create; occ=1 |
| 4 | Cross-tenant | both succeed; A=2 B=2 |
| 5 | POS last slot | one provision; occ=2 |
| 6 | occupancyDelta 0 replace | one winner; occ=1 |
| 7 | Rollback then retry | occ 0 then 1 |
| 8 | Two pools lock wait | loser limit exceeded; occ=2 |
| 9 | Retry/deadlock | no duplicate occupancy; no infinite retry |
| 10 | Two OS processes | occupancy ≤ cap |
| 11 | Tenant / limitKey isolation | no cross consumption |
| 12 | Final COUNT | occupancy ≤ cap every scenario |

Not accepted: sequential awaits, mocks, MySQL 8.
