# TIDB ENVIRONMENT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** ARCHITECTURE GAP CONFIRMED  

| Field | Value |
|-------|--------|
| Branch | mineuqr-stagIn |
| Parent | main (not used) |
| Database | mineuqr |
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Isolation | REPEATABLE-READ |
| txn mode | pessimistic |
| Connection | `G07_DATABASE_URL` only |
| Production `DATABASE_URL` | classified for reject-compare only; **never connected** |
| 0094 | PRESENT (Phase 2) |
| MySQL 8 Docker | not used |

SQL user prefix on the branch is distinct from Production main. Gateway hostname matches TiDB Cloud region gateway; isolation is the branch user, not a different hostname.
