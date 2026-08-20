# IMPLEMENTATION-REPORT

INVESTIGATION THEN IMPLEMENTATION. NO SCHEMA. NO 0098. NO PRODUCTION WRITES.

## Application

- `findProductionCollectionFactByOrderId` (read-only)
- POS initiate: existing production CF → replay, schedule recovery, no second settle
- `pos.read.check.getByOrder`: `collectionFactId`, `financiallyPaid`; Check.outcome unchanged
- Cashier unknown-result recovery: OPEN + `financiallyPaid` → PAYMENT_CONFIRMED
- Confirm success toast no longer awaits `settlementRecord.getByCheck` (print rediscovers in the background)
- `continueAfterCashierHttp` around deferred `completeCashier…` (best-effort)
- HTTP sweep + `vercel.json` cron
- cashier_pos operational list includes production Collection Fact existence

## Not changed

- Collection Fact writer / insert-only
- Revenue Union overlap rule
- Session / Waiter / Kiosk / QR / Counter Confirm paths
- ST/OS/SR still after HTTP
