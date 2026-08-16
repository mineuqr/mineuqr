# STORE IMPLEMENTATION

Existing interfaces are preserved. Three Drizzle stores implement them against the already-applied tables.

| Contract | Production | Test |
|----------|------------|------|
| `PosTerminalStore` | `DrizzlePosTerminalStore` â†’ `pos_terminals` | `InMemoryPosTerminalStore` |
| `PosPermissionGrantStore` | `DrizzlePosPermissionGrantStore` â†’ `pos_permission_grants` | `InMemoryPosPermissionGrantStore` |
| `PosSaleIdempotencyStore` | `DrizzlePosSaleIdempotencyStore` â†’ `pos_sale_idempotency` | `InMemoryPosSaleIdempotencyStore` |

Selection is centralized in `server/pos/infrastructure/posStoreSelection.ts`. Services still receive interfaces.

## Patterns reused

- `getDb()` from `server/db.ts`
- Drizzle `eq` / `and` / `asc` like `DrizzleOperationalDeviceStore`
- Duplicate-key detection: `errno === 1062` / `ER_DUP_ENTRY` (same as commercial / Check persistence)
- Fail closed on `database_unavailable` â€” no silent InMemory fallback in production
- Timestamps: domain ISO â†” MySQL TIMESTAMP strings

## Not introduced

- GenericRepository / BaseRepository / UniversalPersistenceService
- Second ORM, pool, or client
- POS Order / Check / Settlement / Register / Shift / Cash tables
- Second idempotency table

## Smallest extra types

- `LoadPosDb` â€” optional constructor injection so Drizzle stores can be unit-tested without a live MySQL
- `PosTerminalCodeConflictError` / `PosSaleIdempotencyConflictError` â€” named unique-constraint outcomes

## Long-term SaaS notes

1. Correct today because uniqueness lives in MySQL indexes already certified at 0091â€“0093.
2. Scales across restaurants via `restaurantId` in every query and unique key.
3. Scales across terminals via `terminalId` in sale uniqueness and terminal PK.
4. Concurrent cashiers: DB unique + in-process `runExclusive` for same-process retries.
5. Future branches: restaurant-scoped now; branch is not a POS persistence key (deferred).
6. Hardware: `optionalDeviceId` already on `pos_terminals`; not canonical identity.
7. Payments: not persisted here; Order / Settlement remain authorities.
8. Compliance: rows are durable facts; no client-authoritative totals.
9. Debt: Check/Settlement POS idempotency still in-memory (no table; prior decision).
10. Avoided: wrapping Order in a POS transaction manager.
11. Deferred: SQL tables for Check/Settlement POS idempotency; POS UI; freeze gate.
