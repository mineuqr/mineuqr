# CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1

**PASS WITH GAP — INVESTIGATION ONLY**

NO CODE CHANGE to application runtime. NO SCHEMA CHANGE. NO MIGRATION. NO PRODUCTION DEPLOYMENT. NO PRODUCTION WRITES.

Financial commit in **source** matches the approved diagram: Collection Fact → HTTP SUCCESS → ST/OS/SR not awaited.

The observed 7–8s Confirm wait and SUCCESS-then-ERROR UX are **not measured in production logs from this workspace**. They are explained from **source + existing tests**, with production milliseconds marked **UNKNOWN**.

## Classification

**PASS WITH GAP**

- Not FAIL on HTTP awaiting ST/OS/SR in committed source (`void completeCashier…`). HTTP still awaits freeze TX + Collection Fact + POS `idempotency.put` (source).
- Not FAIL on Collection Fact as financial authority in source.
- Not CRITICAL on retry-after-error: error path keeps `paymentIntentId` / POS key → CF replay. **P1** if operator pays the same OPEN order after `startNewSale` (new identities → second fact).
- UI can report **PAYMENT_NOT_CONFIRMED** (`recoveryNotCommitted`) while Check is still **OPEN** after a committed Collection Fact. That is **FINANCIAL SUCCESS + SECONDARY UI FAILURE**, not CF rollback.
- Production recovery worker **does not start on Vercel**. No `waitUntil`.
- Confirm 7–8s and method 1s: **UNKNOWN** (no production `pos_settlement_initiate` / `cashier_payment_flow` samples in this environment).

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [PRODUCTION-TIMELINE.md](./PRODUCTION-TIMELINE.md)
- [CASHIER-CONFIRM-FORENSICS.md](./CASHIER-CONFIRM-FORENSICS.md)
- [UI-RESULT-STATE-ANALYSIS.md](./UI-RESULT-STATE-ANALYSIS.md)
- [COLLECTION-FACT-EVIDENCE.md](./COLLECTION-FACT-EVIDENCE.md)
- [DOWNSTREAM-TIMING-REPORT.md](./DOWNSTREAM-TIMING-REPORT.md)
- [LEGACY-DEPENDENCY-CLASSIFICATION.md](./LEGACY-DEPENDENCY-CLASSIFICATION.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)

Regression: **408 passed / 1 failed / 0 skipped** across the listed suites. The one failure is a **pre-existing** stale instrumentation guard (`getCheckById` vs `findCheckById` inside `finalizeOpenCheckById`) at HEAD `3c15dff9`. It is not a Collection Fact / HTTP-await-ST regression. Not remediated here.
