# ARCHITECTURE-DECISION-REPORT

Program: **CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1**

This program **implements** CASHIER-FINANCIAL-COMMIT-BOUNDARY-DECISION-1 OPTION A. It does not redesign Collection Fact, Check, ST, OS, SR, or Revenue Union.

## Binding rules applied

| Rule | Implementation |
|---|---|
| CF `created`/`replayed` = financial commit | Unchanged writer; Cashier still consumes `commitCashierProductionCollectionFact` |
| PAID = that commit | `payment.confirm` logs `outcome: "paid"` when `collectionFactOutcome` is set; POS result already `outcome: "paid"` |
| HTTP must not await ST/OS/SR | `deferOperationalSettlementAfterCollectionFact: true` on Cashier `confirmPayment` only |
| Check PAID write is operational | Downstream `finalizeOpenCheckById` without CF hook; POS accepts OPEN Check after Confirm |
| Session unchanged | `checkId` Confirm does not pass the defer flag |
| No 0098 / no `payments` table | No schema change |

## What was not decided here

Ownership of Check/ST/OS/SR remains as certified. Only their **position** on the Cashier HTTP await chain changed.
