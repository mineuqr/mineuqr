# CRMP-PRODUCTION-MIGRATION-EXECUTION-0077

| Field | Value |
|---|---|
| **Program** | CRMP-PRODUCTION-MIGRATION-EXECUTION-0077 |
| **Phase** | Production Database Migration Execution |
| **Date** | 2026-07-24 |
| **Migration** | `drizzle/0077_crmp.sql` |
| **References** | ADR-ARCH-028 · CRMP-IMPLEMENTATION-1 · GOVERNANCE-ADOPTION-0077 |
| **Verdict** | **PRODUCTION MIGRATION CERTIFIED** |

---

## 1. Executive Summary

Production migration **`0077_crmp`** was applied successfully through the official pipeline (`pnpm db:migrate`). All six CRMP tables exist empty with expected indexes. Certified platforms’ row counts remain intact. No manual SQL, no journal edits, no governance bypass.

**New production migration terminus:** `0077_crmp`

---

## 2. Environment

| Item | Value |
|------|-------|
| Target | Production TiDB Cloud |
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Port | `4000` |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Application deploy | **No** (out of scope) |
| Data mutation / backfill | **None** |
| Backup control | TiDB Cloud continuous backup (program BACKGROUND: verified) |

---

## 3. Phase 1 — Final Pre-Execution Validation

| Prerequisite | Result |
|--------------|--------|
| `pnpm db:governance-check` | **PASS** (terminus `0077_crmp`, 78 entries) |
| `pnpm db:preflight` | **PASS** — pending: `0077_crmp` only |
| Production terminus before migrate | **PASS** — `0076_settlement_records` hash `c9e85e8d…d3b7f` (id `5754102`) |
| `crmp_%` tables absent pre-migrate | **PASS** |
| Backup verified (BACKGROUND) | **PASS** (program precondition) |
| SQL / journal unmodified this program | **PASS** |

---

## 4. Migration Executed

| Item | Value |
|------|-------|
| Version / tag | `0077_crmp` |
| Journal idx | `77` |
| Journal `when` | `1784630000000` |
| Checksum (SHA-256 of SQL file) | `e226968d0503db36cca69ccabbdf04d6dd0101279de74038bc61db512ce3ac4a` |
| Applied DB hash | `e226968d0503db36cca69ccabbdf04d6dd0101279de74038bc61db512ce3ac4a` (exact match, **once**) |
| `__drizzle_migrations` id | `5784102` |
| `__drizzle_migrations.created_at` | `1784630000000` (matches journal `when`) |
| Execution start | `2026-07-24T21:45:47+03:00` |
| Execution end | `2026-07-24T21:46:01+03:00` |
| Duration | **~13.7s** |
| Exit code | **0** — `migrations applied successfully!` |

### Commands

```bash
pnpm db:governance-check          # PASS
pnpm db:preflight                 # pending: 0077 only
# pre-probe: crmp_% absent; 0076 applied
pnpm db:migrate                   # SUCCESS (0077 only)
# post-probe: 6 crmp_* tables
pnpm db:preflight                 # zero pending
pnpm db:governance-check          # PASS
pnpm db:verify-schema             # OK
```

---

## 5. Migration Journal Status

| Check | Result |
|-------|--------|
| 0077 hash appears exactly once | **PASS** |
| No duplicate 0077 entries | **PASS** |
| All journal hashes recorded in DB | **PASS** (`pnpm db:preflight`) |
| Pending migrations after | **None** |
| DB `__drizzle_migrations` rows | **82** (78 journal + historical bootstrap extras — expected pattern) |

---

## 6. Tables Created

| Table | Row count post-migrate |
|-------|------------------------:|
| `crmp_registers` | 0 |
| `crmp_financial_shifts` | 0 |
| `crmp_drawer_movements` | 0 |
| `crmp_drawer_counts` | 0 |
| `crmp_shift_handovers` | 0 |
| `crmp_settlement_attributions` | 0 |

---

## 7. Indexes Created

Verified via `information_schema.statistics` (non-exhaustive names):

| Table | Unique / primary indexes |
|-------|--------------------------|
| `crmp_registers` | `PRIMARY`, `crmp_registers_register_id_unique` (+ restaurant indexes) |
| `crmp_financial_shifts` | `PRIMARY`, `…_shift_id_unique`, `…_drawer_id_unique` (+ register/status indexes) |
| `crmp_drawer_movements` | `PRIMARY`, `…_movement_id_unique` |
| `crmp_drawer_counts` | `PRIMARY`, `…_count_id_unique` |
| `crmp_shift_handovers` | `PRIMARY`, `…_handover_id_unique`, `…_shift_id_unique` |
| `crmp_settlement_attributions` | `PRIMARY`, `…_attr_id_unique`, `…_sr_unique` |

Matches migration definition / Drizzle schema.

---

## 8. Constraints & Foreign Keys

| Expectation | Status |
|-------------|--------|
| PRIMARY KEY on each table `id` | **PASS** |
| UNIQUE business ids as defined | **PASS** |
| Foreign keys to Check / Settlement Record | **None** (by design / ADR-028 — application-level refs) — **PASS** |
| Unexpected FKs on `crmp_%` | **None** |

---

## 9. Runtime Validation

| Check | Result |
|-------|--------|
| CRMP domain + service tests | **PASS** — 26/26 |
| Drizzle ORM read smoke (`crmp_registers`, attributions) | **PASS** — `APP_DB_SMOKE=OK` |
| Existing ORM reads (`settlement_records`, `operational_checks`) | **PASS** |
| `pnpm db:verify-schema` | **PASS** |
| Full-repo `tsc --noEmit` | **Pre-existing failures** in reporting/order-read/etc.; one CRMP TS7009 at `financialShiftCommands.ts:285` (does not block vitest/runtime path; out of scope to fix in execution program) |

No migration startup failure. No dependency cycle introduced by DDL.

---

## 10. Smoke Test Results

| Check | Result | Notes |
|-------|--------|-------|
| Application DB/ORM bind to CRMP tables | **PASS** | Read-only select limit 1 |
| Certified schema verify | **PASS** | Auth / order-read / devices / check / OS / ST surfaces |
| Startup / missing-table risk for CRMP | **PASS** | Tables exist; empty |
| Live Mark Paid / settle / order place | **Not executed** | No production data mutation |
| Dashboard / reporting UI | **Not redeployed** | Schema additive; app deploy out of scope |
| Ordering / Check settlement continuity counts | **PASS** | See platform counts below |

---

## 11. Platform Compatibility & Regression

| Platform | Evidence | Status |
|----------|----------|--------|
| Order | `orders` count present (9); no DDL on orders | **PASS** |
| Check | `operational_checks` count 9; unchanged DDL | **PASS** |
| Settlement / ST | ST platform tables untouched | **PASS** |
| Settlement Record | count 4; table untouched | **PASS** |
| Reporting | No reporting schema change | **PASS** |
| Operational Session | No session DDL | **PASS** |
| Operational Device | count 2; untouched | **PASS** |
| Waiter / Self Ordering / Kitchen | No schema touch; event consumers unchanged | **PASS** |

**No unexpected schema modifications** outside additive `crmp_*` tables.

---

## 12. Rollback Readiness

| Item | Status |
|------|--------|
| TiDB continuous backup | Available (precondition) |
| Forward-only additive DDL | Safe empty tables — rollback = drop `crmp_*` only if ever required (not executed) |
| Compensating migrate | Not generated (out of scope) |

---

## 13. Production Readiness

| Area | Status |
|------|--------|
| Migration status | **0077 applied once** |
| Journal integrity | **Healthy / zero pending** |
| Database health | **Normal** (CRMP empty; platform counts stable) |
| Application compatibility | **ORM smoke OK** |
| CRMP adoption (UI / Settlement hook) | **Not deployed** — schema ready for future programs |

---

## 14. Final Certification

| Success criterion | Status |
|-------------------|--------|
| `0077_crmp` is production terminus | **Met** |
| Migration journal updated | **Met** |
| All CRMP schema objects exist | **Met** |
| Application ORM initializes against CRMP | **Met** |
| No certified platform regression | **Met** |
| Smoke tests pass (read-only) | **Met** |
| No manual SQL | **Met** |
| No governance bypass | **Met** |
| No unexpected schema changes | **Met** |

### Verdict

**CRMP-PRODUCTION-MIGRATION-EXECUTION-0077 — PRODUCTION MIGRATION CERTIFIED**

Production schema terminus is **`0077_crmp`**. CRMP persistence is available for future adoption programs. No application feature deploy was performed in this program.
