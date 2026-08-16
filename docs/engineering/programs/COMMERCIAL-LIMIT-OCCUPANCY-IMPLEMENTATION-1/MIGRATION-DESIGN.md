# MIGRATION DESIGN

## Identity

| Field | Value |
|-------|--------|
| File | `drizzle/0094_commercial_limit_occupancy_locks.sql` |
| Journal tag | `0094_commercial_limit_occupancy_locks` |
| idx | 94 |
| when | `1784800000000` |
| Snapshot | none (lineage after `0028` is SQL + journal only, same as 0091–0093) |

## DDL

Additive `CREATE TABLE commercial_limit_occupancy_locks`. No DML. No Live Plan change. No POS table.

## Governance

Follows `docs/DB_MIGRATION_GOVERNANCE.md`: next canonical journal entry after `0093_pos_sale_idempotency`. Idempotency is the normal migrate journal (do not re-run applied tags).

## Production

**Not applied.** This program must not run `drizzle-kit migrate` against Production.

Future Production Apply program owns:

- preflight  
- migrate 0094  
- verify table exists  
- no data backfill required (rows are created lazily on first occupancy mutation)

## Application model

`commercialLimitOccupancyLocks` in `server/db/schema/commercial/tables.ts`, re-exported from commercial index and `drizzle/schema.ts`.
