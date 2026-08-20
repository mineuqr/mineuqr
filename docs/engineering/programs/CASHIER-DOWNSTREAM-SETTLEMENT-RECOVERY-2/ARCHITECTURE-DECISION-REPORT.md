# ARCHITECTURE-DECISION-REPORT

Program: **CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2**

Does not redesign Collection Fact, Check, ST, OS, SR, or Revenue Union. Does not undo critical-path decoupling.

## Durable obligation — still no 0098

Same derivation as CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1:

Production cashier Collection Fact (`purpose=production`, `orderingChannel=cashier_pos`, `checkId` set)
+ Check OPEN **or** Check PAID missing settlement SR
→ pending downstream obligation.

A recovery table would be a second identity. Existing rows are sufficient.

## Production execution

| Mechanism | Role | Survives isolate freeze? |
|---|---|---|
| `continueAfterCashierHttp` (`waitUntil` if `@vercel/functions` exists) | Best-effort immediate ST/OS/SR | **No** (not required) |
| POS idempotency replay `schedule…` | Opportunistic on retry | On next request |
| `GET/POST /api/internal/cashier-downstream-recovery/sweep` | **Durable** | Yes, database selection |
| Vercel Cron `* * * * *` → that path | Production trigger | Yes |
| `startServer()` 15s worker | Local/non-Vercel only | Yes on that process |

Cron authentication: `Authorization: Bearer ${CRON_SECRET}` (or `CASHIER_DOWNSTREAM_RECOVERY_CRON_SECRET`). Fail closed if unset.

## Financial vs operational

| State | Meaning |
|---|---|
| Collection Fact committed/replayed | Financially PAID |
| Check OPEN after CF | Operational downstream pending |
| Check PAID + ST + OS + SR | Downstream completed |

Unknown-result UI recovery must not treat Check OPEN as unpaid when `financiallyPaid` is true.

## Duplicate payment

If a production Collection Fact already exists for the order, `pos.settlement.initiate` **does not** call `settlePaid`. It returns HTTP paid (`replayed: true`) and schedules recovery. Same order cannot mint a second Collection Fact through Cashier POS.
