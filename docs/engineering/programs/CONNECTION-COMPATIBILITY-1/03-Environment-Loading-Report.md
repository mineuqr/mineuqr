# CONNECTION-COMPATIBILITY-1 — Environment Loading Report

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29

---

## Command A: `pnpm db:migrate`

| Aspect | Detail |
|--------|--------|
| Loader | `import "dotenv/config"` in `drizzle.config.ts` (line 1) |
| Timing | Before `connectionString = process.env.DATABASE_URL` |
| Mechanism | ESM side-effect import; loads `.env` from cwd |
| Overrides | Standard dotenv — does not override existing `process.env` keys |

---

## Command B: `pnpm db:order-read:verify-schema`

| Aspect | Detail |
|--------|--------|
| Loader | `dotenv.config()` in `order-read-projection-staging.mjs` (line 42) |
| Timing | Before `main()` → `requireDatabaseUrl()` |
| Mechanism | Explicit `dotenv` package call |
| Overrides | Standard dotenv behavior |

---

## `requireDatabaseUrl()` (verify-schema)

**Source:** `scripts/lib/order-read-staging-logic.mjs`

```javascript
export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}
```

No transformation, no SSL injection, no fallback hosts.

---

## Runtime Configuration Equivalence

| Variable | Migrate | Verify-schema |
|----------|---------|---------------|
| `DATABASE_URL` | Same `.env` value | Same `.env` value |
| `NODE_ENV` | Not used for TLS | Not used for TLS |
| SSL env vars | None in codebase | None |

**Conclusion:** Environment loading is **functionally equivalent** for `DATABASE_URL`. The failure is **not** caused by different env values or loading order.

---

## DATABASE_URL Format (Typical TiDB Cloud)

```
mysql://user:password@gateway01.region.prod.aws.tidbcloud.com:4000/dbname
```

Often **without** `?ssl={"minVersion":"TLSv1.2","rejectUnauthorized":true}` query parameter.

When URL lacks `ssl` param:

- `drizzle.config.ts` → still enables TLS via host detection
- `mysql.createConnection(url)` → `ssl: false`

---

## Verdict

Both commands receive **identical** `DATABASE_URL` from `.env`. Environment loading is **not** the root cause. Connection construction after env load is the divergence point.
