# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-RESTAURANT-CASCADE-POS-ORPHAN-HARDENING-1  
**Audit id:** G-05  
**Date:** 2026-08-16  
**Mode:** AUDIT → IMPLEMENT → TEST → CERTIFY  
**Predecessor:** COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1  
**STATUS:** PASS — LOCALLY CERTIFIED  

| Item | Value |
|------|--------|
| Fix | `deleteRestaurantCascadeTx` deletes restaurant-scoped `pos_sale_idempotency`, `pos_permission_grants`, `pos_terminals` before the restaurant row |
| Migration | NONE (no FK existed; application cascade matches DELETE-ARCH-1B) |
| Production mutation | 0 |
| Commit / push / deploy | NONE |
| Targeted tests | 3 files / 17 passed |
| Combined regression | 62 files / 417 passed |
| Build | PASS |
| Check | 188 `error TS*` — baseline |

Closes G-05: restaurant hard-delete cannot leave POS terminal (or restaurant-owned POS grant / sale-idempotency) rows.
