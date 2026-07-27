# PRODUCTION-MIGRATION-EXECUTION-0083 — Execution Log

| Step | Action | Result |
|------|--------|--------|
| 1 | `pnpm db:governance-check` | **OK** — terminus 0083 / 84 |
| 2 | `pnpm db:preflight` | Pending **0083 only** |
| 3 | `_preflight-probe.mjs pre` | Conn OK; columns absent; terminus 0082 |
| 4 | `pnpm db:migrate` (attempt 1) | **FAIL** errno 8130 multi-statement (~5.6s) |
| 5 | Schema after fail | Columns still absent; hash not registered |
| 6 | Add `--> statement-breakpoint` | Packaging-only hotfix |
| 7 | Re-hash / governance / preflight | OK; still pending 0083 only |
| 8 | `pnpm db:migrate` (attempt 2) | **SUCCESS** (~5.5s) |
| 9 | `_preflight-probe.mjs post` | Columns present; hash id `5964102` |
| 10 | `_orm-smoke.mjs` | **APP_DB_SMOKE=OK** |
| 11 | `pnpm db:preflight` | Zero pending; all journal hashes in DB |
| 12 | `pnpm db:governance-check` | **OK** |
| 13 | `pnpm db:verify-schema` | **OK** |

## Attempt 1 error (excerpt)

```
client has multi-statement capability disabled.
Run SET GLOBAL tidb_multi_statement_mode='ON' after you understand the security risk
errno: 8130
```

(Global multi-statement **not** enabled — packaging fixed instead.)

## Attempt 2 success (excerpt)

```
[✓] migrations applied successfully!
EXIT=0 DURATION_MS=5521
```

## Executed migration (final SQL)

Two `ALTER TABLE … ADD COLUMN ordering_channel varchar(32) NULL AFTER identityScope` statements, separated by `--> statement-breakpoint`.
