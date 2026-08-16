# FINAL REPORT

**PROGRAM:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  
**STATUS:** PASS — TIDB SERIALIZATION HARDENING CERTIFIED  
**MODE:** AUDIT → ARCHITECTURE INVESTIGATION → IMPLEMENT → TIDB CERTIFY  
**PREDECESSOR:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  

## Causal failure (understood)

On TiDB v8.5.3-serverless:

1. `SELECT FOR UPDATE` locks **committed** rows. Mutex INSERT inside the occupancy transaction did not serialize the first concurrent acquisition (E3: cap exceeded).
2. Repeatable-Read `COUNT(*)` after waiting still saw occupancy from transaction start (E2: COUNT 1 vs current 2).

## Architecture

Committed 0094 mutex (`INSERT IGNORE` before occupancy `BEGIN`) + occupancy transaction **READ COMMITTED** + `SELECT … FOR UPDATE` on that row + caller COUNT + `checkLimit` + domain create.

No 0095. No counters. No POS/global/Redis/app lock. 0094 file not edited. Production 0094 not applied-to.

## Implementation

`server/subscription-runtime/commercialLimitOccupancy.ts` only (plus tests/guards). All occupancy-consuming paths already call this helper.

## TiDB proof

`mineuqr-stagIn` / `G07_DATABASE_URL`. **12/12** concurrency tests passed. Last-slot, at-cap, 8-way, POS, replace delta 0, rollback, two pools, two OS processes: **occupancy ≤ cap**.

## Production

UNTOUCHED. No deploy. No git.

## NEXT PROGRAM

Not G-08 from this certification. Occupancy deploy remains G-02; git remains G-03.

## FINAL

**STOP AFTER TIDB SERIALIZATION HARDENING CERTIFICATION**
