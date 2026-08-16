# MIGRATION 0094 RESULT

| Field | Value |
|-------|--------|
| File | `drizzle/0094_commercial_limit_occupancy_locks.sql` |
| Hash | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |
| Journal id | 6204102 |
| Table | `commercial_limit_occupancy_locks` |
| Exists | **yes** |
| Rows | **0** |

## Schema (matches local SQL)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `scopeKind` | varchar(16) | NO | PRI |
| `scopeId` | int | NO | PRI |
| `limitKey` | varchar(128) | NO | PRI |
| `createdAt` | timestamp DEFAULT CURRENT_TIMESTAMP | NO | |

Indexes:

- PRIMARY (`scopeKind`, `scopeId`, `limitKey`)

TiDB reports the composite PK as `PRIMARY` (same pattern as 0091–0093). SQL constraint name `commercial_limit_occupancy_locks_pk` is not a separate index.

Not an occupancy counter. No `occupied` column. No POS tables. No `commercial_limit_values` change. No Live Plan change.
