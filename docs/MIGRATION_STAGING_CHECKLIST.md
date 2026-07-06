# Staging migration checklist (one page)

Run before staging deploy and after any schema change.

## Governance gate (required)

```bash
pnpm db:governance-check
```

Must exit **0**. Blocks on non-legacy orphan SQL or journal violations.

## Preflight

```bash
pnpm db:preflight
```

- No non-legacy `SQL files NOT in journal`
- Review pending migrations list if DATABASE_URL is set

## Apply migrations

```bash
pnpm exec drizzle-kit migrate
```

If this fails with "table already exists" on an **existing** DB, stop — use [DB_MIGRATION_GOVERNANCE.md](./DB_MIGRATION_GOVERNANCE.md) scenario B.

## Verify schema

```bash
pnpm db:verify-schema
```

Must exit **0**. Includes auth, order-read, and operational-device objects.

## App smoke

- [ ] Login (local email/password)
- [ ] Dashboard load
- [ ] Screen Management list (operational devices)
- [ ] Operational screen pairing (if applicable)

## Env

- [ ] `DATABASE_URL` points to staging database only
- [ ] Not pointing at production by mistake
- [ ] Production recovery uses `db:recovery:preflight` + TiDB backup

## Production promotion (after staging)

1. `pnpm db:recovery:preflight` on gateway01
2. TiDB backup — set `TIDB_BACKUP_CONFIRMED=YES` or pass `--confirm-backup`
3. `pnpm db:recovery:execute -- --execute --confirm-gateway01 --confirm-backup` (phased: 0054→0055→0057→0056)
4. If stopped after phase-4: run ORDER-READ-BACKFILL-1, then `--resume-from verify`
5. `pnpm db:verify-schema`
6. Deploy application (Vercel runs governance guard automatically)
