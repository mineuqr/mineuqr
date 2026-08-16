# POS CHECK IDEMPOTENCY

Two layers:

1. **Check Domain** — `ensureCheckForOrder` returns the existing open Check for an already-enrolled Order.
2. **POS command** — in-memory map keyed by `restaurant + terminal + cashier + idempotencyKey`, fingerprint = those plus `orderId`.

| Case | Result |
|------|--------|
| Same key + same Order | Replay |
| Same key + different Order | `idempotency_conflict` |
| Different key + same Order | Domain ensure; same Check id |
| Concurrent same key | Exclusive lock → one ensure |

Sale idempotency (`pos_sale_idempotency`) is not reused.

No new SQL table. Domain uniqueness is already persisted on `check_order_membership`. POS command store is orchestration-only (same runtime pattern as current sale/grant stores).
