# IMPLEMENTATION

## Order persist hook

`SaveOrderOptions.afterPersistInTransaction(tx, result)` runs inside `DrizzleOrderRepository.save`'s `db.transaction` after Order + items + BI + outbox.

When the hook is set:

- one attempt (no BI unique retry of a mapping collision)
- no `insertLegacy` fallback
- no DB â†’ `database_unavailable`

Waiter/QR PlaceOrder omit the hook and keep prior retry/legacy behavior.

## POS Sale

`PosSaleService` passes a hook that `putInTransaction`s the mapping. Unique collision throws `PosSaleIdempotencyUniqueCollisionError` so drizzle rolls back the Order tx. POS then `get`s the winner: same fingerprint â†’ replay; different â†’ fail closed.

`putInTransaction` must not treat same-fingerprint unique as success inside the Order tx.

## Check

`IdentityPlaceOrder.ensureCheckForOrder` still runs after `placeOrder.execute` returns (after commit). If the Order tx rolls back, Check is not called.

## Schema / migration

None. `orderId` remains NOT NULL.
