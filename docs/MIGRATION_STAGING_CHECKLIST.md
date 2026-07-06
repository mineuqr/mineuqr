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
2. TiDB backup
3. `node scripts/recovery/migration-0054-0057-execute.mjs --execute --confirm-gateway01` (or `db:migrate`)
4. `pnpm db:verify-schema`
5. Deploy application (Vercel runs governance guard automatically)
