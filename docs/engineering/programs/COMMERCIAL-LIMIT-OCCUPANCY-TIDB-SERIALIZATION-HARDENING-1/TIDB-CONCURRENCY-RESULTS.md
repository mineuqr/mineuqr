# TIDB CONCURRENCY RESULTS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  
**Date:** 2026-08-16  

```
G07_REQUIRE_TIDB=1 pnpm exec vitest run server/subscription-runtime/__tests__/commercialLimitOccupancy.tidb.concurrency.test.ts
```

**12 passed / 0 failed.** Duration 44.18s.

Engine: `8.0.11-TiDB-v8.5.3-serverless`. Branch user distinct from Production. `tidb_txn_mode` pessimistic.

| Scenario | Result | Occupancy |
|----------|--------|-----------|
| P4 last slot | 1 fulfilled, 1 `CommercialLimitExceededError` | **2** |
| P5 at cap, 3 racers | 3 rejected | **2** |
| P6 cross-tenant | both ok; CONNECTION_ID 2808086558 and 2808086552 | A=2 B=2 |
| P7 restaurants vs categories | both ok; two lock keys | 1 and 1 |
| P8 POS provision | 1 fulfilled, 1 rejected | **2** |
| P9 replace delta 0 | 1 fulfilled, 1 rejected | **1** |
| P10 rollback | throw then retry | 0 then **1** |
| P11 two pools | T2 waited 2153ms; loser exceeded | **2** |
| P12 8-way cap 1 | 1 fulfilled, 7 limit exceeded, 0 infra | **1** |
| P14 two processes | A created; B `COMMERCIAL_LIMIT_EXCEEDED` | **2** |
| P15 G-06 mapper | FORBIDDEN vs INTERNAL_SERVER_ERROR | n/a |

Invariant `occupancy <= cap` held in every completed scenario.

Unit/guards (not TiDB): 18 passed (`commercialLimitOccupancy` + trpc).

Production `DATABASE_URL` was not used to connect. MySQL 8 was not this proof.
