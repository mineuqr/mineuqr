# SCHEMA VERIFICATION

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Mode:** read-only `INFORMATION_SCHEMA` + table existence.

## Table

`commercial_limit_occupancy_locks` **exists**.

Lock row count at certification: **0** (mutex table; empty is expected before occupancy app deploy).

## Columns

| Column | Production | Drizzle / 0094 |
|--------|------------|----------------|
| `scopeKind` | `varchar(16)` NOT NULL PRI | `varchar({ length: 16 }).notNull()` |
| `scopeId` | `int` NOT NULL PRI | `int().notNull()` |
| `limitKey` | `varchar(128)` NOT NULL PRI | `varchar({ length: 128 }).notNull()` |
| `createdAt` | `timestamp` NOT NULL DEFAULT CURRENT_TIMESTAMP | `timestamp({ mode: "string" }).defaultNow().notNull()` |

No extra columns. No missing columns.

## PRIMARY KEY

Production: `PRIMARY (scopeKind,scopeId,limitKey)`

0094 / Drizzle: `CONSTRAINT commercial_limit_occupancy_locks_pk PRIMARY KEY(scopeKind, scopeId, limitKey)`

**Match.**

## Conflicting tables

Occupancy-like table search (`%occupancy%` / `%commercial_limit_occupancy%`):

- `commercial_limit_occupancy_locks` only

No duplicate lock table. No shadow occupancy counter table.

## Application agreement

`server/db/schema/commercial/tables.ts` → `commercialLimitOccupancyLocks`  
`drizzle/0094_commercial_limit_occupancy_locks.sql`  
`server/subscription-runtime/commercialLimitOccupancy.ts` (`INSERT IGNORE` / `SELECT … FOR UPDATE` on the same four columns)

## Result

PASS — Production schema matches the certified application expectation.
