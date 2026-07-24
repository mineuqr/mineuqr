# CRMP-PRODUCTION-MIGRATION-0080

| Field | Value |
|---|---|
| **Program** | CRMP-PRODUCTION-MIGRATION-0080 |
| **Phase** | Production Database Migration Execution |
| **Date** | 2026-07-24 |
| **Migration** | `drizzle/0080_crmp_register_catalog.sql` |
| **References** | ADR-ARCH-028 · **030** · REGISTER-CATALOG-MANAGEMENT-1 · CRMP-PRODUCTION-MIGRATION-0079 |
| **Verdict** | **PRODUCTION MIGRATION CERTIFIED** |

---

## 1. Executive Summary

Production migration **`0080_crmp_register_catalog`** was applied successfully through the official pipeline (`pnpm db:migrate`). Register Catalog columns (`code`, `registerType`, `archivedAt`) and indexes (`crmp_registers_restaurant_code_unique`, `crmp_registers_restaurant_type`) were added. Existing CRMP and certified-platform row counts unchanged. No manual SQL, no journal SQL edits during execute, no governance bypass.

**New production migration terminus:** `0080_crmp_register_catalog`

---

## 2. Pre-flight Results

| Check | Result |
|-------|--------|
| Branch | `main` |
| HEAD commit | `5ddc871ddde1f5b7767e78069c847ef0d5354e14` (`feat(crmp): finalize register operations UI and UX`) |
| Working tree | **Dirty** — contains certified REGISTER-CATALOG-MANAGEMENT-1 artifacts (0080 SQL/journal/domain/API/UI). Accepted as execute package; no unrelated schema redesign. |
| Journal last tag | `0080_crmp_register_catalog` (idx 80, when `1784660000000`) |
| Governance terminus (pre-adopt) | was `0079`; **adopted to `0080`** before execute (see [`GOVERNANCE-ADOPTION.md`](./GOVERNANCE-ADOPTION.md)) |
| Last applied (pre) | **0079** hash `89f6ee18…34f6481a` id `5844102` |
| Pending (pre) | **0080 only** |
| Production DB reachable | **PASS** (preflight + probe) |
| Backup strategy | **TiDB Cloud continuous backup** (same control as 0077/0078/0079) |
| `pnpm db:governance-check` | **PASS** (post-adoption) |
| Migration audit | **APPROVED** — see [`MIGRATION-AUDIT.md`](./MIGRATION-AUDIT.md) |

---

## 3. Migration Audit

See [`MIGRATION-AUDIT.md`](./MIGRATION-AUDIT.md).

| Criterion | Status |
|-----------|--------|
| Additive / deterministic / backward compatible | **PASS** |
| No DROP / destructive SQL | **PASS** |
| Conditional code backfill only (null/empty → `R{id}`) | **PASS** (0 rows → no-op) |
| No ownership changes | **PASS** |

---

## 4. Execution Log

| Item | Value |
|------|-------|
| Version / tag | `0080_crmp_register_catalog` |
| Journal idx | `80` |
| Journal `when` | `1784660000000` |
| Checksum (SHA-256 of SQL file) | `9d93a2c23a8a84b19c146482bf33805474f4eb2ed5cb040b2853e7e08e414bae` |
| Applied DB hash | `9d93a2c23a8a84b19c146482bf33805474f4eb2ed5cb040b2853e7e08e414bae` (exact match, **once**) |
| `__drizzle_migrations` id | `5874102` |
| `__drizzle_migrations.created_at` | `1784660000000` (matches journal `when`) |
| Duration | **~6.2s** |
| Exit code | **0** — `migrations applied successfully!` |
| Warnings | None material |

### Environment

| Item | Value |
|------|-------|
| Target | Production TiDB Cloud |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Application feature deploy | **No** (out of scope) |
| Backup control | TiDB Cloud continuous backup |

### Commands

```bash
pnpm db:governance-check          # PASS (terminus 0080)
pnpm db:preflight                 # pending: 0080 only
# pre-probe: catalog columns/indexes absent; 0079 terminus
pnpm db:migrate                   # SUCCESS (0080 only)
# post-probe: catalog columns + indexes; hash applied once
pnpm db:preflight                 # zero pending
pnpm db:verify-schema             # OK
# ORM smoke: APP_DB_SMOKE=OK
```

---

## 5. Schema Verification

| Expectation | Pre | Post |
|-------------|-----|------|
| `code` | absent | `varchar(64) NOT NULL` |
| `registerType` | absent | `enum('settlement_station','counter','mobile_pos') NOT NULL DEFAULT 'counter'` |
| `archivedAt` | absent | `timestamp` NULL |
| Unique `crmp_registers_restaurant_code_unique` | absent | `(restaurantId, code)` UNIQUE |
| Index `crmp_registers_restaurant_type` | absent | `(restaurantId, registerType)` |
| Duty columns / index | present | unchanged |
| 0080 hash in `__drizzle_migrations` | absent | present once (`id=5874102`) |

| Check | Result |
|-------|--------|
| Schema matches migration definition | **PASS** |
| No unexpected tables created/dropped | **PASS** |
| No Check / Settlement Record / Reporting DDL | **PASS** |
| `pnpm db:verify-schema` | **PASS** |
| ORM/DB smoke (catalog columns selectable) | **PASS** — `APP_DB_SMOKE=OK` |

---

## 6. Application Validation

| Check | Result |
|-------|--------|
| DB smoke (registers / shifts / SR / checks) | **PASS** |
| Register Catalog domain + API tests | **PASS** |
| Register Ops / Financial Shift / Settlement Context / Attribution | **PASS** (CRMP suite) |
| Full production app redeploy | **Not performed** — out of scope |

No migration-induced missing-column risk for Register Catalog ORM paths.

---

## 7. Regression Results

| Platform | Evidence | Status |
|----------|----------|--------|
| Order | `orders` count 10 → 10; no DDL | **PASS** |
| Check | `operational_checks` 10 → 10 | **PASS** |
| Settlement Record | count 5 → 5 | **PASS** |
| Reporting | No reporting schema change | **PASS** |
| Financial Shift tables | Empty preserved; no Shift DDL | **PASS** |
| CRMP registers | Empty 0→0; schema additive | **PASS** |
| Duty plane | Columns/index preserved | **PASS** |
| Settlement Context / Attribution | Domain tests PASS | **PASS** |

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
| `operational_checks` | 10 | 10 | 0 |
| `settlement_records` | 5 | 5 | 0 |
| `orders` | 10 | 10 | 0 |

---

## 8. Test Results

| Suite | Result |
|-------|--------|
| Governance unit tests | **10/10 PASS** |
| `shared/crmp` + `server/crmp` (incl. catalog) | **133/133 PASS** |
| `pnpm db:verify-schema` | **PASS** |
| DB smoke | **PASS** — `APP_DB_SMOKE=OK` |
| Post `pnpm db:preflight` | **PASS** — all journal hashes in DB; zero pending |

Production write smoke (create/activate on live data): **not performed** — same production-safe policy as 0079; covered by in-memory domain/API suites.

---

## 9. Post-Migration Validation

| Check | Result |
|-------|--------|
| Migration journal (repo) | Ends at `0080_crmp_register_catalog` |
| DB version / terminus | **0080** applied once (`id=5874102`) |
| Pending migrations | **None** |
| Unexpected schema drift | **None** |
| Failed / partial statements | **None** |
| Duplicate 0080 hash | **None** |

---

## 10. Production Readiness

| Area | Status |
|------|--------|
| Migration status | **0080 applied once** |
| Journal integrity | **Healthy / zero pending** |
| Database health | **Normal** (CRMP empty; platform counts stable) |
| Register Catalog persistence | **Production-ready** (domain already certified) |
| API / UI feature deploy | **Not redeployed by this program** — out of scope |

### Governance

Terminus adopted to `0080_crmp_register_catalog` (count 81). See [`GOVERNANCE-ADOPTION.md`](./GOVERNANCE-ADOPTION.md).

**Not modified during execute:** `drizzle/0080_crmp_register_catalog.sql`, journal 0080 entry payload.

---

## 11. Final Certification

| Success criterion | Status |
|-------------------|--------|
| `0080_crmp_register_catalog` applied successfully | **Met** |
| Production schema matches implementation | **Met** |
| ORM / DB validation succeeds | **Met** |
| No schema drift / no pending migrations | **Met** |
| No production regressions | **Met** |
| Register Catalog persistence production-ready | **Met** |
| No ownership / financial calculation changes | **Met** |
| No manual SQL / no governance bypass | **Met** |

### Verdict

**CRMP-PRODUCTION-MIGRATION-0080 — PRODUCTION MIGRATION CERTIFIED**

Production schema terminus is **`0080_crmp_register_catalog`**. Register Catalog persistence is available. No API, UI, Reporting, or feature deployment was performed by this program.
