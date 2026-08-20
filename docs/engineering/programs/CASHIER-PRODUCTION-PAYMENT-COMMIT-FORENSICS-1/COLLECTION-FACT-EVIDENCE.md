# COLLECTION-FACT-EVIDENCE

## Production SQL

**UNKNOWN.** This investigation did not open a production database. No `SELECT` / `COUNT(*)` was executed. No controlled production payment was taken.

Required next step (separate authorized session): read-only

```sql
SELECT collectionFactId, restaurantId, orderId, paymentIntentId,
       orderingChannel, purpose, kind, amount, currencyCode, checkId,
       terminalId, actorType, actorId, businessDay, idempotencyKey, committedAt
FROM payment_collection_facts
WHERE purpose = 'production' AND orderingChannel = 'cashier_pos'
ORDER BY committedAt DESC
LIMIT 20;
```

Join `operational_checks.outcome`, `check_settlement_transactions`, `check_order_settlements.status`, `settlement_records` for the same `checkId`.

**Do not INSERT/UPDATE/DELETE.**

## What source guarantees

- Cashier Confirm uses `commitCashierProductionCollectionFact`.
- Replay: same `paymentIntentId` + same POS `idempotencyKey` → same fact.
- Different `paymentIntentId` on the same order is a **second** Collection Fact (certified writer behavior).

## Idempotency vs the error toast

| Operator action | Identities | Expected CF |
|---|---|---|
| Retry after `recoveryNotCommitted` without leaving the sheet | **same** `paymentIntentRef` / `settleKeyRef` | **replay** |
| After `paidSuccess`, `startNewSale`, pay same OPEN order from the list | **new** intent + key | **new fact (P1)** |

Error-path retry is designed to replay. Success-then-new-sale on an OPEN Check is a second economic payment.
