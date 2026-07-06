# MIGRATION-GOVERNANCE-RESTORATION-1 — Migration Governance Restoration

**Classification:** Operational Governance  
**Priority:** Critical  
**Status:** COMPLETE — awaiting certification (no production migration executed)

## Root Cause

Forensic investigations (POST-DEPLOYMENT-MIGRATION-FORENSICS-1, MIGRATION-GOVERNANCE-FORENSICS-2) established:

| Issue | Cause |
|-------|-------|
| Production HTTP 500 on `screenConfigRevision` | App deployed; migrations `0054`–`0057` never applied |
| `drizzle-kit migrate` could not apply `0054`–`0057` | SQL files existed **outside** `_journal.json` |
| Hand-publish anti-pattern recurred | DEVICE-MANAGEMENT-1 / ORDER-READ-CATEGORY-PROJECTION-1 / BUGFIX-1B committed SQL without journal registration |
| Deploy pipeline unprotected | No CI/build gate; `verify-schema` omitted operational-device objects |
| Stale governance docs | `DB_MIGRATION_GOVERNANCE.md` referenced journal ending at `0018` |

The **58 vs 54** `__drizzle_migrations` delta is **not drift** — it is four retained orphan-bootstrap rows plus 54 canonical journal hashes (verified in forensics-2).

## Governance Restoration Strategy

Restore a **single authoritative lifecycle**:

```
schema.ts → generate → journal → preflight → migrate → verify-schema → deploy
```

**Phase A** — Journalize `0054`–`0057` as canonical entries idx 54–57 (no duplicate hashes, no history rewrite).  
**Phase B** — Repository consistency via shared governance library + guard scripts.  
**Phase C** — Production recovery package (preflight + controlled execute); **not executed in this program**.  
**Phase D** — CI workflow + Vercel build gate + strict preflight.  
**Phase E** — Updated governance documentation and staging checklist.

## Repository Consistency Report

| Artifact | Before | After |
|----------|--------|-------|
| `_journal.json` | 54 entries (ends `0053`) | **58 entries** (`0000`–`0057`) |
| Orphan SQL (non-legacy) | `0054`–`0057` | **0** (journalized) |
| Legacy orphan SQL | 9 files (`0000`–`0008` duplicates) | Unchanged (documented) |
| `schema.ts` vs journal | Drift | **Aligned** for `0054`–`0057` objects |
| Snapshots | Stale (through `0028`) | Unchanged — hand-published tail pattern retained; migrate uses SQL + journal |
| Governance guard | None | **`migration-governance-guard.cjs`** |
| Schema verify | Auth/order-read only | **+ operational_devices, screenConfigRevision, categoryProjection** |

## Migration Lineage Report

### Canonical journal tail (restored)

| idx | tag | when |
|----:|-----|-----:|
| 54 | `0054_operational_devices` | 1784400000000 |
| 55 | `0055_operational_device_screen_config` | 1784410000000 |
| 56 | `0056_order_read_category_projection` | 1784420000000 |
| 57 | `0057_operational_device_screen_config_revision` | 1784430000000 |

### SQL file hashes (SHA-256)

| Tag | Hash |
|-----|------|
| `0054_operational_devices` | `abd3bfa643baf1f1186ab3553b2845ca922307e04fe7943090ed5b1dcc30655b` |
| `0055_operational_device_screen_config` | `a76d2d4c5bfc369a3511a89453b8e7cb2634f90c67ecd444e476752f4f38a1c9` |
| `0056_order_read_category_projection` | `bdaffb47ed8f75f61f9fa38d18acaa1a1afdbe86937c2a153b1f7ae2c800e9f4` |
| `0057_operational_device_screen_config_revision` | `16ce803eb25639a0d9bd85181647b7fb2b7b8bfae0be8b3caa6b0ec32eb57c72` |

**Recovery package checksum:** `ab73dd34b3586faaafecc049bae6269958ab45ad97d0774f446c6f5e4d3fba90`

### Historical lineage preserved

- Four orphan-bootstrap `__drizzle_migrations` rows **not deleted**
- Legacy duplicate SQL files **not deleted**
- No journal entries rewritten or removed

## Production Recovery Plan

**Not executed — operator action required after certification.**

### Prerequisites

1. TiDB backup on `gateway01` / `mineuqr`
2. Confirm Vercel `DATABASE_URL` targets gateway01
3. `pnpm db:governance-check` passes on deploy branch

### Ordered execution

| Step | Command | Checkpoint |
|------|---------|------------|
| 1 | `pnpm db:recovery:preflight` | Pending migrations identified; no hash/schema drift |
| 2 | TiDB backup | Operator sign-off |
| 3 | `node scripts/recovery/migration-0054-0057-execute.mjs --execute --confirm-gateway01` | Applies `0054`→`0057` via `drizzle-kit migrate` |
| 4 | `pnpm db:verify-schema` | Exit 0 |
| 5 | Application smoke | Screen Management, pairing, kitchen read |
| 6 | App deploy | Vercel build passes governance guard |

### Dependency order

`0054` → `0055` → `0056` (requires `0046` tables) → `0057`

### Rollback documentation

- **Schema:** forward-fix only; do not drop `operational_devices` once provisioned
- **App:** rollback to pre-BUGFIX-1B build acceptable until schema applied
- **0056 risk:** `NOT NULL categoryProjection` on existing `order_read_order_line_items` rows — run ORDER-READ-BACKFILL-1 plan if row count > 0

## Governance Enforcement Summary

| Control | Location | Behavior |
|---------|----------|----------|
| Repository guard | `scripts/migration-governance-guard.cjs` | Exit 1 on non-legacy orphans, ordering violations, missing tail |
| Strict preflight | `scripts/migration-preflight.cjs` | Exit 1 on governance violations; hash-level pending detection |
| Schema gate | `scripts/verify-schema-deployment.cjs` | Operational + order-read + auth objects |
| CI | `.github/workflows/migration-governance.yml` | Guard + regression tests on drizzle/script changes |
| Vercel build | `vercel.json` | Governance guard before `pnpm build` |
| Shared lib | `scripts/lib/migration-governance-lib.cjs` | Journal/hash/legacy orphan helpers |

## Validation Results

| Check | Result |
|-------|--------|
| Repository internally consistent | ✓ Journal 58 entries; no non-legacy orphans |
| Journal synchronized with SQL | ✓ All tags have SQL files |
| Migration ordering valid | ✓ idx 0–57 contiguous; `when` monotonic |
| Governance guard passes | ✓ `node scripts/migration-governance-guard.cjs` |
| Regression tests | ✓ `scripts/__tests__/migrationGovernance.test.ts` (8 tests) |
| Production migration executed | **No** — awaiting certification |
| Historical lineage corruption | **None** — bootstrap rows preserved |

**Commands run (this program):**

```
node scripts/migration-governance-guard.cjs
pnpm exec vitest run scripts/__tests__/migrationGovernance.test.ts
```

## Regression Protection

| Guard | Prevents |
|-------|----------|
| `migration-governance-guard.cjs` | Non-legacy orphan SQL; journal/file mismatch; missing `0054`–`0057` |
| `migration-preflight.cjs --strict` | Deploy with governance violations |
| `verify-schema-deployment.cjs` | App deploy ahead of schema |
| `migrationGovernance.test.ts` | Journal tail regression; Vercel build gate removal |
| CI workflow | Merging journal violations without guard failure |

## Updated Operational Runbook

See:

- [`docs/DB_MIGRATION_GOVERNANCE.md`](../../DB_MIGRATION_GOVERNANCE.md) — canonical workflow, enforcement, emergency recovery
- [`docs/MIGRATION_STAGING_CHECKLIST.md`](../../MIGRATION_STAGING_CHECKLIST.md) — staging + production promotion steps
- `scripts/recovery/migration-0054-0057-preflight.mjs` — production readiness
- `scripts/recovery/migration-0054-0057-execute.mjs` — controlled execution (dry-run default)

### npm scripts added

| Script | Purpose |
|--------|---------|
| `pnpm db:governance-check` | Repository governance gate |
| `pnpm db:recovery:preflight` | Production 0054–0057 readiness |

## Production Acceptance

| Criterion | Status |
|-----------|--------|
| Journal restored for `0054`–`0057` | ✓ |
| Governance enforcement in CI/build | ✓ |
| Recovery package prepared | ✓ |
| Production DDL executed | **Pending certification** |
| Schema verify on production | **Pending post-migrate** |
| Application redeploy | **After migrate + verify** |

**Awaiting certification before executing production migration or deployment.**

## Files Changed

| File | Change |
|------|--------|
| `drizzle/meta/_journal.json` | Added idx 54–57 |
| `scripts/lib/migration-governance-lib.cjs` | **New** shared governance helpers |
| `scripts/migration-governance-guard.cjs` | **New** strict deploy gate |
| `scripts/migration-preflight.cjs` | Strict mode, hash-level pending detection |
| `scripts/verify-schema-deployment.cjs` | Operational-device + categoryProjection checks |
| `scripts/recovery/migration-0054-0057-preflight.mjs` | **New** production preflight |
| `scripts/recovery/migration-0054-0057-execute.mjs` | **New** controlled recovery executor |
| `scripts/__tests__/migrationGovernance.test.ts` | **New** regression guards |
| `.github/workflows/migration-governance.yml` | **New** CI gate |
| `vercel.json` | Build runs governance guard |
| `vitest.config.ts` | Include `scripts/**/*.test.ts` |
| `package.json` | `db:governance-check`, `db:recovery:preflight` |
| `docs/DB_MIGRATION_GOVERNANCE.md` | Full update |
| `docs/MIGRATION_STAGING_CHECKLIST.md` | Governance + production steps |
