# THERMAL-PRINTING-13I.4D — Tier 1 Database Constraints

**Status:** Complete  
**Date:** 2026-06-26  
**Depends on:** THERMAL-PRINTING-13I.4C (investigation), THERMAL-PRINTING-13I.4A (runtime authority)

---

## 1. Pre-flight Audit Report

**Script:** `npm run db:audit:printing-integrity`  
**Executed:** 2026-06-26 against production TiDB (`mineuqr`)

| Check | Result |
|-------|--------|
| Duplicate `(restaurantId, profileId)` on `printers` | **0 rows** |
| Orphan `print_jobs.printerId` | **0 rows** |
| Orphan `print_jobs.orderId` | **0 rows** |
| Orphan `print_job_attempts.printJobId` | **0 rows** |
| Orphan `print_job_telemetry_events.printJobId` | **0 rows** |

**Table counts at audit time:**

| Table | Rows |
|-------|------|
| `printers` | 3 |
| `print_jobs` | 33 (5 with `printerId IS NULL`) |
| `print_job_attempts` | 9 |
| `print_job_telemetry_events` | 32 |

**Readiness:** **READY** — no violations. Migrations proceeded.

**Note:** `printerId IS NULL` on 5 jobs is valid; nullable FK columns skip referential checks in MySQL/TiDB.

---

## 2. Migration Plan

### Migration 0038 — Printer identity (`printers_restaurant_profile_unique`)

| Field | Value |
|-------|-------|
| **Purpose** | Prevent duplicate logical printer profile per restaurant |
| **Tables** | `printers` |
| **Change** | `UNIQUE (restaurantId, profileId)` |
| **Risk** | Low — audit found zero duplicates |
| **Rollback** | `DROP INDEX printers_restaurant_id_profile_id_unique ON printers` |
| **Production impact** | Printer provisioning fails fast on duplicate `profileId` within same restaurant |

### Migration 0039 — Print job → printer (`print_jobs_printer_fk`)

| Field | Value |
|-------|-------|
| **Purpose** | Ensure `print_jobs.printerId` references an existing printer row |
| **Tables** | `print_jobs` → `printers` |
| **Change** | `FOREIGN KEY (printerId) REFERENCES printers(id) RESTRICT` |
| **Risk** | Low — zero orphan refs; NULL `printerId` still allowed |
| **Rollback** | `ALTER TABLE print_jobs DROP FOREIGN KEY print_jobs_printer_id_fk` |
| **Production impact** | Cannot insert job with invalid `printerId`; cannot delete printer referenced by jobs |

**Explicitly excluded:** restaurant alignment CHECK/trigger (remains `tenantOwnershipAuthority`).

### Migration 0040 — Print job → order (`print_jobs_order_fk`)

| Field | Value |
|-------|-------|
| **Purpose** | Ensure every print job references a real order |
| **Tables** | `print_jobs` → `orders` |
| **Change** | `FOREIGN KEY (orderId) REFERENCES orders(id) RESTRICT` |
| **Risk** | Low — zero orphan refs |
| **Rollback** | `ALTER TABLE print_jobs DROP FOREIGN KEY print_jobs_order_id_fk` |
| **Production impact** | Cannot delete orders that have print jobs |

**Explicitly excluded:** `print_jobs.restaurantId = orders.restaurantId` comparison (runtime only).

### Migration 0041 — Attempts → job (`print_job_attempts_fk`)

| Field | Value |
|-------|-------|
| **Purpose** | Prevent orphan execution attempt rows |
| **Tables** | `print_job_attempts` → `print_jobs` |
| **Deletion policy** | **RESTRICT** — job cannot be deleted while attempts exist |
| **Rationale** | Attempts are audit evidence; CASCADE would silently destroy history |
| **Rollback** | `ALTER TABLE print_job_attempts DROP FOREIGN KEY print_job_attempts_print_job_id_fk` |

### Migration 0042 — Telemetry → job (`print_job_telemetry_fk`)

| Field | Value |
|-------|-------|
| **Purpose** | Prevent orphan telemetry rows |
| **Tables** | `print_job_telemetry_events` → `print_jobs` |
| **Deletion policy** | **RESTRICT** — job cannot be deleted while telemetry exists |
| **Rationale** | Operational timeline integrity; explicit purge workflow required |
| **Rollback** | `ALTER TABLE print_job_telemetry_events DROP FOREIGN KEY print_job_telemetry_events_print_job_id_fk` |

---

## 3. Implementation Summary

### Migrations (one logical change each)

| File | Constraint |
|------|------------|
| `drizzle/0038_printers_restaurant_profile_unique.sql` | UNIQUE `(restaurantId, profileId)` |
| `drizzle/0039_print_jobs_printer_fk.sql` | FK `printerId` → `printers.id` |
| `drizzle/0040_print_jobs_order_fk.sql` | FK `orderId` → `orders.id` |
| `drizzle/0041_print_job_attempts_fk.sql` | FK `printJobId` → `print_jobs.id` |
| `drizzle/0042_print_job_telemetry_fk.sql` | FK `printJobId` → `print_jobs.id` |

### ORM (`drizzle/schema.ts`)

- `uniqueIndex("printers_restaurant_id_profile_id_unique")` on `printers`
- `foreignKey` definitions on `print_jobs`, `print_job_attempts`, `print_job_telemetry_events`
- All FKs: `ON DELETE RESTRICT ON UPDATE RESTRICT`

### Tooling

| Script | Command |
|--------|---------|
| Pre-flight audit | `npm run db:audit:printing-integrity` |
| Post-migrate verify | `npm run db:verify:printing-tier1` |

### Tests

| File | Purpose |
|------|---------|
| `server/printing/printingDatabaseIntegrity.test.ts` | Live DB duplicate-profile rejection (opt-in: `RUN_PRINTING_DB_INTEGRITY_TESTS=1`) |
| Existing printing suite | Unchanged runtime behavior (mocked DB) |

### Journal

- `drizzle/meta/_journal.json` — entries 0038–0042

---

## 4. Validation Report

| Check | Result |
|-------|--------|
| `npm run db:migrate` | **Success** — all 5 migrations applied |
| `npm run db:verify:printing-tier1` | **Success** — all constraints present in `information_schema` |
| Pre-flight re-run post-migrate | **READY** — no violations |
| `tenantIsolationHardening.test.ts` | **8/8 pass** |
| `assignmentService.test.ts` | **4/4 pass** |
| `dispatchBridge.test.ts` | **11/11 pass** |
| `printJobService.test.ts` | **10/10 pass** |
| Runtime `tenantOwnershipAuthority` | **Unchanged** |
| Tier 2/3 / CHECK / triggers | **Not implemented** (out of scope) |

### Rollback verification

Rollback SQL is documented per migration file header. Rollback was **not executed on production** (would remove integrity guarantees). Each rollback is a single `DROP INDEX` or `DROP FOREIGN KEY` — independently reversible.

### Production readiness

**Approved for production** — pre-flight clean, migrations applied, constraints verified, printing tests pass, no runtime changes.

---

## 5. Deferred (future programs)

Per 13I.4C Tier 2+ — **not implemented in 13I.4D:**

- FK `print_stations` → `printers` / `restaurants`
- FK `restaurant_print_settings.defaultPrinterId` → `printers`
- FK `print_diagnostic_runs` → `printers`
- `NOT NULL` on `print_jobs.correlationId`
- Restaurant alignment CHECK constraints
- `agents` persistence table
- `ON DELETE CASCADE` job purge automation

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| All Tier 1 constraints evaluated | ✓ |
| Each migration independently deployable | ✓ (0038–0042) |
| Rollback documented per migration | ✓ |
| Printing tests pass | ✓ |
| Runtime tenant isolation unchanged | ✓ |
| No new architectural risks | ✓ (RESTRICT preserves audit data) |
