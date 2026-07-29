# EXECUTION-LOG — 0085 Commercial Subscription Bindings

| Step | Action | Result |
|------|--------|--------|
| 1 | `pnpm db:governance-check` | **OK** — terminus tag `0085_commercial_catalog_adoption_bindings` / 86 journal entries |
| 2 | `pnpm db:preflight` | Pending **0085 only** |
| 3 | `_preflight-probe.mjs pre` | Conn OK; table absent; DB terminus **0084**; hash not applied |
| 4 | `pnpm exec drizzle-kit migrate` | **SUCCESS** (~6.05s) |
| 5 | `_preflight-probe.mjs post` | Table present; PK + unique + 2 indexes; hash id `5994103`; counts unchanged |
| 6 | `pnpm db:preflight` | Zero pending; all journal hashes in DB |
| 7 | `pnpm db:governance-check` | **OK** |
| 8 | `pnpm db:verify-schema` | **OK** (exit 0) |
| 9 | `_orm-smoke.mjs` | **APP_CATALOG_SMOKE=OK** · **BINDING_LOOKUP_SMOKE=OK** · **RUNTIME_AUTHORITY_SMOKE=OK** · `mixedResolutionCount=0` |
| 10 | `_binding-select-smoke.mjs` | **BINDING_TABLE_SELECT=OK** · rowCount `0` (empty additive table) |

## Migrate success excerpt

```
MIGRATE_START=2026-07-29T17:29:39.9945138+03:00
[✓] migrations applied successfully!
MIGRATE_END=2026-07-29T17:29:46.0445510+03:00
EXIT=0 DURATION_MS=6050
```

## Applied migration hash

`c104e894606f292173e9f133f575980441d77bc9a650d1251760e988c102c81a`  
`__drizzle_migrations.id` = `5994103`  
`created_at` = `1784710000000`
