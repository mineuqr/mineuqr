# TRANSACTION-BOUNDARY

## Financial commit transaction

Ends when `commitCollectionFact` returns `created` or `replayed` (separate Drizzle connection, certified).

Cashier freeze TX (Check-owned):

1. Materialize OPEN Check, membership, charges, OS pending
2. Freeze money (`computeCheckMoney`)
3. Await Collection Fact hook (separate connection)
4. Persist freeze on OPEN Check (`updateCheckMoney`)
5. COMMIT — no Check PAID, no ST, no OS settled, no SR

If CF storage throws, this TX rolls back. HTTP fails. No PAID.

POS `initiate` then returns HTTP success (`resultFrom.outcome: "paid"`) without requiring Check PAID. OPEN Check after this TX is expected until the downstream operational TX.

## Downstream operational transaction

`completeCashierOperationalSettlementAfterCollectionFact` calls `finalizeOpenCheckById` **without** `productionCollectionCommit` and **without** defer:

- New Check-owned TX
- Check PAID + ST + OS + SR
- Attribution fire-and-forget (`awaitAttribution: false`)

Failure logs `check_operational_settlement_deferred_failed`. CF is not in this TX and cannot be rolled back.

## Why CF is not in the downstream TX

Certified: CF insert uses its own connection so Check rollback cannot delete the fact. Downstream is a later TX; it must not call the CF writer again except via Confirm retry replay.
