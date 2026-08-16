# POS CONCURRENCY PROOF

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** FAIL  

Used the **same** `withCommercialLimitOccupancy` helper with `limitKey: posTerminals` and fixture table `occupancy_g07_terminals` (provisioned flag). Isolated scopes. Not Production POS rows. Not a second limiter.

## P8 provision

Initial occupancy 1, cap 2, two concurrent provisions (delta 1).

Expected: one success, occupancy 2.  
Observed: **both fulfilled**.

POS slot-consuming provision can exceed `posTerminals` under TiDB concurrency with the current primitive.
