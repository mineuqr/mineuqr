# CONNECTION-COMPATIBILITY-2 — TLS Validation Report

**Date:** 2026-06-26  
**Target:** TiDB Cloud (`*.tidbcloud.com`) via workspace `DATABASE_URL`

---

## Validation Commands

| Command | Result | TLS path |
|---------|--------|----------|
| `pnpm db:migrate` | **PASS** | `drizzle.config.ts` (unchanged) |
| `pnpm db:order-read:verify-schema` | **PASS** | `createAuditReadonlyConnection` |
| `pnpm db:order-read:discover` | **PASS** | `createAuditReadonlyConnection` |
| `pnpm db:order-read:validate` | **CONN PASS** / data mismatch | `createAuditReadonlyConnection` |

---

## Primary Fix Verification

**Before (CONNECTION-COMPATIBILITY-1):**  
`pnpm db:order-read:verify-schema` failed with TiDB insecure-transport rejection (`ssl: false` from raw URL).

**After (CONNECTION-COMPATIBILITY-2):**

```
[order-read-staging] schema OK — all order_read_* tables present
```

Exit code 0. Connection established over TLS (`resolveTlsForHost` → `minVersion: TLSv1.2`, `rejectUnauthorized: true`).

---

## Backfill Validate Note

`pnpm db:order-read:validate` exits 1 with **207 projection mismatches** — expected operational state:

- Write model: 206 orders
- Projection tables: 0 rows (backfill not executed; `ORDER_READ_PROJECTIONS_ENABLED=false`)

The script **connected successfully**, verified schema, and ran integrity comparison logic. Failure is data state, not TLS or connection architecture.

---

## TLS Behavior Matrix

| Host pattern | `resolveTlsForHost` result |
|--------------|---------------------------|
| `*.tidbcloud.com` | `{ minVersion: "TLSv1.2", rejectUnauthorized: true }` |
| Local / other | `undefined` (no forced SSL) unless `?ssl=` in URL |

Aligned with `server/db.ts` and `drizzle.config.ts` TiDB detection.

---

## Verdict

**TLS validation PASS.** Migration path and operational tooling now share equivalent TiDB Cloud TLS behavior.
