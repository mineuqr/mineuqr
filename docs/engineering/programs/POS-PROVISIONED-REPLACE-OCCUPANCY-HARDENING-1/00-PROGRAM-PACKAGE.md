# 00 — PROGRAM PACKAGE

**Program:** POS-PROVISIONED-REPLACE-OCCUPANCY-HARDENING-1  
**Date:** 2026-08-16  
**Mode:** AUDIT → IMPLEMENT → TEST → CERTIFY  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1 (G-01 REQUIRED NOW)  
**STATUS:** PASS — LOCALLY CERTIFIED  

| Item | Value |
|------|--------|
| Fix | Provisioned POS replace uses `withCommercialLimitOccupancy` with `occupancyDelta: 0` |
| Migration | NONE |
| Production mutation | 0 |
| Commit / push / deploy | NONE |
| Combined regression | 56 files / 385 tests (predecessor occupancy suite 377; +8 this program) |
| Real DB concurrency | 15 passed on isolated Docker MySQL 8.0 (5 new replace proofs) |
| Build | PASS |
| Check | 188 `error TS*` — matches baseline |

Closes the REQUIRED NOW gap: concurrent provisioned replace no longer bypasses Commercial occupancy serialization.
