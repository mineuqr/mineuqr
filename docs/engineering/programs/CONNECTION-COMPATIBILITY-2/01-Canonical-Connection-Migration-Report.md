# CONNECTION-COMPATIBILITY-2 — Canonical Connection Migration Report

**Program:** CONNECTION-COMPATIBILITY-2 (Remediation)  
**Date:** 2026-06-26  
**Predecessor:** CONNECTION-COMPATIBILITY-1 (Investigation)

---

## Objective

Remove configuration drift: every infrastructure script that opened raw `mysql.createConnection(DATABASE_URL)` now uses the canonical TLS-aware factory in `scripts/lib/tidb-audit-connection.mjs`.

---

## Canonical Factory Extension

`createAuditConnection(databaseUrl, options?)` added as the single implementation path:

| Option | Purpose |
|--------|---------|
| `multipleStatements` | Writable ops (e.g. EXEC-4 execute mode) |
| `database: null` | Admin DDL without default database (journal governance validation) |

`createAuditReadonlyConnection(url)` remains a thin wrapper for read-only tooling.

---

## Migrated Files (22)

| File | Before | After |
|------|--------|-------|
| `scripts/order-read-projection-staging.mjs` | `mysql.createConnection(url)` | `createAuditReadonlyConnection` |
| `scripts/verify-schema-deployment.cjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/migration-preflight.cjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/audit-email-uniqueness-readonly.cjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/apply-auth2b-local-schema.cjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/apply-session-valid-after-local-patch.cjs` | local `parseDatabaseUrl` + partial TLS | `createAuditReadonlyConnection` |
| `scripts/clean-db-1b-execute.mjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/clean-db-1b-supplement.mjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/clean-db-2-execute.mjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/clean-db-2-execution-preview-readonly.mjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/clean-db-orphan-audit-readonly.mjs` | raw URL | `createAuditReadonlyConnection` |
| `scripts/exec-4-commercial-authority-backfill.mjs` | duplicated inline TLS | `createAuditConnection` |
| `scripts/journal-validate-governance-1.mjs` | duplicated inline TLS | `createAuditConnection` |
| `scripts/execute-c3-0019.mjs` | duplicated inline TLS | `createAuditReadonlyConnection` |
| `scripts/execute-baseline-c2.mjs` | duplicated inline TLS | `createAuditReadonlyConnection` |
| `scripts/verify-slice2-local.ts` | `createConnection(url)` | `createAuditReadonlyConnection` |
| `enable-local-password.mjs` | raw URL | `createAuditReadonlyConnection` |
| `seed-dev-admin.mjs` | raw URL | `createAuditReadonlyConnection` |
| `seed-countries.mjs` | raw URL | `createAuditReadonlyConnection` |
| `update-plans-features.mjs` | raw URL | `createAuditReadonlyConnection` |
| `server/seed-plans.mjs` | raw URL | `createAuditReadonlyConnection` |
| `run-migration.mjs` | raw URL | `createAuditReadonlyConnection` |

---

## Already Compliant (unchanged)

| File | Notes |
|------|-------|
| `scripts/data-integrity-audit-phase2-readonly.mjs` | Already used `createAuditReadonlyConnection` |
| `server/db.ts` | Production pool — `createRuntimeMysqlPool()` |
| `drizzle.config.ts` | Migration TLS via drizzle-kit credentials |
| `scripts/lib/tidb-audit-connection.mjs` | Canonical factory (internal `mysql.createConnection` with structured options) |

---

## Intentionally Unchanged

- Order Domain, Read Model, projections, migrations SQL
- `server/db.ts` production runtime
- Business logic in all scripts

---

## Exit Verdict

**Migration COMPLETE.** All audited infrastructure tooling routes through `scripts/lib/tidb-audit-connection.mjs`.
