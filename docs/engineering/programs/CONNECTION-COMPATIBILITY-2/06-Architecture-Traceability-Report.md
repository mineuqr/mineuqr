# CONNECTION-COMPATIBILITY-2 — Architecture Traceability Report

**Date:** 2026-06-26

---

## Problem → Fix Traceability

| ID | Finding (COMPAT-1) | Remediation (COMPAT-2) | Evidence |
|----|-------------------|------------------------|----------|
| RC-1 | `order-read-projection-staging.mjs` raw URL → `ssl: false` on TiDB | Import `createAuditReadonlyConnection` | `pnpm db:order-read:verify-schema` exit 0 |
| RC-2 | Sibling verify/preflight scripts same pattern | Dynamic import of canonical factory | `verify-schema-deployment.cjs`, `migration-preflight.cjs` |
| RC-3 | Duplicated `parseDatabaseUrl` + `resolveTlsForHost` in governance scripts | Delegate to `createAuditConnection` | `journal-validate-governance-1.mjs`, `execute-*.mjs`, `exec-4` |
| RC-4 | `apply-session-valid-after` missing TiDB fallback | Use canonical factory | TLS parity with `server/db.ts` |

---

## Canonical Connection Sources (unchanged hierarchy)

```
CONNECTION-COMPATIBILITY-2 scope
├── scripts/lib/tidb-audit-connection.mjs     ← ops/audit canonical (extended)
├── drizzle.config.ts                        ← migrations (no change)
└── server/db.ts → createRuntimeMysqlPool() ← production (no change)
```

---

## Program Dependency Chain

```
MIGRATION-COMPATIBILITY-2 (0046 breakpoints)
    └── enables db:migrate on TiDB
CONNECTION-COMPATIBILITY-1 (investigation)
    └── identified TLS drift in ops scripts
CONNECTION-COMPATIBILITY-2 (this program)
    └── unblocks ORDERS-READ-MODEL-1 Phase 3A ops:
        • db:order-read:verify-schema
        • db:order-read:discover
        • db:order-read:validate (connection path)
```

---

## Files Modified Summary

| Category | Count |
|----------|-------|
| Canonical factory | 1 (`tidb-audit-connection.mjs`) |
| Infrastructure scripts | 16 |
| Dev seed / utility scripts | 6 |
| Documentation | 6 (this program) |
| Domain / production runtime | 0 |

---

## Exit Criteria Mapping

| Exit criterion | Met |
|----------------|-----|
| No raw mysql2 connections where canonical factory exists | ✓ |
| All TiDB tooling shares connection architecture | ✓ |
| Migration + ops share TLS behavior | ✓ |
| `npm run check` passes | ✓ |
| Full Vitest suite passes | ✓ |
| No production business behavior changes | ✓ |

---

## Verdict

**CONNECTION-COMPATIBILITY-2 COMPLETE.** Ready to proceed with ORDERS-READ-MODEL-1 Phase 3A backfill execution when operationally approved.
