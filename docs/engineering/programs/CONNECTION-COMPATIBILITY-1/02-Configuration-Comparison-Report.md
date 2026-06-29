# CONNECTION-COMPATIBILITY-1 — Configuration Comparison Report

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29

---

## Comparison Matrix

| Setting | `drizzle.config.ts` (migrate) | `order-read-projection-staging.mjs` (verify-schema) |
|---------|------------------------------|-----------------------------------------------------|
| **DATABASE_URL source** | `process.env.DATABASE_URL` | `process.env.DATABASE_URL` |
| **Driver** | mysql2 (via drizzle-kit) | mysql2/promise |
| **Connection API** | `dbCredentials` object | `createConnection(url)` string |
| **URL parsing** | Custom `parseDatabaseUrl()` | mysql2 built-in `parseUrl()` |
| **`?ssl=` query param** | Parsed if present | Parsed if present |
| **TiDB Cloud auto-TLS** | **Yes** — `isTidbCloud` fallback | **No** |
| **`ssl` when URL omits `?ssl=`** | `{ minVersion: "TLSv1.2", rejectUnauthorized: true }` | `false` (mysql2 default) |
| **`multipleStatements`** | false (default) | false (default) |
| **drizzle-orm** | Used (drizzle-kit) | Not used |
| **drizzle.config.ts** | **Consumed** | **Not consumed** |

---

## Identical

- Same `.env` file (both load dotenv)
- Same `DATABASE_URL` value at runtime
- Same mysql2 driver family
- Same target TiDB Cloud host

---

## Different (Material)

### 1. Connection factory pattern

**Migrate:** Structured options object with explicit `ssl` property.

**Verify-schema:** Raw connection URI string; relies on URL query parameters for SSL.

### 2. TiDB Cloud TLS fallback

**Migrate** (`drizzle.config.ts:32–37`):

```typescript
const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host);
const ssl = cfg.ssl ?? (isTidbCloud ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined);
```

**Verify-schema:** No equivalent logic.

### 3. mysql2 SSL default

**Source:** `node_modules/mysql2/lib/connection_config.js:145–148`

```javascript
this.ssl = typeof options.ssl === 'string'
  ? ConnectionConfig.getSSLProfile(options.ssl)
  : options.ssl || false;
```

When `createConnection(url)` is used and URL has no `ssl` query param → **`ssl: false`**.

### 4. Config file participation

`pnpm db:order-read:verify-schema` **never reads** `drizzle.config.ts`. TLS logic in that file does not apply.

---

## Related: `db:verify-schema`

`scripts/verify-schema-deployment.cjs` line 61:

```javascript
const conn = await mysql.createConnection(url);
```

**Same defect** as order-read staging script — would fail identically on TiDB Cloud without `?ssl=` in URL.

---

## Verdict

Configuration is **not shared** between migrate and verify-schema. Migrate uses TLS-aware structured credentials; verify-schema uses insecure-default URL connection.
