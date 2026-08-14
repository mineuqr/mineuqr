# MIGRATION-EXECUTION.md

Mechanism: `pnpm exec drizzle-kit migrate` (repository governance path).  
Not manual SQL. Not `db:push`. Not seed. Not catalog bootstrap.

Result: `migrations applied successfully!`

Only pending journal migration was `0087_platform_owner_access_mode`.

## After apply

| Field | Value |
|-------|-------|
| Tag | `0087_platform_owner_access_mode` |
| `__drizzle_migrations.id` | 6054102 |
| hash | `d1d9b161c405cc8e448fbf74d3e40b99618d88d388f65479a43e8115fb4cc595` |
| `created_at` | 1784730000000 (journal `when` for 0087) |
| Prior 0086 row | retained (`6024102` / `cfaec30e54892eaf…`) |

`pnpm db:preflight` after apply: **All journal migration hashes recorded in DB.**  
DB rows: 92 (88 journal + 4 historical extras).

Idempotency: re-running migrate is expected to report already applied. **Not re-run.**
