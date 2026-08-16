# 00 — PROGRAM PACKAGE

**Program:** CRMP-DRAWER-MOVEMENT-API-1  
**Date:** 2026-08-16  
**Mode:** AUDIT → OWNERSHIP DECISION → SMALLEST CRMP API  
**Predecessor:** POS-CASHIER-CRMP-OPERATIONS-1  

| Item | Value |
|------|--------|
| STATUS | PASS — LOCALLY CERTIFIED |
| Decision | B — existing domain/persistence sufficient; public API + idempotency added |
| Owner | CRMP Financial Shift / Drawer |
| Canonical types | `paid_in`, `paid_out`, `safe_drop`, `manual_adjustment` |
| Public API | `crmp.financialShift.recordDrawerMovement` |
| Persistence | Existing `crmp_drawer_movements` |
| New tables | NONE |
| POS consumption | NOT in this program |
| DATABASE MUTATION | 0 |
| PRODUCTION MUTATION | 0 |
| TARGETED TESTS | 13 / 13 |
| REGRESSION TESTS | 196 / 196 |
| BUILD | PASS |
| CHECK | 188 preexisting `error TS*` — unchanged |
| COMMIT / PUSH / DEPLOY | NONE |

CRMP owns drawer cash. POS remains a future consumer. No POS cash tables. No second ledger.
