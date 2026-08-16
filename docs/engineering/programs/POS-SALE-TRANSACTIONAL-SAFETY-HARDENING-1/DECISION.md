# DECISION

**Selected:** Join `pos_sale_idempotency` INSERT to the existing Order save transaction via `SaveOrderOptions.afterPersistInTransaction`.

**Transaction owner:** Order Domain (`DrizzleOrderRepository.save`).

**POS owns:** the callback that inserts the mapping; unique-collision recovery (`get` after rollback â†’ replay or fail closed).

**Not selected:** POS-owned outer transaction (wrong connection), reservation-first (0094), outbox worker, orphan reconciliation as primary control.

## Invariant protocol

```
get mapping
  existing + same fingerprint â†’ replay
  existing + different fingerprint â†’ fail closed
place Order with afterPersistInTransaction:
  insert mapping on same tx
  unique collision â†’ throw (tx rolls back Order+items+BI+outbox)
on unique collision:
  get mapping
    same fingerprint â†’ replay winner
    different fingerprint â†’ fail closed
    missing â†’ propagate
```

`putInTransaction` must **not** treat same-fingerprint unique as success inside the Order tx (that would commit a second Order). Same-fingerprint success happens only after rollback, by reading the winner.

## REQUIRED NOW

Atomic Order + POS sale mapping; unique collision rolls back Order; fingerprint fail-closed; no 0094; no POS Order table.

## REQUIRED FOUNDATION FOR FUTURE

Same companion-write hook can be reused if other command mappings must be atomic with Order create. Settlement/payment remain other authorities.

## SAFE TO DEFER

Check enrollment atomicity with Order (pre-existing IdentityPlaceOrder best-effort). Order number allocate-before-tx (pre-existing PlaceOrder). SQL Check/Settlement POS idempotency. POS UI. Freeze. ZATCA.

## SHOULD NEVER BE INTRODUCED

POS Order aggregate, POS ledger, second Order identity, client-authoritative totals, offline financial ledger, generic UnitOfWork framework without evidence.
