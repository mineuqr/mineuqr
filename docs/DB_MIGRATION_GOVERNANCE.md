# DB migration governance — MineuQR

Official workflow for **deployment-safe** schema changes after DB-MIGRATION-STABILIZATION.

**Source of truth:** `drizzle/meta/_journal.json` — only tagged migrations run via `drizzle-kit migrate`.

---

## 1. Current lineage (honest assessment)

| Fact | Status |
|------|--------|
| Journal defines order `0000` → `0018` | **Canonical** (post-stabilization) |
| Duplicate `0000`–`0008` SQL files on disk | **Orphan** — not in journal; never run |
| `schema.ts` | **Authoritative** for application code |
| `pnpm db:push` | Runs `generate` + `migrate` — use deliberately |

### Journal sequence (canonical)

`0000_shiny_blizzard` … `0016_empty_captain_universe` → `0017_auth_tokens` → `0018_session_valid_after`

### Orphan SQL files (on disk, NOT in journal)

Do **not** execute manually. Historical duplicates from parallel branches:

- `0000_exotic_hellfire_club`, `0001_lumpy_naoko`, `0002_watery_ironclad`, `0003_square_krista_starr`
- `0004_long_nekra`, `0005_living_molecule_man`, `0006_confused_bloodaxe`, `0007_loose_mandrill`, `0008_glamorous_phantom_reporter`

Preflight lists these: `node scripts/migration-preflight.cjs`

---

## 2. Deployment scenarios

### A) Fresh staging database (preferred bootstrap)

```bash
# 1. Empty database + DATABASE_URL set
node scripts/migration-preflight.cjs
pnpm exec drizzle-kit migrate
node scripts/verify-schema-deployment.cjs
```

Expected: all journal migrations apply once; verify script exits 0.

### B) Existing database (dev/TiDB already live)

**Do not assume `migrate` is idempotent** if patches were applied manually.

```bash
node scripts/migration-preflight.cjs
node scripts/verify-schema-deployment.cjs
```

If verify fails but app works, apply idempotent patches (last resort):

```bash
node scripts/apply-auth2b-local-schema.cjs
node scripts/apply-session-valid-after-local-patch.cjs
node scripts/verify-schema-deployment.cjs
```

Then align `__drizzle_migrations` with ops (see §5) before relying on migrate in CI.

### C) Schema change going forward

1. Edit `drizzle/schema.ts` only (no hand-edited SQL unless emergency).
2. `pnpm exec drizzle-kit generate` — produces `0019_*` + journal entry + snapshot.
3. Review generated SQL on a **copy** of staging data.
4. `pnpm exec drizzle-kit migrate` on staging.
5. `node scripts/verify-schema-deployment.cjs`
6. Deploy app.

**Never** run orphan SQL files. **Never** delete old journal entries.

---

## 3. Anti-patterns (stop now)

| Anti-pattern | Why |
|--------------|-----|
| `db:push` in CI without review | May generate unexpected migrations |
| Running random `0004_*.sql` duplicates | Table-already-exists failures |
| Hand-patching production without journal | Drift vs fresh environments |
| Assuming local DB = staging | Patches hide missing journal steps |
| `drizzle-kit push` instead of migrate on shared DB | Bypasses migration history |

---

## 4. What can remain imperfect

| Item | Acceptable until |
|------|------------------|
| Orphan SQL files on disk | INFRA cleanup phase (do not delete pre-staging without backup) |
| Missing snapshots for hand-registered 0017/0018 | Next `drizzle-kit generate` may reconcile |
| `db:push` npm script name | Rename later; document only |
| No automated CI migrate | Staging manual gate first |

---

## 5. Emergency / recovery mindset

1. **Stop** — do not re-run migrate blindly on partial failure.
2. **Inspect** — `__drizzle_migrations`, error SQL, `information_schema`.
3. **Verify** — `node scripts/verify-schema-deployment.cjs`
4. **Patch idempotently** — only via `scripts/*` patches if migrate cannot proceed.
5. **Record** — what was applied manually; plan journal reconciliation with DBA care.

Rollback: MineuQR does not use down migrations. Rollback = restore DB snapshot or forward-fix migration.

---

## 6. Auth-critical schema checklist

Required for AUTH2 (verify script enforces):

| Object | Introduced |
|--------|------------|
| `users.emailVerifiedAt` | `0017_auth_tokens` |
| `users.passwordChangedAt` | `0017_auth_tokens` |
| `users.sessionValidAfter` | `0018_session_valid_after` |
| `auth_tokens` table | `0017_auth_tokens` |

---

## 7. Related scripts

| Script | Purpose |
|--------|---------|
| `scripts/migration-preflight.cjs` | Journal vs disk vs DB (read-only) |
| `scripts/verify-schema-deployment.cjs` | Required tables/columns present |
| `scripts/apply-auth2b-local-schema.cjs` | Idempotent AUTH2-B patch (existing DB) |
| `scripts/apply-session-valid-after-local-patch.cjs` | Idempotent sessionValidAfter patch |

---

## 8. Staging gate (required once)

- [ ] `migration-preflight` — no journal/file mismatches
- [ ] `drizzle-kit migrate` on staging DB (or verified already at 0018)
- [ ] `verify-schema-deployment` — exit 0
- [ ] Smoke auth login + logout (sessionValidAfter path)

---

## 9. Do-not-touch zones

- Orphan migration SQL files (leave in repo, ignore)
- `__drizzle_migrations` rows on production without ops plan
- Rewriting `0000`–`0016` history
- `schema.ts` changes without generate + migrate discipline

---

## 10. Stability verdict

Migration governance is **deployment-ready** when:

1. Journal includes **0017** and **0018** (done in stabilization).
2. Staging runs **migrate + verify** once successfully.
3. Team follows **generate → review → migrate → verify** for new changes.

See [MIGRATION_STAGING_CHECKLIST.md](./MIGRATION_STAGING_CHECKLIST.md) for a one-page deploy runbook.
