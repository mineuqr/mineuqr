# CONNECTION-COMPATIBILITY-2 — Infrastructure Compliance Report

**Date:** 2026-06-26

---

## Policy

> All MineuQR code that opens a direct mysql2 connection to TiDB Cloud MUST use a TLS-aware connection factory. Raw `mysql.createConnection(DATABASE_URL)` is prohibited for `*.tidbcloud.com` targets.

(Source: CONNECTION-COMPATIBILITY-1 §06-Canonical-Connection-Recommendation)

---

## Compliance Checklist

| Criterion | Status |
|-----------|--------|
| No infrastructure tool creates raw mysql2 URL connections | ✓ |
| All TiDB tooling uses `tidb-audit-connection.mjs` or production pool | ✓ |
| Migration path (`drizzle.config.ts`) unchanged and working | ✓ |
| Duplicated inline TLS logic removed from ops scripts | ✓ |
| No new connection implementations introduced | ✓ |
| No business logic changes | ✓ |
| No Order Domain / Read Model / projection changes | ✓ |
| No migration SQL changes | ✓ |

---

## Script Categories

### Ops / staging (npm scripts)

| Script | Factory |
|--------|---------|
| `db:order-read:verify-schema` | `createAuditReadonlyConnection` |
| `db:order-read:discover` | `createAuditReadonlyConnection` |
| `db:order-read:validate` | `createAuditReadonlyConnection` |
| `db:verify-schema` (via verify-schema-deployment.cjs) | `createAuditReadonlyConnection` |

### Governance / audit

| Script | Factory |
|--------|---------|
| `migration-preflight.cjs` | `createAuditReadonlyConnection` |
| `journal-validate-governance-1.mjs` | `createAuditConnection` |
| `execute-baseline-c2.mjs` | `createAuditReadonlyConnection` |
| `execute-c3-0019.mjs` | `createAuditReadonlyConnection` |
| `data-integrity-audit-phase2-readonly.mjs` | `createAuditReadonlyConnection` (pre-existing) |
| `exec-4-commercial-authority-backfill.mjs` | `createAuditConnection` |

### DB maintenance

| Script | Factory |
|--------|---------|
| `clean-db-*` (5 scripts) | `createAuditReadonlyConnection` |
| `apply-auth2b-local-schema.cjs` | `createAuditReadonlyConnection` |
| `apply-session-valid-after-local-patch.cjs` | `createAuditReadonlyConnection` |
| `audit-email-uniqueness-readonly.cjs` | `createAuditReadonlyConnection` |

### Dev seeds

| Script | Factory |
|--------|---------|
| `enable-local-password.mjs` | `createAuditReadonlyConnection` |
| `seed-dev-admin.mjs` | `createAuditReadonlyConnection` |
| `seed-countries.mjs` | `createAuditReadonlyConnection` |
| `update-plans-features.mjs` | `createAuditReadonlyConnection` |
| `server/seed-plans.mjs` | `createAuditReadonlyConnection` |
| `run-migration.mjs` | `createAuditReadonlyConnection` |

---

## Verdict

**Infrastructure compliance ACHIEVED.**
