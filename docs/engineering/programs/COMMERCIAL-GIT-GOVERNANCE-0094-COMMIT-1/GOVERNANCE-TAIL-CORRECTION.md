# GOVERNANCE TAIL CORRECTION

**Program:** COMMERCIAL-GIT-GOVERNANCE-0094-COMMIT-1

## Before

| Constant | Value |
|----------|--------|
| `CANONICAL_MIGRATION_TAIL_TAG` | `0093_pos_sale_idempotency` |
| `CANONICAL_JOURNAL_ENTRY_COUNT` | 94 |

Production journal and local `drizzle/meta/_journal.json` already ended at 0094.

## After

| Constant | Value |
|----------|--------|
| `CANONICAL_MIGRATION_TAIL_TAG` | `0094_commercial_limit_occupancy_locks` |
| `CANONICAL_JOURNAL_ENTRY_COUNT` | 95 |

Count is the coupled journal-length pin (idx 0–94). It is not a second independent policy. Historical 0093 SQL, journal row, predecessor docs, and POS guards that *contain* 0093 were not globally rewritten.

## 0094 integrity

`hashMigrationSql("0094_commercial_limit_occupancy_locks")` =

`134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47`

File not regenerated. No 0095. Guard: OK. `migrationGovernance.test.ts`: 17/17 PASS.
