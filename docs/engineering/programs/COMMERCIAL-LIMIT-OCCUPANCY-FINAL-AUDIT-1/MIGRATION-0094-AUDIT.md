# MIGRATION 0094 AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

## File

`drizzle/0094_commercial_limit_occupancy_locks.sql`

PRIMARY KEY (`scopeKind`, `scopeId`, `limitKey`). No occupancy counter columns.

## Journal

Local `_journal.json` includes idx 94 tag `0094_commercial_limit_occupancy_locks` **once**.

## Production (read-only, prior apply evidence)

COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-APPLY-1: 0094 applied 2026-08-16, hash `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47`, journal id 6204102. Table exists. This audit **did not** connect to Production or re-apply.

## stagIn

G-07 identity: lock table exists; `applied0094: false` this run (already present). PK `scopeKind,scopeId,limitKey`.

## Governance tail

`CANONICAL_MIGRATION_TAIL_TAG` is still `0093_pos_sale_idempotency` while the journal ends at 0094. Known G-03 git-commit work. **Not** an occupancy schema defect. SAFE TO DEFER until the authorized GIT COMMIT program.

## This audit

No new migration. 0094 not altered.
