# CONNECTION-COMPATIBILITY-1 — Connection Flow Report

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29

---

## Command A: `pnpm db:migrate` (SUCCESS)

### Entry

```
package.json → "db:migrate": "drizzle-kit migrate"
```

### Flow

```
pnpm db:migrate
  → drizzle-kit migrate
    → reads drizzle.config.ts (default config path)
      → import "dotenv/config"  (loads .env)
      → process.env.DATABASE_URL
      → parseDatabaseUrl(connectionString)
      → isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host)
      → ssl = cfg.ssl ?? (isTidbCloud ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined)
      → defineConfig({ dbCredentials: { host, port, user, password, database, ssl } })
    → drizzle-kit MySqlDialect.migrate()
      → mysql2 connection via structured credentials (NOT raw URL string)
      → TLS enabled for TiDB Cloud hosts
```

### Key file

`drizzle.config.ts` lines 1–51

### Connection shape passed to mysql2

```typescript
{
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }  // when host matches *.tidbcloud.com
}
```

---

## Command B: `pnpm db:order-read:verify-schema` (FAIL)

### Entry

```
package.json → "db:order-read:verify-schema": "node scripts/order-read-projection-staging.mjs --verify-schema"
```

### Flow

```
pnpm db:order-read:verify-schema
  → node scripts/order-read-projection-staging.mjs --verify-schema
    → dotenv.config()  (loads .env)
    → requireDatabaseUrl() → process.env.DATABASE_URL
    → mysql.createConnection(url)   // line 270 — raw URL string
      → mysql2 ConnectionConfig: typeof options === 'string' → parseUrl(url)
      → ssl defaults to false unless ?ssl= in URL query string
      → connection attempt without TLS
    → TiDB Cloud rejects: "Connections using insecure transport are prohibited"
```

### Key file

`scripts/order-read-projection-staging.mjs` lines 42, 269–270

### Connection shape passed to mysql2

```javascript
mysql.createConnection("mysql://user:pass@gateway01....tidbcloud.com:4000/dbname")
// Parsed to { host, port, user, password, database } — ssl: false
```

---

## Side-by-side

| Step | db:migrate | db:order-read:verify-schema |
|------|------------|----------------------------|
| Config file | `drizzle.config.ts` | None (inline in script) |
| Env load | `import "dotenv/config"` | `dotenv.config()` |
| DATABASE_URL | `process.env.DATABASE_URL` | `process.env.DATABASE_URL` |
| URL parsing | Custom `parseDatabaseUrl()` | mysql2 `parseUrl()` only |
| TiDB host detection | Yes (`isTidbCloud`) | **No** |
| SSL injection | Yes (auto for `*.tidbcloud.com`) | **No** |
| mysql2 API | Object credentials + `ssl` | **Raw URL string** |

---

## Verdict

Both commands read the **same** `DATABASE_URL` but construct **different** mysql2 connection options. Migrate enables TLS; verify-schema does not.
