# DOWNSTREAM-RECOVERY-PLAN

## Mechanism

Smallest existing pattern: `void … catch` (same as Cashier Attribution). No new queue.

| Field | Value |
|---|---|
| Owner | Check (`completeCashierOperationalSettlementAfterCollectionFact`) |
| Trigger | After freeze TX commit on Cashier defer path |
| Idempotency | Check still OPEN → full PAID+ST+OS/SR. Already PAID → `CheckTransitionError` swallowed. SR insert already idempotent (SR-INV-05). CF not invoked. |
| Retry | Confirm retry that re-enters `confirmPayment` (lost HTTP **before** POS idempotency put): CF replay, defer again, schedule downstream again. Direct `completeCashierOperationalSettlementAfterCollectionFact`. POS idempotency **replay** (same key after HTTP success) does **not** re-enter Confirm; if the process died after HTTP and before ST/OS/SR, Check stays OPEN and a later healer/retry that reaches Check finalize is required. CF remains committed. |
| Observability | `check_operational_settlement_deferred_failed` |
| Print | HTTP `settlementRecordId` may be null; UI already rediscovers via `settlementRecord.getByCheck` |
| Refund | Requires SR/Check PAID; may lag until downstream succeeds. Not undefined. |

## Duplicate prevention

- CF: unique `paymentIntentId` / idempotency (writer).
- Check PAID: 0-row UPDATE / transition error.
- SR: existing business-key idempotency.

## Ownership

Cashier Confirm does not own downstream persistence. Check finalize remains the writer. Collection Fact remains insert-only.
