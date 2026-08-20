# ARCHITECTURE-DECISION-REPORT

Program: **CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1**

Investigation only. The approved Cashier financial boundary is not changed.

## What this program decided

Nothing about runtime architecture. Findings only.

## What source proves (not production ms)

HTTP SUCCESS after Collection Fact create/replay is still the certified Cashier `orderId` path (`deferOperationalSettlementAfterCollectionFact: true`, `void completeCashierOperationalSettlementAfterCollectionFact`). Remaining HTTP work after CF is POS `idempotency.put` and response construction — **not** ST/OS/SR.

UI recovery (`recoverCashierUnknownSettlement`) does **not** read Collection Fact. It treats Check `outcome === "open"` as unpaid.

Vercel serverless entry never calls `startCashierDownstreamSettlementRecoveryWorker`. That worker is started only in `startServer()` which is skipped when `process.env.VERCEL` is set.
