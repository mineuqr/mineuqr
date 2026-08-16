# LOCK ORDERING

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

## Chosen order

```
Quantity child create:
  commercial_limit_occupancy_locks  FOR UPDATE
        ↓
  restaurants                       FOR UPDATE
        ↓
  COUNT(*) / checkLimit / INSERT
        ↓
  COMMIT
```

```
Restaurant delete / admin catalog insert / order insert:
  restaurants                       FOR UPDATE
        ↓
  cascade or INSERT
        ↓
  COMMIT
```

## Why this order

1. G-07 already acquires the occupancy mutex at the start of the occupancy txn. Domain parent lock is added **inside** `countOccupancy`, after that mutex.
2. Delete never takes the occupancy mutex. Commercial is not responsible for restaurant lifecycle.
3. Admin G-09 and order create never take the occupancy mutex. They only need parent existence.

## Inversion that must not be introduced

`restaurants FOR UPDATE` **then** occupancy mutex, on a path that also uses the quantity order above.

That pairing deadlocks:

- T1 quantity: mutex → wait restaurant
- T2 (wrong): restaurant → wait mutex

Guards: occupancy helper has no restaurant lock; restaurant lock is only in domain callers after mutex (quantity) or alone (delete/admin/order).

## Deadlock / retry

| Pair | Outcome |
|------|---------|
| Create ∥ create (same restaurant, same limitKey) | Serialized on mutex; COUNT stays `<= cap` |
| Create ∥ delete | Serialized on restaurant row; no orphan |
| Delete ∥ delete | Serialized on restaurant row; row ends absent |
| Tenant A delete ∥ tenant B create | Different restaurant PKs; no wait |

Occupancy helper retries errno 1213 / 1205 up to 3 times. `RestaurantGoneError` maps to tRPC `NOT_FOUND` (category/item) or `PosEntitlementDeniedError("restaurant_not_found")` (POS). It is not a capacity retry.

## Tenant isolation

Lock identity is `restaurants.id`. Occupancy mutex identity remains `(scopeKind, scopeId, limitKey)`. Cross-tenant evidence: tenant B create elapsed ~1549ms while A deleted; B category committed.
