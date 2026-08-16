# PRODUCTION APPLY

| Field | Value |
|-------|--------|
| Command | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Start | `2026-08-16T12:18:33.186Z` |
| End | `2026-08-16T12:19:01.872Z` |
| Exit | **0** |
| Output | `migrations applied successfully!` |
| Target | `mineuqr` (`drizzle.config.ts` / `DATABASE_URL`) |
| Journal | 0090 → **0093** |
| Order | 0091 → 0092 → 0093 |
| Manual SQL | none |
| Seed / provisioning | none |
| Application deploy | **NOT DONE** |

Allowed Production mutation: three additive `CREATE TABLE` + indexes + official journal INSERTs.

## Backup

BACKUP: SKIPPED — EXPLICIT OPERATOR AUTHORIZATION  
BACKUP PREREQUISITE: OVERRIDDEN
