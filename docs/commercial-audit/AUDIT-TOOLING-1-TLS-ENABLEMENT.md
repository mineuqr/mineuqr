# AUDIT-TOOLING-1 — TLS Enablement for Readonly Audit Scripts

**Program:** Audit Tooling (AUDIT-TOOLING-1)  
**Date:** 2026-06-08  
**Status:** Complete — audit tooling only  

**Scope:** Readonly audit connectivity. No product runtime, schema, migration, or database data changes.

---

## A — Root Cause Documentation

### A.1 Current connection path (before fix)

```text
scripts/data-integrity-audit-phase2-readonly.mjs
  → mysql.createConnection(DATABASE_URL)   // string URL only
  → mysql2 default ssl: false
  → TiDB Cloud rejects: "Connections using insecure transport are prohibited"
```

**Evidence:** `scripts/data-integrity-audit-phase2-readonly.mjs` L477 (pre-fix).

### A.2 Runtime connection path (application)

```text
server/db.ts getDb()
  → parseDatabaseUrl(DATABASE_URL)
  → createRuntimeMysqlPool()
  → if host matches *.tidbcloud.com:
       ssl = cfg.ssl ?? { minVersion: "TLSv1.2", rejectUnauthorized: true }
  → createPool({ host, port, user, password, database, ssl })
```

**Evidence:** `server/db.ts` L54–99.

### A.3 TLS differences

| Aspect | Audit script (before) | Runtime (`server/db.ts`) |
|--------|----------------------|---------------------------|
| Connection API | `createConnection(url)` string | `createPool({ ...cfg, ssl })` object |
| `?ssl=` in URL | Ignored by string form | Parsed via `parseDatabaseUrl` |
| TiDB auto-TLS | **Not applied** | **Applied** when `*.tidbcloud.com` |
| Drizzle | No | Yes (unchanged) |

### A.4 Why runtime succeeds

Application code explicitly injects TLS for TiDB Cloud hosts even when the URL omits `?ssl=`, satisfying TiDB Serverless transport requirements.

### A.5 Why audit script failed

Audit script passed the raw connection string to `mysql2`, which does not enable TLS by default. TiDB Cloud Serverless requires encrypted transport regardless of correct host, database, and credentials.

---

## B — Minimal Fix Strategy

### Options considered

| Option | Assessment |
|--------|------------|
| 1. Reuse runtime `server/db.ts` from `.mjs` | Rejected — TypeScript/Drizzle coupling; pulls product DB singleton |
| 2. Extract shared TLS module for audit only | **Chosen** — `scripts/lib/tidb-audit-connection.mjs` |
| 3. Duplicate inline TLS in one script | Rejected — duplicate logic; other audit scripts share same gap |

### Chosen approach

Create **`scripts/lib/tidb-audit-connection.mjs`** mirroring `server/db.ts` TLS rules:

- `parseDatabaseUrl()` — same URL + `?ssl=` parsing
- `resolveTlsForHost()` — auto-inject TLS for `*.tidbcloud.com`
- `createAuditReadonlyConnection()` — `mysql.createConnection` with explicit `ssl`

Update **`scripts/data-integrity-audit-phase2-readonly.mjs`** to use `createAuditReadonlyConnection(url)` instead of `mysql.createConnection(url)`.

Add **`scripts/data-integrity-1r-mineuqr-readonly.mjs`** for DATA-INTEGRITY-1R extended readonly probes (same TLS module).

**No changes** to `server/db.ts`, schema, migrations, or audit query logic.

---

## C — Implementation

| File | Change |
|------|--------|
| `scripts/lib/tidb-audit-connection.mjs` | **New** — audit-only TLS connection helper |
| `scripts/data-integrity-audit-phase2-readonly.mjs` | Import TLS helper; add `connectionTarget` to report JSON |
| `scripts/data-integrity-1r-mineuqr-readonly.mjs` | **New** — 1R verification runner with host/db guard |

---

## D — Validation

### D.1 Regression — legacy Monu (TLS smoke)

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:AUDIT_TARGET='monu-legacy-tls-smoke'
node -r dotenv/config scripts/data-integrity-audit-phase2-readonly.mjs
```

| Result | Value |
|--------|-------|
| Exit code | **0** |
| `connectionTarget.tls` | **true** |
| `connectionTarget.host` | `gateway05.us-east-1.prod.aws.tidbcloud.com` |
| Phase 2 checks | **22/22**, 0 issues |

### D.2 MineuQR launch target

```powershell
$env:DATABASE_URL='<mineuqr-connection-string-from-tidb-console>'
$env:AUDIT_TARGET='mineuqr-launch-rerun'
node scripts/data-integrity-audit-phase2-readonly.mjs
node scripts/data-integrity-1r-mineuqr-readonly.mjs
```

| Result (2026-06-08 audit session) | Value |
|-----------------------------------|-------|
| TLS error (`insecure transport`) | **Eliminated** — connection reaches TiDB auth layer |
| Full automated run | **Requires MineuQR cluster `DATABASE_URL`** (not in workspace `.env`; Monu credential prefix rejected on `gateway01`) |

**Operator action:** Export `DATABASE_URL` from TiDB Cloud console for cluster `gateway01` / database `mineuqr` and run commands above.

---

## E — DATA-INTEGRITY-1R

Tooling blocker **resolved**. Automated 1R completion documented in `DATA-INTEGRITY-1-PRODUCTION-VERIFICATION.md` Part IV when MineuQR `DATABASE_URL` is supplied to validation commands.

---

*End of AUDIT-TOOLING-1. Audit tooling only.*
