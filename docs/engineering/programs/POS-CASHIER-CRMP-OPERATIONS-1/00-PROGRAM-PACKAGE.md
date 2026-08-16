# 00 — PROGRAM PACKAGE

**Program:** POS-CASHIER-CRMP-OPERATIONS-1  
**Date:** 2026-08-16  
**Mode:** AUDIT → OWNERSHIP DECISION → WIRING ONLY  
**Predecessor:** POS-REGISTER-SHIFT-IMPLEMENTATION-1  

| Item | Value |
|------|--------|
| STATUS | PASS — LOCALLY CERTIFIED |
| Cashier identity | Authenticated `users.id` / `PosAccessContext.userId` |
| Register/Shift owner | CRMP |
| POS adapters | `pos.cashier.register.*`, `pos.cashier.financialShift.*` |
| Cash movements | GAP — no public CRMP API, no idempotency |
| New tables | NONE |
| DATABASE MUTATION | 0 |
| PRODUCTION MUTATION | 0 |
| TARGETED TESTS | 11 / 11 |
| REGRESSION TESTS | 175 / 175 |
| BUILD | PASS |
| CHECK | 188 preexisting `error TS*` — unchanged |
| COMMIT / PUSH / DEPLOY | NONE |

POS is a command boundary. CRMP remains the owner of Register, Financial Shift, and cash custody.
