# IDEMPOTENCY PERSISTENCE

Table: `pos_sale_idempotency` (0093). Ownership: POS Sale command idempotency. Not a POS Order table.

## Uniqueness authority

```
restaurantId + terminalId + userId + idempotencyKey
```

The unique index is the final authority. Application `get` then `put` is not sufficient across processes.

## Fields persisted

restaurantId, terminalId, userId, idempotencyKey, fingerprint, orderId, orderNumber, trackingToken, displayReference, totalAmount, itemCount, createdAt.

`orderId` is NOT NULL. A reservation row cannot be inserted before Order create without a schema change. That is a documented GAP, not a silent 0094.

## Duplicate handling

| Case | Behavior |
|------|----------|
| Same key, same fingerprint | Success. Existing row is kept. No overwrite. |
| Same key, different fingerprint | `PosSaleIdempotencyConflictError` â†’ `idempotency_conflict`. Fail closed. |
| Concurrent inserts | Loser hits `ER_DUP_ENTRY`, then re-reads; mismatch fails closed |

`put` never updates the original row.

## Isolation

Keys do not collide across restaurants, terminals, or users. Global idempotency was not introduced.

## In-process mutex

`runExclusive` remains process-local (same as InMemory). Cross-instance safety is the unique index.
