# ROLLBACK PROOF

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** PASS  

Force `create` to throw after lock + decide allowed.

Observed: occupancy 0 after failure. Retry with cap 2 created one row. Occupancy 1.

A single-connection rollback on this TiDB session behaves. That does **not** certify concurrent serialization.
