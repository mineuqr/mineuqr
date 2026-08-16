# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  
**Date:** 2026-08-16  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** PASS — TIDB SERIALIZATION HARDENING CERTIFIED  

| Item | Value |
|------|--------|
| Cause | Uncommitted mutex + RR snapshot COUNT on TiDB |
| Fix | Committed `INSERT IGNORE` then RC txn `FOR UPDATE` |
| Migration | NONE (0094 unchanged) |
| Production mutation | 0 |
| TiDB tests | 12 passed |
| Unit/guards | 18 passed |
| Git / deploy | NONE |
