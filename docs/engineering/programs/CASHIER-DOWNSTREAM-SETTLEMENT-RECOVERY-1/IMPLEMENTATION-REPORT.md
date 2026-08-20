# IMPLEMENTATION-REPORT

| File | Change |
|---|---|
| `collectionFactRepository.ts` | Read-only `findProductionCollectionFactByCheckId` |
| `cashierDownstreamSettlementRecovery.ts` | Inspect + fill remaining ST/OS/SR. No CF write. |
| `cashierDownstreamSettlementRecoveryRepository.ts` | List incomplete obligations from CF+Check+SR |
| `cashierDownstreamSettlementRecoveryWorker.ts` | Sweep, in-process lock, backoff, boot interval |
| `CheckService.ts` | OPEN → finalize. PAID → remaining components only. |
| `PosSettlementInitiateService.ts` | Idempotency replay schedules recovery, does not await |
| `_core/index.ts` | Start worker after listen |
| `opsTaxonomy.ts` | Recovery / failed / attention events |

Session, Waiter, Kiosk, QR, Counter Pickup: unchanged.
