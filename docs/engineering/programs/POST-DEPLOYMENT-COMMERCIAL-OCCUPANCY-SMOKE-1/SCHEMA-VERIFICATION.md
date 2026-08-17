# SCHEMA VERIFICATION

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** READ ONLY. No migrate.

## Lock table

`commercial_limit_occupancy_locks` exists.

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| scopeKind | varchar | NO | PRI |
| scopeId | int | NO | PRI |
| limitKey | varchar | NO | PRI |
| createdAt | timestamp | NO | |

PRIMARY: `(scopeKind, scopeId, limitKey)`

Occupancy-like tables: **only** `commercial_limit_occupancy_locks`.  
Lock rows: **0** (no occupancy mutation since deploy).

## Migration 0094

| Field | Value |
|-------|--------|
| Local SQL hash | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |
| Production journal hash | same |
| Count of this hash | **1** |
| Journal id | 6204102 |
| Journal tail | this row |
| Duplicate hashes | none |
| `pnpm db:migrate` | **not run** |
| 0095 | **not created** |

Production `__drizzle_migrations` row count remains historically larger than the canonical governance journal (99). Tail is still certified 0094. Unchanged from Production Certification. Not a smoke regression.

## Result

**0094 COMPATIBLE**
