# DRIZZLE-MIGRATION-INVESTIGATION-1 — Investigation Report

**Date:** 2026-06-30  
**Scope:** Investigation only — no code, schema, or migration changes  
**Subject:** `npm run db:migrate` appears to exit silently after reading `drizzle.config.ts`

---

## Executive Summary

**Root cause:** Migration `0049_restaurant_printers` is **already applied** to the database configured by `DATABASE_URL`. `drizzle-kit migrate` performed a **no-op** (connected, found nothing pending, committed zero SQL). The observed “silent exit” is compounded by **drizzle-kit 0.31.4 UX**: it never prints “No migrations to apply” and uses ANSI spinner output that may not render in some Windows terminals.

**Action required:** **None** for migration application. Verify `restaurant_printers` exists in the target environment (confirmed for current `DATABASE_URL`).

---

## Investigation Questions

### 1. Is drizzle-kit actually connecting to the configured database?

**Yes.**

| Evidence | Detail |
|----------|--------|
| `drizzle.config.ts` | Loads `DATABASE_URL` via `dotenv/config`; throws if missing |
| Live query (investigation) | Connected to `gateway01.eu-central-1.prod.aws.tidbcloud.com`, database `mineuqr` |
| `npm run db:migrate` | Completed with exit code `0` after ~30–45s (TiDB network latency), spinner then `[✓] migrations applied successfully!` |
| `__drizzle_migrations` | Readable; 54 rows total (includes historical orphan bootstrap rows from prior recovery) |

`drizzle-kit migrate` always opens a MySQL connection before checking pending migrations (`connectToMySQL` → `drizzle-orm/mysql-core/dialect.migrate()`).

---

### 2. Is `__drizzle_migrations` already recording migration 0049?

**Yes.**

| Field | Value |
|-------|-------|
| Journal tag | `0049_restaurant_printers` |
| `created_at` (journal `when`) | `1783900000000` |
| Row in DB | **FOUND** |
| File SHA-256 | `48954276fe127f8031178fbef39e4f29c644c4a7bb572026113d3943f879f353` |
| Stored hash | **Matches** file hash exactly |

Latest applied migrations (descending):

| `created_at` | Migration (journal) |
|--------------|---------------------|
| `1783900000000` | `0049_restaurant_printers` |
| `1783800000000` | `0048_print_connector` |
| `1783700000000` | `0047_printing_service` |

---

### 3. Is `drizzle.config.ts` pointing to the expected database?

**Yes**, for the environment under investigation.

| Setting | Value |
|---------|-------|
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Database | `mineuqr` |
| Dialect | `mysql` |
| TLS | Auto-enabled for `*.tidbcloud.com` |
| Migration folder | `./drizzle` |
| Journal | `drizzle/meta/_journal.json` (50 entries, idx 0–49) |

**Caveat:** If `DATABASE_URL` differs between shells (local `.env` vs CI vs production gateway), migrate targets whichever URL is loaded at runtime. Always confirm host/database before interpreting results.

---

### 4. Is this expected behavior of drizzle-kit 0.31.4?

**Partially yes — the UX is misleading.**

Source: `node_modules/drizzle-kit/bin.cjs` (`MigrateProgress` class)

| Behavior | drizzle-kit 0.31.4 |
|----------|-------------------|
| “No migrations to apply” message | **Does not exist** (string not present in package) |
| Pending migrations applied | Spinner: `[⣷] applying migrations...` |
| Zero pending migrations | **Same success line:** `[✓] migrations applied successfully!` |
| Pending detection | `folderMillis > lastDbMigration.created_at` (`drizzle-orm/mysql-core/dialect.js`) |

So a successful no-op is **indistinguishable** from applying migrations by CLI message alone.

**Windows terminal note:** Spinner output uses ANSI erase-line sequences (`\x1b[2K\x1b[1G`). In some terminals (IDE integrated shell, piped stdout, non-UTF-8 fonts), only static lines may appear:

```
No config path provided, using default 'drizzle.config.ts'
Reading config file 'C:\mineuqr\drizzle.config.ts'
```

…with spinner and success lines **invisible or overwritten**. This matches the reported “returns immediately with no further output” even when the process ran for tens of seconds.

---

### 5. Should migrate print “No migrations” but doesn’t?

**Correct — drizzle-kit does not print that message.**

It always reports success after `migrate()` resolves, regardless of how many SQL files executed. This is a **drizzle-kit product behavior**, not a MineuQR defect.

---

### 6. Is the migration already applied?

**Yes.**

| Check | Result |
|-------|--------|
| `__drizzle_migrations` row for `1783900000000` | Present |
| `SHOW TABLES LIKE 'restaurant_printers'` | **EXISTS** |
| `0049_restaurant_printers.sql` on disk | Present with breakpoints (2 statements) |

---

## Root Cause

1. **Primary:** `0049_restaurant_printers` is already recorded in `__drizzle_migrations` and `restaurant_printers` exists. `drizzle-kit migrate` has nothing left to apply.
2. **Contributing (observed UX):** drizzle-kit 0.31.4 provides no “nothing to do” message and uses TTY spinner rendering that can appear blank on Windows, so operators see only the config preamble and assume the command did nothing.

---

## Evidence Artifacts

| Artifact | Location |
|----------|----------|
| Read-only DB verification script | `docs/engineering/programs/DRIZZLE-MIGRATION-INVESTIGATION-1/_query-migrations.mjs` |
| Captured migrate stdout | `docs/engineering/programs/DRIZZLE-MIGRATION-INVESTIGATION-1/migrate-output.txt` |
| Journal entry | `drizzle/meta/_journal.json` idx 49 |
| Migration SQL | `drizzle/0049_restaurant_printers.sql` |

---

## Whether Any Action Is Required

| Action | Required? |
|--------|-----------|
| Re-run `npm run db:migrate` for 0049 | **No** — already applied |
| Create new migration | **No** |
| Edit schema / SQL | **No** |
| Manual SQL apply | **No** |

**Operational verification** (recommended before relying on PRINT-UX-1 printer management):

```sql
SELECT hash, created_at FROM __drizzle_migrations WHERE created_at = 1783900000000;
SHOW TABLES LIKE 'restaurant_printers';
```

Or run the investigation script (read-only):

```bash
node docs/engineering/programs/DRIZZLE-MIGRATION-INVESTIGATION-1/_query-migrations.mjs
```

---

## Recommended Fix (If Any)

**No MineuQR code change is required** — migration state is correct for the investigated database.

**Operator guidance:**

1. After `npm run db:migrate`, wait for network completion (~30s+ to TiDB Cloud); do not assume instant exit.
2. Verify with `__drizzle_migrations` / table existence rather than CLI wording.
3. If spinner output is invisible, redirect to a file:  
   `npm run db:migrate 2>&1 | Tee-Object migrate.log`
4. Confirm `DATABASE_URL` host/database matches the intended environment.

**Optional future improvement** (out of scope for this investigation): wrap `db:migrate` with a post-run verification script or document drizzle-kit’s no-op success message in `docs/DB_MIGRATION_GOVERNANCE.md`. Not a proven defect in application code.

---

## Conclusion

The migration pipeline is functioning. `0049_restaurant_printers` is applied. The reported silent behavior is explained by **already-current migration state** plus **drizzle-kit’s minimal, spinner-based CLI output** on Windows — not by a failed or skipped migration step.
