# 00 — PROGRAM PACKAGE

**Program:** POS-CASHIER-DRAWER-MOVEMENT-1  
**Date:** 2026-08-16  
**Mode:** AUDIT → OWNERSHIP DECISION → THIN POS ADAPTER  
**Predecessors:** POS-CASHIER-CRMP-OPERATIONS-1, CRMP-DRAWER-MOVEMENT-API-1  

| Item | Value |
|------|--------|
| STATUS | PASS — LOCALLY CERTIFIED |
| Decision | Reuse `PosCashierCrmpOperationsService`; call existing CRMP façade |
| POS owns | Access, `POS_ACCESS`, `REGISTER_ADJUST`, Terminal, thin adapter |
| CRMP owns | Drawer Movement, cash ledger, expected cash, idempotency, concurrency |
| Canonical POS API | `pos.cashier.financialShift.recordDrawerMovement` |
| CRMP API reused | `crmp.financialShift.recordDrawerMovement` |
| New tables | NONE |
| DATABASE MUTATION | 0 |
| PRODUCTION MUTATION | 0 |
| TARGETED TESTS | 11 / 11 |
| REGRESSION TESTS | 209 / 209 |
| BUILD | PASS |
| CHECK | 188 preexisting `error TS*` — unchanged |
| COMMIT / PUSH / DEPLOY | NONE |

CRMP remains the Drawer Movement authority. POS only authorizes a cashier and forwards the command.
