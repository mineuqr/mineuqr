# FORENSIC AUDIT

**Program:** POS-SALE-TRANSACTIONAL-SAFETY-HARDENING-1
**Mode:** Read-only forensic audit (completed before implementation)

## Current POS Sale path

```
auth / POS access / fingerprint
â†’ runExclusive (process-local mutex)
  â†’ idempotency.get
  â†’ IdentityPlaceOrder.execute
       â†’ resolveOperationalSession
       â†’ PlaceOrderService.execute
            â†’ pricing, orderNumber.allocate (OUTSIDE Order tx)
            â†’ OrderRepository.save
                 â†’ db.transaction: orders + order_items + BI + outbox
                 â†’ on failure: BI retry, then insertLegacy (non-transactional)
       â†’ ensureCheckForOrder (separate Check tx; best-effort catch)
  â†’ idempotency.put (separate connection / statement)
  â†’ idempotency.get
```

Order commit and POS mapping commit are **two units of work**.

## Order transaction ownership

`DrizzleOrderRepository.save` already opens `db.transaction` and writes:

- `orders`
- `order_items`
- Business Identity sequence + stamp (`allocateForNewOrder(tx, â€¦)`)
- `order_domain_outbox` via `appendInTransaction(tx, â€¦)`

`IdentityPlaceOrder` does **not** accept a transaction. Check enrollment uses `withCheckOwnedTransaction` on a **different** connection after Order save returns (i.e. after Order commit).

`getDb().transaction` from a second caller cannot join that unit of work: Order save calls `getDb()` itself and starts its own transaction on a pool connection. An outer POS `db.transaction` wrapping `placeOrder.execute()` would use connection A; Order would commit on connection B. Rolling back A would **not** roll back B.

## Schema

`pos_sale_idempotency.orderId` is NOT NULL (0093). Reservation-first without a migration cannot insert a mapping row before Order create.

## Existing MineuQR transaction patterns

- Order save: `db.transaction` (canonical for Order create)
- Business Identity: participates in the Order tx on the hot path
- Outbox: `appendInTransaction(tx)`
- Check: `db.transaction` / `withCheckOwnedTransaction`
- Commercial charged terms / concessions: `db.transaction`
- Dining session: `db.transaction`

Companion writes on the **same** `tx` object already exist (Order + BI + outbox). There is no generic UnitOfWork framework.

## Ownership constraints

| Domain | Must remain owner |
|--------|-------------------|
| Order | Canonical Order, BI allocation, outbox |
| POS | Access, terminal, sale command, sale idempotency mapping |
| Check | Check / membership (already after Order commit) |
| Settlement / CRMP / Reporting | Untouched |

Injecting a POS-owned outer transaction manager into Order would make POS the coordinator of Order writes. Joining POS's mapping insert **into the existing Order save transaction** keeps Order as transaction owner and does not duplicate Order creation.

## Predecessor GAP (confirmed)

1. Order succeeds, mapping fails â†’ orphan canonical Order
2. Two instances both miss `get` â†’ two Orders; unique index maps one; the other is an orphan
3. Unique index + retry is **not** equivalent to atomic create

## Check enrollment

Pre-existing: `ensureCheckForOrder` is after Order commit and failures are logged, not rolled back. This program's invariant is **Order + POS mapping**, not Check. Check stays after successful commit (same as today). If mapping aborts the Order tx, Check is never called.
