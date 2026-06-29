# CONNECTION-COMPATIBILITY-1 — TLS Compatibility Report

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29

---

## TiDB Cloud Requirement

TiDB Cloud (Serverless/Tier) **requires encrypted transport**. Connections without TLS are rejected:

```
Connections using insecure transport are prohibited.
```

**Documentation:** [TiDB secure connections](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-tier-clusters)

---

## mysql2 TLS Behavior

### Structured connection (object)

```javascript
mysql.createConnection({
  host: "...tidbcloud.com",
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }
})
```

→ TLS enabled → TiDB accepts.

### URL string connection (no `?ssl=` param)

```javascript
mysql.createConnection("mysql://user:pass@....tidbcloud.com:4000/db")
```

→ `ConnectionConfig.parseUrl()` extracts host/user/password — **no ssl key**  
→ `this.ssl = options.ssl || false` → **TLS disabled**  
→ TiDB rejects insecure transport.

**Evidence:** `node_modules/mysql2/lib/connection_config.js` lines 76–77, 145–148, 272–290.

---

## MineuQR TLS Implementations

### Canonical — Application runtime

**File:** `server/db.ts` — `createRuntimeMysqlPool()`

```typescript
const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host ?? "");
const ssl = cfg.ssl ?? (isTidbCloud ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined);
```

### Canonical — Drizzle-kit migrate

**File:** `drizzle.config.ts` — identical pattern (comment: "mirrors server/db.ts")

### Canonical — Audit/ops scripts

**File:** `scripts/lib/tidb-audit-connection.mjs` — `createAuditReadonlyConnection()`

```javascript
export function resolveTlsForHost(cfg) {
  const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host ?? "");
  return cfg.ssl ?? (isTidbCloud ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined);
}
```

Used by: `exec-4-commercial-authority-backfill.mjs`, `data-integrity-*` scripts.

### Non-canonical — Missing TLS

| Script | Connection | TiDB TLS |
|--------|------------|----------|
| `order-read-projection-staging.mjs` | `createConnection(url)` | **Missing** |
| `verify-schema-deployment.cjs` | `createConnection(url)` | **Missing** |
| `migration-preflight.cjs` | `createConnection(url)` | **Missing** |

---

## Why Migrate Succeeds

`drizzle-kit migrate` reads `drizzle.config.ts` which injects `ssl` into `dbCredentials` for `*.tidbcloud.com` hosts **regardless of URL query string**.

---

## Why Verify-schema Fails

`order-read-projection-staging.mjs` bypasses all TLS-aware factories and passes raw `DATABASE_URL` to mysql2.

---

## Alternative (Not Used)

Adding `?ssl={"minVersion":"TLSv1.2","rejectUnauthorized":true}` to `DATABASE_URL` would make `createConnection(url)` work — but this duplicates logic already in `drizzle.config.ts` and `server/db.ts`, and is not the repository's established pattern.

---

## Verdict

TiDB requires TLS. Migrate provides it. Verify-schema does not. This is a **client-side TLS configuration omission**, not a TiDB or migration defect.
