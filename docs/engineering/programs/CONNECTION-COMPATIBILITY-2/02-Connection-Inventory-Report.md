# CONNECTION-COMPATIBILITY-2 — Connection Inventory Report

**Date:** 2026-06-26

---

## Repository Audit: `mysql.createConnection(` / `mysql.createPool(`

Post-remediation grep across `*.{mjs,cjs,ts,js}`:

| Location | Status |
|----------|--------|
| `scripts/lib/tidb-audit-connection.mjs:69` | **Canonical** — sole permitted direct `mysql.createConnection` for ops tooling |
| `server/db.ts` | **Canonical** — `createPool` via `createRuntimeMysqlPool()` (production) |
| All other scripts | **Compliant** — import factory, no raw URL connections |

---

## Connection Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Production runtime                                          │
│   server/db.ts → createRuntimeMysqlPool() → mysql.createPool│
│   TLS: isTidbCloud → ssl: { minVersion, rejectUnauthorized }│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Migrations (drizzle-kit)                                    │
│   drizzle.config.ts → credentials.ssl for *.tidbcloud.com   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Infrastructure / ops / audit scripts                        │
│   scripts/lib/tidb-audit-connection.mjs                     │
│     parseDatabaseUrl → resolveTlsForHost → createConnection   │
│   Consumers: 22 migrated scripts + data-integrity audit     │
└─────────────────────────────────────────────────────────────┘
```

---

## Factory API Surface

| Export | Use case |
|--------|----------|
| `parseDatabaseUrl` | URL → host/port/user/password/database/ssl |
| `resolveTlsForHost` | TiDB Cloud auto-TLS when `*.tidbcloud.com` |
| `createAuditConnection` | General ops (readonly or writable options) |
| `createAuditReadonlyConnection` | Read-only audits and verification |
| `auditConnectionTarget` | Redacted connection metadata for reports |

---

## Violations Remaining

**None** in application or infrastructure script code.

Documentation in `docs/engineering/programs/CONNECTION-COMPATIBILITY-1/` retains historical references to the pre-fix pattern for traceability only.
