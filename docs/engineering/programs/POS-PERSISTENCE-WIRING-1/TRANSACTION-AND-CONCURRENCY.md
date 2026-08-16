# TRANSACTION AND CONCURRENCY

## What is atomic

- Insert of one `pos_sale_idempotency` row (single INSERT)
- Unique-index rejection of a second row with the same key
- Insert of one terminal / grant row under their unique indexes

## What is not atomic

POS Sale path:

```
runExclusive (process-local)
  â†’ idempotency get
  â†’ IdentityPlaceOrder (Order domain)
  â†’ idempotency put
```

Order create and idempotency persist are **not** one database transaction.

**Why:** Order persistence is owned by the Order domain. This program must not wrap Order in a POS transaction manager or invent a POS Order table. `orderId` on `pos_sale_idempotency` is NOT NULL, so a pre-Order reservation row would require migration 0094.

## Remaining risk

Cross-instance race:

1. Both lookups miss
2. Both create Orders
3. First `put` wins
4. Second `put` hits unique index
5. Same fingerprint: second request returns the **winnerâ€™s** Order echo (`replayed: true`); the loserâ€™s Order is an orphan
6. Different fingerprint: fail closed; original row is not overwritten

This is acceptable for the current phase: uniqueness is enforced, fingerprint mismatch cannot create a second mapped sale, and orphan Order cleanup is deferred (Order domain / ops), not a POS second ledger.

## Concurrency kinds

| Kind | Where |
|------|--------|
| Application mutex | `runExclusive` â€” same process only |
| Database uniqueness | Terminal code, grant tuple, sale idempotency key |
| Optimistic concurrency | Terminal `version` incremented on lifecycle update |
| Transaction atomicity | Not used across Order + POS idempotency |

No advisory locks or new locking infrastructure.
