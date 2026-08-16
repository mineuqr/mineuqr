# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Audit id:** G-07  
**Date:** 2026-08-16  
**Mode:** AUDIT → REAL-TIDB DRILL → VERIFY → CERTIFY  
**Predecessor:** COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1 (G-06)  
**STATUS:** ARCHITECTURE GAP CONFIRMED  

Real TiDB Cloud branch `mineuqr-stagIn` was exercised. Same-tenant concurrent `withCommercialLimitOccupancy()` creates **exceeded the Commercial cap**. The occupancy primitive was not redesigned.

| Item | Value |
|------|--------|
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Database | mineuqr |
| Isolation | REPEATABLE-READ |
| `tidb_txn_mode` | pessimistic |
| 0094 | present (applied in Phase 2) |
| Connection | `G07_DATABASE_URL` only; two mysql2 pools |
| Production | UNTOUCHED |
| MySQL 8 used as G-07 proof | NO |
| Occupancy architecture changed | NO |
| Git / deploy | NONE |

## Command

```
G07_REQUIRE_TIDB=1 pnpm exec vitest run server/subscription-runtime/__tests__/commercialLimitOccupancy.tidb.concurrency.test.ts
```

**12 tests: 4 passed, 8 failed.** Duration ~49s.

## Invariant

Same-tenant last-slot race: **two creates succeeded** (expected one). At-cap follow-on occupancy was **3** with cap **2**.

## FINAL

**STOP AFTER G-07 CERTIFICATION.** Do not start G-08. Do not silently redesign.
