# REPLACEMENT PROOF

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** FAIL  

`occupancyDelta: 0` concurrent replace of the same provisioned fixture terminal, cap 1, occupancy 1.

Expected: one winner; occupancy remains 1; loser `already_replaced` (or equivalent fail-closed).

Observed: **both replacements fulfilled**.

The Commercial lock did not serialize two replacements of the same row on this TiDB engine. No POS-specific lock was added. Architecture not redesigned.
