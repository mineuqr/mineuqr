# IDEMPOTENCY

Boundary:

`restaurantId + terminalId + cashier userId + idempotencyKey`

Fingerprint covers restaurant, terminal, cashier, items, notes.

| Case | Result |
|------|--------|
| Same key + same fingerprint | Replay original Order |
| Same key + different fingerprint | `idempotency_conflict` |
| Different key | Independent Sale |
| Concurrent same key | Exclusive lock → one Order |

Store: `PosSaleIdempotencyStore` (in-memory runtime). Intended persist: `pos_sale_idempotency` (`0093`). Not a POS Order table. Not a second generic idempotency platform.

Transaction relationship:

1. Authorize + validate
2. Exclusive claim on the key
3. IdentityPlaceOrder (Order transaction conventions)
4. Persist idempotency record with Order result

If step 3 succeeds and step 4 is lost, a later retry may place again until `0093` is applied with the unique key. Runtime tests serialize via `runExclusive`.

Does not reuse Event `DurableBusinessClaimStore` (varchar 36, no order-result recovery).
