# PRODUCTION ALIGNMENT

Read-only. No migrate. No Production mutation in this program.

## Three layers (must not be conflated)

| Layer | State |
|-------|--------|
| **LOCAL IMPLEMENTATION** | Occupancy helper + adopters + tests + journal 0094 in working tree |
| **PRODUCTION SCHEMA** | 0094 applied 2026-08-16. Table `commercial_limit_occupancy_locks` exists, **0 rows**. Journal terminus 0094 hash `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` id **6204102** |
| **DEPLOYED APPLICATION** | Occupancy-adopting code **not deployed**. Runtime still check-then-act. Lock table unused |

Do **not** claim Production runtime consumes occupancy locking.

## Schema vs local SQL

Production columns match `drizzle/0094_commercial_limit_occupancy_locks.sql` and Drizzle `commercialLimitOccupancyLocks`. PK columns `(scopeKind, scopeId, limitKey)`.

## Git

Occupancy implementation + this audit are **uncommitted**. HEAD at last read: `b3e92aa…` on `main` (does not include occupancy). Production schema is **ahead** of deployed app and of committed git.

## Governance lib

Still declares terminus 0093. Will fail `migration-governance-guard` once 0094 is the committed journal tail unless the constant is updated in the GIT COMMIT program.

## 780001

Untouched by 0094. Not re-queried in this audit (read-only apply evidence stands).
