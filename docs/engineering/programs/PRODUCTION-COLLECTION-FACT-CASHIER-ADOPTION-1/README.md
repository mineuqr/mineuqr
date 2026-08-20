# PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1

**PASS — IMPLEMENTED / VALIDATED / ADOPTED / NOT DEPLOYED**

Cashier Confirm now consumes the certified Production Collection Fact commit contract.

It does **not** own Collection Fact persistence.
It does **not** become Revenue or Settlement authority.
It does **not** create a Payment aggregate or `payments` table.
It does **not** invent refund/void/complimentary Collection Fact kinds.
It does **not** introduce offline financial mode.
It does **not** create migration 0098.

## Status

| Claim | Status |
|---|---|
| Cashier | **ADOPTED** |
| Collection Fact | **NOT LIVE** (code path certified; no production writes; not deployed) |
| Payment Intent | **CERTIFIED** (`cpi_` attempt id, not `orderId`) |
| Idempotency | **CERTIFIED** (writer replay / CONFLICT) |
| Terminal | **CERTIFIED** (mandatory; missing = VALIDATION) |
| Actor | **CERTIFIED** (mandatory; missing = VALIDATION) |
| PAID | **CHANGED** (cashier `orderId` path: CF commit is the financial commit before Check PAID write) |
| Settlement | **UNCHANGED** (ST/OS/SR remain Check-owned downstream writers) |
| Revenue Union | **RECONCILED** (existing production-authority rule; no Union rewrite) |
| Migration | **0097** |
| Production Collection Fact rows | **0 → 0** |
| Deployment | **NOT DEPLOYED** |
| Push | **NOT PUSHED** |

## Canonical path

```
CASHIER
  → Payment UI
  → CONFIRM
  → PAYMENT COMMIT
  → IMMUTABLE PRODUCTION COLLECTION FACT
  → COMMITTED / PAID
  → HTTP SUCCESS
  → ST / OS / SR
  → Revenue Union
  → Reporting
```

One payment. One immutable financial fact. One published economic contribution.

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
