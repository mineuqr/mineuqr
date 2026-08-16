# MIGRATION 0094 VERIFICATION

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Mode:** read-only journal tail. `pnpm db:migrate` was **not** run.

## Certified expectation

Previous Production tail:

`0093_pos_sale_idempotency`

followed by:

`0094_commercial_limit_occupancy_locks`

Certified 0094 hash:

`134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47`

## Actual Production journal

| Field | Value |
|-------|--------|
| JOURNAL ID | **6204102** |
| MIGRATION TAG | `0094_commercial_limit_occupancy_locks` |
| HASH | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |
| COUNT | **1** |
| PREVIOUS TAG | `0093_pos_sale_idempotency` |
| PREVIOUS JOURNAL ID | 6174104 |
| PREVIOUS HASH | `778caa62a7bb57ad8dd461abab7f34b82633e0608cb289b22c35d8998859236b` |
| PREVIOUS COUNT | 1 |
| Hash matches certified | **YES** |
| Duplicate hashes | none |
| Journal tail is 0094 | **YES** (latest id 6204102) |

## Local SQL hash

`hashMigrationSql("0094_commercial_limit_occupancy_locks")` equals the Production journal hash and the certified hash. Local `drizzle/meta/_journal.json` also contains tag `0094_commercial_limit_occupancy_locks` exactly once.

## Result

PASS — 0094 exists exactly once. Hash matches. Predecessor is 0093. No automatic apply. No new migration.
