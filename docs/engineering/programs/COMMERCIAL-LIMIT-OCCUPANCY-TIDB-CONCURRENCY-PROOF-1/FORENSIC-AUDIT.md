# FORENSIC AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Date:** 2026-08-16  
**Method:** source inspection of the committed/local occupancy implementation. No Production connection. No TiDB drill.

## Helper

File: `server/subscription-runtime/commercialLimitOccupancy.ts`

`withCommercialLimitOccupancy()`:

1. If `NODE_ENV === "test"` **and** `db` is not injected → `runUnlocked` (COUNT / decide / create with `tx = null`). **Not** the production serialization path.
2. Else resolve `db` (`input.db` or `getDb()`). If null → `CommercialOccupancyUnavailableError`.
3. Else `runLocked` inside `db.transaction`, retrying errno **1213** / **1205** up to `MAX_LOCK_RETRIES = 3`.
4. `CommercialLimitExceededError` is **not** retried.

## Locked path (production)

One Drizzle transaction, one connection from the mysql2 pool:

1. `INSERT INTO commercial_limit_occupancy_locks … ON DUPLICATE KEY UPDATE limitKey = limitKey`
2. `SELECT scopeKind FROM commercial_limit_occupancy_locks WHERE scopeKind/scopeId/limitKey FOR UPDATE`
3. Optional `resolveExisting(tx)` — if a value is returned, skip COUNT / decide / create
4. `countOccupancy(tx)`
5. `proposedTotal = occupancy + occupancyDelta` (`occupancyDelta` default 1; 0 for slot-neutral replace)
6. `decide(proposedTotal)` → `checkLimit()` at call sites
7. If not allowed → `CommercialLimitExceededError`
8. `create(tx)`
9. COMMIT on success; ROLLBACK if `create` or later statements throw

Verified: lock, COUNT, decide, and domain create share **the same** `tx`.

## Adoption (same helper; not assumed)

| Resource | Call site | scopeKind | limitKey | occupancyDelta | COUNT |
|----------|-----------|-----------|----------|----------------|--------|
| Restaurants | `createRestaurantWithCommercialLimit` | `owner` / owner user id | `restaurants` | 1 | `restaurants` where `userId` |
| Categories | `createCategoryWithCommercialLimit` | `restaurant` / restaurant id | `categories` | 1 | `categories` where `restaurantId` |
| Items | `createMenuItemWithCommercialLimit` | `restaurant` / restaurant id | `items` | 1 | `menuItems` where `restaurantId` |
| POS provision | `PosTerminalService.consumeProvisionedSlot` via `register` / reactivate | `restaurant` / restaurant id | `posTerminals` | 1 (default) | provisioned-lifecycle terminals |
| POS provisioned replace | `replace` → `consumeProvisionedSlot(..., occupancyDelta)` | same | `posTerminals` | **0** when previous is provisioned | same COUNT; proposedTotal does not +1 |

Onboarding first restaurant is **not** wrapped in this helper (G-04: cap assert before register tx). Cascade delete does **not** take the occupancy lock (G-05).

## 0094 schema (local / Production apply evidence)

Local file `drizzle/0094_commercial_limit_occupancy_locks.sql`:

- PRIMARY KEY `(scopeKind, scopeId, limitKey)` named `commercial_limit_occupancy_locks_pk`
- Columns: `scopeKind` varchar(16), `scopeId` int, `limitKey` varchar(128), `createdAt` timestamp
- CREATE TABLE only. Not a counter. Not `commercial_limit_values`. Not a POS lock table.

Drizzle table `commercialLimitOccupancyLocks` matches.

Production apply program recorded the table present with the same PK after 0094. This program did **not** re-query Production.

## What this audit does not prove

TiDB pessimistic vs optimistic `FOR UPDATE`, lock-wait timeout errno mapping, distributed transaction overlap, or occupancy ≤ cap under concurrent TiDB connections.
