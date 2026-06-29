# MIGRATION-COMPATIBILITY-2 — TiDB Validation Report

**Program:** MIGRATION-COMPATIBILITY-2  
**Date:** 2026-06-29  
**Target:** TiDB Cloud (via `DATABASE_URL` in `.env`)

---

## Migration Apply

**Command:** `pnpm db:migrate`

**Result:** `✓ migrations applied successfully!`

**Prior failure (MIGRATION-COMPATIBILITY-1):**

```
client has multi-statement capability disabled
```

**Post-remediation:** No error. Migration 0046 applied in single transaction with 7 separate `execute()` calls.

---

## Execution Model (Verified)

| Step | Behavior |
|------|----------|
| Statement split | 7 segments via `--> statement-breakpoint` |
| Per-segment execute | One COM_QUERY each |
| `multipleStatements` | false (default) — unchanged |
| TiDB multi-statement policy | Not triggered |

---

## Migration Ledger

**Table:** `__drizzle_migrations`

Latest row after apply:

| Field | Value |
|-------|-------|
| `created_at` | `1783600000000` |
| `hash` | `20e435785c61916d8fe60ede66efcbc1fda18dccd435ef5c2db7f479638f3ddd` |

Corresponds to journal entry `0046_order_read_projections`.

Previous migration: `0045_order_domain_consumer_processed` (`1783500000000`).

---

## Configuration

| Component | TiDB TLS | Notes |
|-----------|----------|-------|
| `drizzle.config.ts` | ✓ Auto for `*.tidbcloud.com` | Used by `drizzle-kit migrate` |
| `multipleStatements` | Not enabled | Correct per policy |

---

## Verdict

**PASS** — `pnpm db:migrate` succeeds against TiDB Cloud after packaging remediation.
