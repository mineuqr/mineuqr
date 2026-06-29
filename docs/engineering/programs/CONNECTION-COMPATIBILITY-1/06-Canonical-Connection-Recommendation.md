# CONNECTION-COMPATIBILITY-1 — Canonical Connection Recommendation

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Status:** RECOMMENDATION — not implemented

---

## Principle

> **All MineuQR code that opens a direct mysql2 connection to TiDB Cloud MUST use a TLS-aware connection factory. Raw `mysql.createConnection(DATABASE_URL)` is prohibited for `*.tidbcloud.com` targets.**

---

## Canonical Factories (Existing)

| Context | Factory | Path |
|---------|---------|------|
| Application runtime | `createRuntimeMysqlPool()` | `server/db.ts` |
| Drizzle CLI (migrate, generate) | `drizzle.config.ts` `dbCredentials` | `drizzle.config.ts` |
| Ops / audit / staging scripts | `createAuditReadonlyConnection()` | `scripts/lib/tidb-audit-connection.mjs` |

All three implement the same rule:

```javascript
const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
const ssl = cfg.ssl ?? (isTidbCloud ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined);
```

---

## Recommended Fix (Future Program)

### For `order-read-projection-staging.mjs`

Replace:

```javascript
const conn = await mysql.createConnection(url);
```

With:

```javascript
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";
const conn = await createAuditReadonlyConnection(url);
```

### For `verify-schema-deployment.cjs`

Same pattern — use `createAuditReadonlyConnection` or shared CJS wrapper.

### For `migration-preflight.cjs`

Same pattern when `DATABASE_URL` is set.

---

## Anti-patterns (Prohibited)

| Pattern | Why |
|---------|-----|
| `mysql.createConnection(process.env.DATABASE_URL)` | No TiDB TLS fallback |
| Duplicating TLS logic inline in new scripts | Drift risk — use shared module |
| `SET GLOBAL tidb_multi_statement_mode` / disable TiDB TLS enforcement | Platform security regression |
| Adding `?ssl=...` only to `.env` without code fix | Masks script bugs; duplicates config |

---

## Long-term Architecture

### Option A (Preferred): Single shared module

Extract `parseDatabaseUrl` + `resolveTlsForHost` from `tidb-audit-connection.mjs` into a package-importable module used by:

- `server/db.ts` (import shared — reduce duplication)
- `drizzle.config.ts` (import shared)
- All scripts

### Option B (Minimal): Script-level adoption

Each script imports `createAuditReadonlyConnection` — no refactor of `server/db.ts`.

**Recommendation:** Option B for immediate fix; Option A as tech-debt follow-up.

---

## CI Gate (Recommended)

Add lint/audit check:

```
scripts using mysql.createConnection(DATABASE_URL) without tidb-audit-connection → FAIL
```

---

## Verdict

The architecturally correct permanent solution is to **route all ops scripts through `createAuditReadonlyConnection()`** (or a future unified connection module), matching `drizzle.config.ts` and `server/db.ts` TLS behavior.
