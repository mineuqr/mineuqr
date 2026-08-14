# PRE_MIGRATION_GATE.md

Queried: 2026-08-14T23:28:50Z  
Database: `mineuqr` (TiDB Cloud)  
Method: `pnpm db:preflight` + SELECT-only `_snapshot.mjs pre`

| # | Check | Result |
|---|-------|--------|
| 1 | Production connectivity | PASS |
| 2 | Current terminus | **0086** (`__drizzle_migrations.id` 6024102, hash `cfaec30e54892eaf…`, `created_at` 1784720000000) |
| 3 | 0087 present locally | PASS (`drizzle/0087_platform_owner_access_mode.sql`) |
| 4 | 0087 not already applied | PASS (pending in preflight) |
| 5 | Hash matches journal SQL | PASS `d1d9b161c405cc8e…` |
| 6 | SQL scope owner-access only | PASS |
| 7 | No unrelated SQL | PASS |

`platform_owner_access_mode` did **not** exist before apply.

**Gate: PASS — authorized to apply 0087 only.**
