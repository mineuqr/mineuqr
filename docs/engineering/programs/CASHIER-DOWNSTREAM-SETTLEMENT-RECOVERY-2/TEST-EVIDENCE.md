# TEST-EVIDENCE

New/updated coverage:

| Requirement | Test |
|---|---|
| CF + OPEN Check = financially PAID | `cashierSettlementUnknownResultRecovery.test.ts`, `posRead.check.test.ts` |
| Missing ST/OS/SR filled, no duplicates | existing `cashierDownstreamSettlementRecovery.test.ts` |
| Crash resume via DB sweep | `cashierDownstreamSettlementRecoveryWorker.test.ts` |
| Concurrent in-process recover | same worker file |
| HTTP does not await ST | decoupling tests + architecture guards |
| Network uncertainty after CF | OPEN + `financiallyPaid` → PAYMENT_CONFIRMED |
| Second pay blocked | `posSettlementInitiate.order.test.ts` existing-fact replay |
| Same intent+key replay | existing POS idempotency tests |
| Production HTTP sweep auth | `cashierDownstreamSettlementRecoveryHttp.test.ts` |
| No 0098 | architecture guards |
| Revenue Union | existing authority tests |
| Other channels | architecture guards |

This program's focused + regression files (re-run for certification):

- Targeted Recovery-2 / Cashier / POS / recovery: **18 files, 138 passed**
- CF / Confirm / Union / metrics / refund / migration: **15 files, 133 passed**
- Check / OS / SR / refund integration: **4 files, 46 passed**
- Combined: **37 passed files, 317 passed tests**; **1 failed test** in a **PRE-EXISTING / UNRELATED** instrumentation guard.

**PRE-EXISTING / UNRELATED:** `posSettlementFinancialTxnStage.architecture.guards.test.ts` still searches `finalizeOpenCheckById` for `await getCheckById(`; implementation reloads via `findCheckById`. Not weakened. Not part of Recovery-2.

Do not treat the entire combined suite as PASS while that pre-existing guard fails.
