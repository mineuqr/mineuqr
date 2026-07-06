# DB migration governance — MineuQR

Official workflow for **deployment-safe** schema changes.

**Source of truth:** `drizzle/meta/_journal.json` — only tagged migrations run via `drizzle-kit migrate`.

**Current canonical lineage:** `0000_shiny_blizzard` → `0057_operational_device_screen_config_revision` (58 journal entries).

---

## 1. Current lineage

| Fact | Status |
|------|--------|
| Journal defines order `0000` → `0057` | **Canonical** (post MIGRATION-GOVERNANCE-RESTORATION-1) |
| Tail migrations `0054`–`0057` | **Journalized** — operational devices, screen config, category projection, config revision |
| Duplicate `0000`–`0008` SQL files on disk | **Legacy orphan** — not in journal; never execute |
| `schema.ts` | **Authoritative** for application code |
| `pnpm db:push` | Runs `generate` + `migrate` — use deliberately |

### Legacy orphan SQL (on disk, NOT in journal)

Historical parallel-branch duplicates. **Do not execute:**

- `0000_exotic_hellfire_club` … `0008_glamorous_phantom_reporter`

### Production historical bootstrap rows

Four `__drizzle_migrations` rows from orphan bootstrap lineage may coexist with canonical hashes. **Do not delete** (see `migration-recovery-final-report.md`).

---

## 2. Canonical deployment workflow

```
schema.ts change
    → drizzle-kit generate (journal + SQL + snapshot)
    → code review
    → migration-preflight (strict)
    → drizzle-kit migrate (staging)
    → verify-schema-deployment
    → application deploy
```

### Required commands

```bash
node scripts/migration-governance-guard.cjs   # CI + Vercel build gate
node scripts/migration-preflight.cjs          # journal vs disk vs DB
pnpm exec drizzle-kit migrate                 # apply pending migrations
node scripts/verify-schema-deployment.cjs     # schema gate
```

### npm scripts

| Script | Purpose |
|--------|---------|
| `pnpm db:governance-check` | Fail on journal/SQL violations |
| `pnpm db:preflight` | Read-only lineage + pending detection |
| `pnpm db:migrate` | Apply pending journal migrations |
| `pnpm db:verify-schema` | Required objects present |
| `pnpm db:recovery:preflight` | Production 0054–0057 readiness |

---

## 3. Deployment scenarios

### A) Fresh database

```bash
pnpm db:governance-check
pnpm db:migrate
pnpm db:verify-schema
```

### B) Existing production (gateway01)

**Never blind-migrate evolved production without preflight.**

```bash
pnpm db:recovery:preflight
# TiDB backup (mandatory)
node scripts/recovery/migration-0054-0057-execute.mjs --execute --confirm-gateway01
```

Or after journal restoration: `pnpm db:migrate` with same verification.

### C) New schema change

1. Edit `drizzle/schema.ts`
2. `pnpm db:generate` — produces journal entry + SQL
3. Review SQL on staging copy
4. `pnpm db:migrate` on staging
5. `pnpm db:verify-schema`
6. Deploy app (Vercel runs governance guard in build)

---

## 4. Enforcement

| Gate | When | Failure action |
|------|------|----------------|
| `migration-governance-guard.cjs` | CI PR, Vercel build | Block deploy |
| `migration-preflight.cjs --strict` | Pre-migrate ops | Exit 1 |
| `verify-schema-deployment.cjs` | Pre/post migrate | Exit 1 |

---

## 5. Anti-patterns

| Anti-pattern | Why |
|--------------|-----|
| Hand-written `.sql` without journal entry | Invisible to `drizzle-kit migrate` |
| App deploy before schema verify | HTTP 500 / runtime failures |
| Running legacy orphan SQL | Table-exists / lineage corruption |
| Deleting orphan bootstrap `__drizzle_migrations` rows | Breaks audit trail |
| `db:push` on shared DB without review | Bypasses governance |

---

## 6. Emergency recovery

1. **Stop** — do not re-run migrate blindly
2. **Preflight** — `pnpm db:recovery:preflight`
3. **Backup** — TiDB snapshot
4. **Execute** — `migration-0054-0057-execute.mjs` or `db:migrate`
5. **Verify** — `db:verify-schema`
6. **Smoke** — Screen Management, pairing, kitchen read

Rollback: forward-fix only (no down migrations). App rollback without schema rollback acceptable for additive DDL.

---

## 7. Related scripts

| Script | Purpose |
|--------|---------|
| `scripts/migration-governance-guard.cjs` | Strict repository gate |
| `scripts/migration-preflight.cjs` | Journal vs disk vs DB |
| `scripts/verify-schema-deployment.cjs` | Schema object verification |
| `scripts/recovery/migration-0054-0057-preflight.mjs` | Production recovery readiness |
| `scripts/recovery/migration-0054-0057-execute.mjs` | Controlled migrate + verify |

---

## 8. Staging gate checklist

See [MIGRATION_STAGING_CHECKLIST.md](./MIGRATION_STAGING_CHECKLIST.md).

---

## 9. Stability verdict

Migration governance is **deployment-ready** when:

1. Journal includes **0000**–**0057** (done — MIGRATION-GOVERNANCE-RESTORATION-1)
2. `db:governance-check` passes in CI
3. Staging/production run **migrate + verify** before app promote
4. Team follows **generate → review → migrate → verify → deploy**
