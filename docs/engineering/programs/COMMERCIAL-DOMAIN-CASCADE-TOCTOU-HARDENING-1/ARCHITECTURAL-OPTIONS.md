# ARCHITECTURAL OPTIONS

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

## Option A — Parent-row serialization (chosen)

Restaurant row is the domain synchronization point.

Child mutation (quantity): occupancy mutex → `SELECT restaurants … FOR UPDATE` → validate → COUNT / create → COMMIT.  
Deletion: `SELECT restaurants … FOR UPDATE` → cascade → delete parent → COMMIT.

| Dimension | Assessment |
|-----------|------------|
| Correctness | Same committed row locked by both competitors; loser either fails closed or delete sees the child |
| TiDB | Existing-row `FOR UPDATE` waits (G-07 E1). RC required so post-wait child DELETE/COUNT are current |
| Transactions | Explicit RC on occupancy (already) and now on delete |
| Concurrency | Deterministic A or B of I-TOCTOU-04; proven on stagIn |
| Tenant isolation | Lock is `restaurants.id`; tenant B uses a different row |
| Rollback | Thrown `RestaurantGoneError` / occupancy errors abort the txn |
| Deadlock | Avoided by never taking restaurant then occupancy |
| Retry | Occupancy helper still retries 1213/1205; `RestaurantGoneError` is not retried as capacity |
| Migration | None |
| Performance | One extra PK `FOR UPDATE` per child create / delete |
| Scalability | Per restaurant, not global |
| Maintainability | One primitive: `restaurantRowLock.ts` |
| Compatibility | 0094 / `checkLimit` / COUNT unchanged |
| Technical debt | Callers of remaining D-class inserts must adopt the same primitive later |

## Option B — Foreign key enforcement (rejected)

| Dimension | Assessment |
|-----------|------------|
| Correctness | InnoDB/TiDB FK would reject INSERT after parent delete |
| Schema convention | **No FKs** to `restaurants` today (`restaurantsFkCount=0`) |
| Cascade semantics | Application cascade already deletes children then parent (DELETE-ARCH-1B) |
| TiDB | FK possible; not free with historical branch copies and missing `pos_terminals` on stagIn |
| Delete ordering | FK ON DELETE CASCADE would fight the explicit application order |
| Migration | Would require 0095 + orphan cleanup **before** ADD CONSTRAINT |
| Historical data | StagIn copy of production; adding FK without cleanup is operationally unsafe |
| Operational risk | High vs application lock; Production apply forbidden in this program |
| Compatibility | Breaks the no-FK schema convention |

Not added. Application-only correction is sufficient for the proven race.

## Option C — Shared domain lifecycle lock (rejected)

A generic mutex / Redis / `GET_LOCK` / POS-specific lock is unnecessary once the restaurant row exists. Would violate “do not introduce a generic distributed lock” and G-07 “never POS lock”.

## Option D — Transaction-boundary correction only (insufficient alone)

Moving `getRestaurantById` into the occupancy txn **without** `FOR UPDATE` still races: delete can remove the parent between a plain SELECT and INSERT, and delete still would not wait. Boundary correction is **part of A**, not a substitute for the parent lock.

## Option comparison

| Option | Prevents orphan | Changes occupancy | Migration | Chosen |
|--------|-----------------|-------------------|-----------|--------|
| A parent row | Yes | No | No | **Yes** |
| B FK | Yes, if clean | No | Yes (0095) | No |
| C extra lock | Maybe | Risk of mixing authorities | Maybe | No |
| D boundaries only | No | No | No | No |
