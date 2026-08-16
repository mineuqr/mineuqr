# TERMINAL PERSISTENCE

Table: `pos_terminals` (0091). Domain: POS Terminal. Not Device, not Register.

## Operations

| Method | Behavior |
|--------|----------|
| `insert` | Writes the domain terminal. Unique `(restaurantId, code)` â†’ `PosTerminalCodeConflictError` |
| `getById` | PK lookup |
| `getByRestaurantAndCode` | Tenant + code lookup |
| `listByRestaurant` | Restaurant-scoped, ordered by code |
| `updateLifecycle` | Lifecycle + optional `replacedByTerminalId`; increments `version` unless supplied |

## Invariants

- Unique restaurant + terminal code is a database constraint
- Replacement is a lifecycle + `replacedByTerminalId` on the previous row
- `optionalDeviceId` is optional association, never canonical identity
- `PosTerminalService.requireOwned` rejects foreign restaurant ids after `getById`
- Concurrent same-code register: service re-reads the winner on unique conflict

## Isolation

Reads and writes used by production composition always include restaurant scope at the service boundary. The store `getById` is id-based (existing contract); the service compares `terminal.restaurantId`.

InMemory remains a test double and may hold duplicate codes when tests seed lifecycle variants by id. Production uniqueness is the MySQL unique index.
