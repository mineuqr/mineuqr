# CONNECTION-COMPATIBILITY-1 — Root Cause Analysis

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Verdict:** PROVEN — TLS configuration divergence between connection factories

---

## Question

Why does `pnpm db:migrate` succeed while `pnpm db:order-read:verify-schema` fails with:

```
Connections using insecure transport are prohibited.
```

---

## Root Cause

> **`scripts/order-read-projection-staging.mjs` connects via `mysql.createConnection(DATABASE_URL)` passing the raw URL string, which leaves `ssl: false` when the URL omits an `?ssl=` query parameter. TiDB Cloud requires TLS and rejects the connection. `pnpm db:migrate` succeeds because `drizzle.config.ts` parses the URL, detects `*.tidbcloud.com` hosts, and injects `ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }` into drizzle-kit's mysql2 credentials.**

---

## Evidence Chain

| # | Evidence | Location |
|---|----------|----------|
| 1 | Migrate uses `drizzle.config.ts` with TiDB TLS auto-enable | `drizzle.config.ts:32–49` |
| 2 | Verify-schema uses `mysql.createConnection(url)` | `order-read-projection-staging.mjs:270` |
| 3 | Verify-schema does not import `tidb-audit-connection.mjs` | `order-read-projection-staging.mjs` imports |
| 4 | mysql2 URL parse does not auto-enable SSL | `connection_config.js:145–148` |
| 5 | Same error observed in prior session when verify-schema ran | MIGRATION-COMPATIBILITY-2 validation |
| 6 | Migrate succeeded in same environment | MIGRATION-COMPATIBILITY-2 validation |
| 7 | Canonical TLS helper already exists | `scripts/lib/tidb-audit-connection.mjs` |

---

## Ruled Out

| Hypothesis | Evidence against |
|------------|------------------|
| Different DATABASE_URL | Both load `.env` via dotenv |
| Migration packaging issue | 0046 already applied; error is at connection, not SQL |
| drizzle-kit bug | Migrate works; config is correct |
| TiDB outage | Migrate/connect with TLS works |
| Wrong database | Same URL, same host |
| Missing `.env` | Would fail with "DATABASE_URL is required", not TLS error |

---

## Architecture Violation

The repository has **three canonical TLS-aware connection patterns**:

1. `server/db.ts` → `createRuntimeMysqlPool()` (application)
2. `drizzle.config.ts` (drizzle-kit CLI)
3. `scripts/lib/tidb-audit-connection.mjs` → `createAuditReadonlyConnection()` (ops/audit)

`order-read-projection-staging.mjs` (Phase 3A) introduced a **fourth ad-hoc pattern** using raw URL strings — inconsistent with established architecture and incompatible with TiDB Cloud default URLs.

---

## Classification

| Layer | Responsible? |
|-------|--------------|
| TiDB Cloud policy | Enforces requirement (expected) |
| mysql2 default | `ssl: false` without explicit config (expected) |
| `drizzle.config.ts` | Correct |
| `order-read-projection-staging.mjs` | **Defect** — missing TLS |
| `DATABASE_URL` | Not defective |

---

## Confidence

**HIGH** — Deterministic from source code inspection; no speculation required.
