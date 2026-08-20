# PRODUCTION-TIMELINE

Evidence classes: **MEASURED** (this workspace) · **INFERRED** (source) · **UNKNOWN** (needs production logs/SQL).

Git baseline **MEASURED**: `3c15dff9` clean `main` = `origin/main`.

No production `opsLog` / `cashierPaymentFlowTiming` snapshots were available in this environment. Durations below are **UNKNOWN** unless noted.

| Stage | Start | End | Duration | Blocking HTTP? | Evidence |
|---|---|---|---|---|---|
| 1. Payment method selection | method `onClick` | `setTenderMode` / `setPaymentMethod` | **UNKNOWN** (~1s user report) | No | **INFERRED**: click is local state only; Confirm waits on `saleReady` (`sale.create` not pending) |
| 2. Payment UI state | `setTenderMode` | Confirm enabled | **UNKNOWN** | No | `resolveCashierPaymentReadiness`; `saleMutation.isPending` shows `verifyingAmount` |
| 3. Confirm click | `CASHIER_PAYMENT_CONFIRM_CLICK` | next | **UNKNOWN** | — | `cashierPaymentFlowTiming.mark` exists; no production sample |
| 4. Frontend request start | `CASHIER_SETTLEMENT_REQUEST_START` | mutateAsync | **UNKNOWN** | — | same |
| 5. Backend arrival | tRPC `pos.settlement.initiate` | auth | **UNKNOWN** | Yes | `PosSettlementInitiateService.initiate` |
| 6. Auth/terminal | access + grants | order load | **UNKNOWN** | Yes | `pos_settlement_initiate` fields `authMs` |
| 7. Order load | `orderLoadMs` | context | **UNKNOWN** | Yes | telemetry field exists |
| 8. Check materialize/freeze | cashier settle TX | freeze persist | **UNKNOWN** | Yes | `withCheckOwnedTransaction` |
| 9. Check money calculation | `computeCheckMoney` | CF hook | **UNKNOWN** | Yes | in freeze TX |
| 10. Collection Fact start | `productionCollectionCommit` | insert/replay | **UNKNOWN** | Yes | awaited in freeze TX |
| 11. CF created/replayed | writer return | COMMITTED | **UNKNOWN** | Yes | financial PAID |
| 12. Freeze TX commit | Check OPEN persist | TX end | **UNKNOWN** | Yes | HTTP after this |
| 13. PAID (financial) | CF created/replayed | opsLog `outcome: paid` | **UNKNOWN** | Yes | Check row may still be OPEN |
| 14. HTTP response generated | `idempotency.put` then `resultFrom` `outcome: "paid"` | send | **UNKNOWN** | Yes (`idempotency.put` after CF) | SR id often null; **not** ST/OS/SR |
| 15. HTTP received | mutateAsync resolve | — | **UNKNOWN** (user ~7–8s total) | — | no browser HAR in this environment |
| 16. UI success handler | after HTTP | toast | **UNKNOWN** | No (after HTTP) | **awaits** `settlementRecord.getByCheck` if SR null |
| 17. Cache invalidation | `invalidateOrderReads` | refetch | **UNKNOWN** | No | after toast.success |
| 18. Settlement rediscovery | `getByCheck` | id or null | **UNKNOWN** | **Blocks toast**, not HTTP | every Confirm after decoupling (SR null) |
| 19–21. ST / OS / SR | `void completeCashier…` | TX | **UNKNOWN** | **No** (source) | may never finish on Vercel (function freeze) |
| 22. Recovery scheduling | boot interval | — | **N/A on Vercel** | No | worker not started |
| 23. Print | `setPrintOpen` if SR id | — | **UNKNOWN** | No | skipped if SR null |
| 24. Error toast | `recoveryNotCommitted` | — | **UNKNOWN** | No | only catch / recovery OPEN |

## Critical boundary

Collection Fact COMMITTED → freeze TX COMMIT → HTTP SUCCESS: **awaited together on the server (source)**.

ST/OS/SR: **not** awaited for HTTP (**source**). **UNKNOWN** whether production HTTP duration is dominated by freeze+CF vs network vs client rediscovery.
