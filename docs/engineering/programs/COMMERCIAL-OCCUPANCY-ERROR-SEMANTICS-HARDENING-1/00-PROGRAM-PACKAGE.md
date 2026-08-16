# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1  
**Audit id:** G-06  
**Date:** 2026-08-16  
**Mode:** AUDIT → IMPLEMENT → TEST → CERTIFY  
**Predecessor:** COMMERCIAL-RESTAURANT-CASCADE-POS-ORPHAN-HARDENING-1  
**STATUS:** PASS — LOCALLY CERTIFIED  

| Item | Value |
|------|--------|
| Fix | Shared `throwCommercialOccupancyTrpcError`: limit exceeded → tRPC `FORBIDDEN`; occupancy unavailable → tRPC `INTERNAL_SERVER_ERROR` |
| G-04 | Unchanged (403 + `limit_exceeded` vs 403 + `commercial_capacity_unavailable`) |
| Migration | NONE |
| Production / git / deploy | NONE |
| Targeted tests | 8 files / 44 passed |
| Combined regression | 64 files / 424 passed |
| Build | PASS |
| Check | 188 `error TS*` — baseline |
