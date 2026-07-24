# CRMP-PRODUCTION-MIGRATION-0079

| Field | Value |
|---|---|
| **Program** | CRMP-PRODUCTION-MIGRATION-0079 |
| **Phase** | Production Database Migration Execution |
| **Date** | 2026-07-24 |
| **Migration** | `drizzle/0079_crmp_register_duty.sql` |
| **References** | ADR-ARCH-028 · **030** · REGISTER-OPERATIONS-IMPLEMENTATION-1 · CRMP-PRODUCTION-MIGRATION-0078 |
| **Verdict** | **PRODUCTION MIGRATION CERTIFIED** |

---

## 1. Executive Summary

Production migration **`0079_crmp_register_duty`** was applied successfully through the official pipeline (`pnpm db:migrate`). Register Duty plane columns (`dutyStatus`, `assignedOperatorUserId`, `operatorAssignedAt`) and index `crmp_registers_restaurant_duty` were added. Existing CRMP and certified-platform row counts unchanged. No manual SQL, no journal edits during execute, no governance bypass.

**New production migration terminus:** `0079_crmp_register_duty`

---

## 2. Pre-flight Results

| Check | Result |
|-------|--------|
| Branch | `main` tracking `origin/main` |
| HEAD commit | `d700b519f37b9a488d1b63577ef21d1bbd589261` (`feat(crmp): adopt settlement attribution`) |
| Working tree | **Dirty** — contains certified REGISTER-OPERATIONS-IMPLEMENTATION-1 artifacts (0079 SQL/journal/domain). Accepted as execute package; no unrelated schema redesign. |
| Journal last tag | `0079_crmp_register_duty` (idx 79, when `1784650000000`) |
| Governance terminus | `0079_crmp_register_duty` (count 80) |
| Last applied (pre) | **0078** hash `182636ff…e986db` id `5814102` |
| Pending (pre) | **0079 only** |
| Production DB reachable | **PASS** (preflight + probe) |
| Backup strategy | **TiDB Cloud continuous backup** (same control as 0076/0077/0078) |
| `pnpm db:governance-check` | **PASS** |
| Migration audit | **APPROVED** — see [`MIGRATION-AUDIT.md`](./MIGRATION-AUDIT.md) |

---

## 3. Migration Audit

See [`MIGRATION-AUDIT.md`](./MIGRATION-AUDIT.md).

| Criterion | Status |
|-----------|--------|
| Additive / deterministic / backward compatible | **PASS** |
| No DROP / destructive SQL / data rewrite | **PASS** |
| No ownership changes | **PASS** |

---

## 4. Execution Log

| Item | Value |
|------|-------|
| Version / tag | `0079_crmp_register_duty` |
| Journal idx | `79` |
| Journal `when` | `1784650000000` |
| Checksum (SHA-256 of SQL file) | `89f6ee1849da2244caa7c779c49b0aefaf77a4349f53831eb18b4e8b34f6481a` |
| Applied DB hash | `89f6ee1849da2244caa7c779c49b0aefaf77a4349f53831eb18b4e8b34f6481a` (exact match, **once**) |
| `__drizzle_migrations` id | `5844102` |
| `__drizzle_migrations.created_at` | `1784650000000` (matches journal `when`) |
| Execution start | `2026-07-24T23:04:27+03:00` |
| Execution end | `2026-07-24T23:04:33+03:00` |
| Duration | **~5.2s** |
| Exit code | **0** — `migrations applied successfully!` |
| Warnings | None material |

### Environment

| Item | Value |
|------|-------|
| Target | Production TiDB Cloud |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Application feature deploy | **No** (out of scope) |
| Data mutation / backfill | **None** |
| Backup control | TiDB Cloud continuous backup |

### Commands

```bash
pnpm db:governance-check          # PASS
pnpm db:preflight                 # pending: 0079 only
# pre-probe: duty columns/index absent; 0078 terminus
pnpm db:migrate                   # SUCCESS (0079 only)
# post-probe: duty columns + index; hash applied once
pnpm db:preflight                 # zero pending
pnpm db:governance-check          # PASS
pnpm db:verify-schema             # OK
```

---

## 5. Schema Verification

| Expectation | Pre | Post |
|-------------|-----|------|
| `dutyStatus` | absent | `enum('closed','open','suspended') NOT NULL DEFAULT 'closed'` |
| `assignedOperatorUserId` | absent | `int` NULL |
| `operatorAssignedAt` | absent | `timestamp` NULL |
| Index `crmp_registers_restaurant_duty` | absent | `(restaurantId, dutyStatus)` |
| 0079 hash in `__drizzle_migrations` | absent | present once |
| Catalog `status` enum | unchanged | unchanged |
| FKs to Check / SR | none | none (by design) |

| Check | Result |
|-------|--------|
| Schema matches migration definition | **PASS** |
| No unexpected tables created/dropped | **PASS** |
| No Check / Settlement Record / Reporting DDL | **PASS** |
| `pnpm db:verify-schema` | **PASS** |
| ORM/DB smoke (`dutyStatus` selectable) | **PASS** — `APP_DB_SMOKE=OK` |

---

## 6. Application Validation

| Check | Result |
|-------|--------|
| DB smoke (registers / shifts / SR / checks) | **PASS** |
| Register Duty domain tests | **PASS** (included in 106) |
| Financial Shift / Settlement Context / Attribution suites | **PASS** |
| Startup / missing-column risk for Register Duty | **PASS** — columns exist |
| Full production app redeploy | **Not performed** — out of scope |

No migration-induced startup failure for CRMP ORM paths.

---

## 7. Regression Results

| Platform | Evidence | Status |
|----------|----------|--------|
| Order | `orders` count 9 → 9; no DDL | **PASS** |
| Check | `operational_checks` 9 → 9 | **PASS** |
| Settlement Record | count 4 → 4 | **PASS** |
| Reporting | No reporting schema change | **PASS** |
| Financial Shift tables | Empty preserved; no Shift DDL | **PASS** |
| CRMP registers | Empty 0→0; schema additive | **PASS** |
| Settlement Context / Attribution | Domain tests PASS; fail-open preserved | **PASS** |

**Ownership unchanged. Financial calculations unchanged.**

### Data preservation

| Table | Pre | Post | Delta |
|-------|----:|-----:|------:|
| `crmp_registers` | 0 | 0 | 0 |
| `crmp_financial_shifts` | 0 | 0 | 0 |
| `crmp_drawer_movements` | 0 | 0 | 0 |
| `crmp_drawer_counts` | 0 | 0 | 0 |
| `crmp_shift_handovers` | 0 | 0 | 0 |
| `crmp_settlement_attributions` | 0 | 0 | 0 |
| `operational_checks` | 9 | 9 | 0 |
| `settlement_records` | 4 | 4 | 0 |
| `orders` | 9 | 9 | 0 |

---

## 8. Test Results

| Suite | Result |
|-------|--------|
| `shared/crmp` + `server/crmp` + attribution + governance | **106/106 PASS** |
| `pnpm db:verify-schema` | **PASS** |
| DB smoke | **PASS** — `APP_DB_SMOKE=OK` |
| Post `pnpm db:preflight` | **PASS** — all journal hashes in DB; zero pending |

---

## 9. Post-Migration Validation

| Check | Result |
|-------|--------|
| Migration journal (repo) | Ends at `0079_crmp_register_duty` |
| DB version / terminus | **0079** applied once (`id=5844102`) |
| Pending migrations | **None** |
| Unexpected schema drift | **None** |
| Failed / partial statements | **None** |
| Duplicate 0079 hash | **None** |

---

## 10. Production Readiness

| Area | Status |
|------|--------|
| Migration status | **0079 applied once** |
| Journal integrity | **Healthy / zero pending** |
| Database health | **Normal** (CRMP empty; platform counts stable) |
| Register Operations persistence | **Production-ready** (domain already certified) |
| API / UI | **Not deployed** — out of scope → CRMP-OPERATIONS-API-1 / REGISTER-OPERATIONS-UI-1 |

### Governance

Confirmed at terminus `0079_crmp_register_duty` (adopted in REGISTER-OPERATIONS-IMPLEMENTATION-1; see [`GOVERNANCE-ADOPTION.md`](./GOVERNANCE-ADOPTION.md)).

**Not modified during execute:** `drizzle/0079_crmp_register_duty.sql`, `drizzle/meta/_journal.json`, governance constants.

---

## 11. Final Certification

| Success criterion | Status |
|-------------------|--------|
| `0079_crmp_register_duty` applied successfully | **Met** |
| Production schema matches implementation | **Met** |
| ORM / DB validation succeeds | **Met** |
| No schema drift / no pending migrations | **Met** |
| No production regressions | **Met** |
| Register Operations implementation production-ready (persistence) | **Met** |
| No ownership / financial calculation changes | **Met** |
| No manual SQL / no governance bypass | **Met** |

### Verdict

**CRMP-PRODUCTION-MIGRATION-0079 — PRODUCTION MIGRATION CERTIFIED**

Production schema terminus is **`0079_crmp_register_duty`**. Register Duty persistence is available for successor programs. No API, UI, Reporting, or feature deployment was performed.
