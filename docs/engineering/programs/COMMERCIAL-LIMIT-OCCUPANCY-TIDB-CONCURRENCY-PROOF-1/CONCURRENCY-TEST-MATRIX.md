# CONCURRENCY TEST MATRIX

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Execution:** RUN on TiDB `mineuqr-stagIn` via `G07_DATABASE_URL`

| ID | Phase | Result |
|----|-------|--------|
| P4 | Same-tenant last slot | **FAIL** — 2/2 succeeded |
| P5 | At-cap | **FAIL** — occupancy 3 vs cap 2 |
| P6 | Cross-tenant | PASS |
| P7 | Independent limit keys | PASS |
| P8 | POS provision | **FAIL** — 2/2 succeeded |
| P9 | occupancyDelta 0 replace | **FAIL** — 2/2 succeeded |
| P10 | Rollback | PASS |
| P11 | Lock contention two pools | **FAIL** — 2/2 succeeded |
| P12 | 8-way contention | **FAIL** — timeout 5s |
| P13 | Real parallelism | Partial — P6 showed 2 CONNECTION_IDs; same-key race still double-created |
| P14 | Two OS processes | **FAIL** — both succeeded |
| P15 | G-06 mapper | PASS (in-process) |
| P16 | Tenant isolation | PASS (with P6) |

MySQL 8 IMPLEMENTATION-1 results are **not** G-07 evidence.
