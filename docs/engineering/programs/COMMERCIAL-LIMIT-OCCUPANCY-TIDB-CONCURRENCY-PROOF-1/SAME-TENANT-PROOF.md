# SAME-TENANT PROOF

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** FAIL — occupancy exceeded cap  

## Setup

Isolated fixture table `occupancy_g07_resources`.  
Lock key: `(owner, 970701, restaurants)`.  
`withCommercialLimitOccupancy` + injected TiDB Drizzle `db`.  
Cap 2, initial occupancy 1.  
Two overlapping creates (`Promise.allSettled`), one with 400ms delay inside `create`.

## Expected

Exactly one additional row. Final occupancy 2. Loser `CommercialLimitExceededError`.

## Observed on TiDB v8.5.3-serverless (pessimistic, REPEATABLE-READ)

Both operations **fulfilled**.  
`fulfilled.length === 2`, `rejected.length === 0`.  
Elapsed ~3537ms.

P5 then read occupancy **3** with cap **2** (1 seed + 2 concurrent creates).

## Invariant

`occupancy <= cap` **does not hold** for same-tenant last-slot create on this engine with the current primitive.
