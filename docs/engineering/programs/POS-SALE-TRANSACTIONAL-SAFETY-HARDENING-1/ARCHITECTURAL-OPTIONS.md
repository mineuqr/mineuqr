# ARCHITECTURAL OPTIONS

## A. One database transaction: Order create + POS mapping

**Mechanism in this codebase:** join the mapping insert to `DrizzleOrderRepository.save`'s existing `db.transaction` via `afterPersistInTransaction(tx, result)`. Do not start a second POS transaction (it would be a different connection).

| Axis | Assessment |
|------|------------|
| Correctness | Same connection: unique mapping failure rolls back Order, items, BI, outbox |
| Failure modes | Hook throw â†’ drizzle rolls back callback; no legacy fallback when hook present |
| Retry | Client retries same key; `get` sees winner or empty |
| Cross-instance | Loser's tx hits unique index, rolls back; winner commits one Order + one mapping |
| Concurrency | Unique index is the serialization point (InnoDB/TiDB) |
| Tenant isolation | Unchanged (context-derived keys) |
| Idempotency | Same key + fingerprint â†’ replay after rollback; mismatch â†’ fail closed |
| Locking | No new advisory locks; unique insert |
| Tx duration | One extra INSERT inside existing Order tx (short) |
| Performance | Negligible |
| Operational complexity | Low |
| Migration | 0 |
| Backward compatibility | Waiter/QR PlaceOrder unchanged (no hook) |
| Order Domain | Minimum persist option; Order still writes Order rows |
| Future payment/settlement | Mapping still points at canonical Order |
| ZATCA / reporting | Unchanged authorities |
| Maintainability | Reuses Order+outbox companion-write pattern |

## B. Injected transaction/session into IdentityPlaceOrder

POS starts `db.transaction`, passes `tx` into PlaceOrder/Order save (skip inner tx).

Correct if and only if Order uses **that** `tx`. Larger API surface. BI retry currently wraps Order's inner tx and would have to move to POS. Rejected as larger than A for the same atomicity.

## C. Transactional outbox / durable command record

New POS command table + worker. Equivalent eventual consistency, new infrastructure, delayed cashier ACK. Not required now.

## D. Reservation-first mapping then Order

Requires nullable `orderId` (migration 0094) or a pending table. Two-phase inside one tx is possible after schema change; without it, NOT NULL blocks reservation. Strong, but not smallest given A closes the GAP without 0094.

## E. Reconciliation / eventual consistency

Orphan scanner deleting extra Orders. Not equivalent to atomic create; dangerous around BI numbers, outbox, and Check. Rejected as the primary control.

## F. Existing MineuQR pattern (selected)

Order save already persists Order + BI + outbox on one `tx`. POS mapping is a fourth companion write on that `tx`, owned by POS code (the callback), not by a POS Order aggregate.

**Decision: A implemented as F** â€” `afterPersistInTransaction` inside Order's existing transaction. Unique collision from the hook is not BI-retried and does not fall back to `insertLegacy`.
