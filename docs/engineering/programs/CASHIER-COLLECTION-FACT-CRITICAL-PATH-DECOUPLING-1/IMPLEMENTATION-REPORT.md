# IMPLEMENTATION-REPORT

Program: **CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1**

## Code

| File | Change |
|---|---|
| `PaymentConfirmService.ts` | Cashier `orderId` path passes `deferOperationalSettlementAfterCollectionFact: true`. opsLog `outcome` is `paid` when CF created/replayed. |
| `CheckService.ts` | After CF hook, defer path persists freeze on OPEN Check and returns without PAID/ST/OS/SR. `void completeCashierOperationalSettlementAfterCollectionFact` after the freeze TX commits. Downstream `finalizeOpenCheckById` (no CF hook) writes Check PAID + ST + OS + SR. Already-paid is idempotent. |
| `PosSettlementInitiateService.ts` | After successful Confirm, OPEN Check is eligible. Financial PAID is CF, not `operational_checks.outcome`. HTTP `resultFrom` remains `outcome: "paid"`. |
| `opsTaxonomy.ts` | `check_operational_settlement_deferred_failed` |

## Not changed

Session `settleCheckPaidByIdDetailed`, refund, Union, CF writer, schemas, Cashier UI (already rediscovers SR if HTTP `settlementRecordId` is null).

## Existing tests that encoded HTTP-awaits-SR

- `CheckService.m4.sessionOptionality.test.ts` “materializes … and settles PAID” calls `settleCashierPosOrderPaidByIdDetailed` **without** the defer flag → still inline PAID/ST/OS/SR. **Still valid** for the non-defer helper.
- PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1 money-slice guards still require ST/OS/SR **source** inside `finalizeOpenCheckById` (Session + downstream Cashier). **Still valid.**
- New Cashier HTTP guards require `void complete…` and Confirm `defer…: true`.
