# Staging migration checklist (one page)

Run before first staging deploy and after any schema change.

## Preflight

```bash
node scripts/migration-preflight.cjs
```

- No `Journal tags missing SQL files`
- Understand any `SQL files NOT in journal` (ignore orphans)

## Apply migrations (fresh or pending DB)

```bash
pnpm exec drizzle-kit migrate
```

If this fails with "table already exists" on an **existing** DB, stop — use [DB_MIGRATION_GOVERNANCE.md](./DB_MIGRATION_GOVERNANCE.md) scenario B.

## Verify schema

```bash
node scripts/verify-schema-deployment.cjs
```

Must exit **0**.

## App smoke (auth-critical)

- [ ] Login (local email/password)
- [ ] `auth.me` / dashboard load
- [ ] Logout
- [ ] Forgot-password email link host correct (`PUBLIC_APP_URL` if needed)

## Env

- [ ] `DATABASE_URL` points to staging database only
- [ ] `JWT_SECRET`, `VITE_APP_ID` set
- [ ] Not pointing at production by mistake
