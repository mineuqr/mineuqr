# PRODUCTION-MIGRATION-EXECUTION-0083 — Production Migration Report

| Field | Value |
|---|---|
| **Program** | PRODUCTION-MIGRATION-EXECUTION-0083 |
| **Phase** | Production Database Migration Execution |
| **Date** | 2026-07-28 |
| **Migration** | `drizzle/0083_order_ordering_channel.sql` |
| **Verdict** | **B. Certified with observations** |

---

## 1. Executive Summary

Production migration **`0083_order_ordering_channel`** was applied successfully through the official pipeline (`pnpm db:migrate`). Columns `orders.ordering_channel` and `order_read_orders.ordering_channel` are live (`varchar(32) NULL`, immediately after `identityScope`). Migration registered **once**. Platform row counts unchanged. No manual DDL.

**New production migration terminus (DB):** `0083_order_ordering_channel`  
**Applied hash:** `0f4df950d48b4b0116330a5be1243cead2c9dd42b1848982c4e77ec3ea04b657` (**once**, id `5964102`)

---

## 2. Pre-Migration Audit

| Check | Result |
|-------|--------|
| Governance terminus | `0083_order_ordering_channel` (84 entries) |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:preflight` (pre) | **PASS** — pending **0083 only** |
| Production database | `mineuqr` (TiDB Cloud via `DATABASE_URL`) |
| Backup control | Operator-stated complete (mission brief) |
| 0083 previously applied | **NO** |
| Last applied (pre) | **0082** hash `52d7c5f2…`, id `5934102` |
| Target columns (pre) | **Absent** |
| Platform counts (pre) | orders 21 · order_read 21 · SR 18 · checks 21 |

---

## 3. Migration Execution Result

| Item | Value |
|------|-------|
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Attempt 1 | **FAIL** — TiDB errno **8130** multi-statement (zero DDL) |
| Packaging hotfix | Added `--> statement-breakpoint` between ALTERs (0072/0081 pattern) |
| Attempt 2 | **SUCCESS** — `migrations applied successfully!` |
| Duration (attempt 2) | **~5.5s** (`DURATION_MS=5521`) |
| Exit code | **0** |
| Journal `when` / DB `created_at` | `1784690000000` |
| `__drizzle_migrations` id | `5964102` |
| Applied hash | `0f4df950…04b657` (**once**) |
| Rollback | **Not required** |

---

## 4. Success criteria

| Criterion | Status |
|-----------|--------|
| 0083 applied | **Met** |
| Terminus advanced to 0083 | **Met** |
| Columns persist-ready | **Met** |
| Application / reporting schema healthy | **Met** (verify-schema OK; counts stable) |
| Architecture (no channel inference) | **Met** (smoke + registry check) |
| Live channel stamp UAT orders | **Observation** — not placed in this program; historical rows remain NULL |

---

## 5. Observations

1. **TiDB 8130 on first attempt** — expected for multi-ALTER without breakpoints; packaging corrected; no partial DDL from attempt 1.
2. **Hash** differs from pre-breakpoint adoption hash (`6e3187d2…`); final applied hash is `0f4df950…`.
3. **Live place/stamp UAT** (QR / Waiter / Kiosk / Table Session) deferred to operational validation — schema and governance are production-ready.
