# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Migration Audit

**Date:** 2026-06-26

---

## Print Migration Sequence (Journal Order)

| # | Tag | Purpose | Breakpoints |
|---|-----|---------|-------------|
| 30 | `0030_print_infrastructure` | Core tables: printers, settings, jobs, attempts | ✓ 11 breakpoints |
| 31 | `0031_print_jobs_idempotency_unique` | Unique idempotency key | ✓ 1 |
| 32 | `0032_print_jobs_printing_status` | Add `printing` status enum value | ✗ single statement |
| 33 | `0033_print_stations` | Stations + category/job stationId | ✓ 5 |
| 34 | `0034_print_diagnostic_runs` | Diagnostic runs table | ✓ 4 |
| 35 | `0035_print_jobs_execution_state` | `assigned` status + agent columns | ✗ 2 statements, no breakpoint |
| 36 | `0036_print_jobs_dispatch_notification` | `dispatchNotifiedAt` + index | ✗ 2 statements, no breakpoint |
| 37 | `0037_print_job_operational_telemetry` | correlationId + telemetry table | ✗ 3 statements, no breakpoint |
| 38 | `0038_printers_restaurant_profile_unique` | Unique (restaurantId, profileId) | ✗ single statement |
| 39 | `0039_print_jobs_printer_fk` | FK printerId → printers | ✗ single statement |
| 40 | `0040_print_jobs_order_fk` | FK orderId → orders | ✗ single statement |
| 41 | `0041_print_job_attempts_fk` | FK attempts → jobs | ✗ single statement |
| 42 | `0042_print_job_telemetry_fk` | FK telemetry → jobs | ✗ single statement |
| 43 | `0043_print_purification` | DROP all print tables + categories.stationId | ✓ 11 breakpoints |

All entries present in `drizzle/meta/_journal.json`.

---

## Canonical Migration Policy Compliance

**Policy:** Multi-statement migrations must use `--> statement-breakpoint` markers for TiDB compatibility (per MIGRATION-COMPATIBILITY-1/2).

| Migration | Compliance | Risk |
|-----------|------------|------|
| 0030, 0031, 0033, 0034, 0043 | **Compliant** | Low |
| 0032, 0035, 0036, 0037 | **Non-compliant** (multi-statement, no breakpoints) | Historical — already applied on existing DBs |
| 0038–0042 | Single statement each | N/A |

**Assessment:** Non-compliant intermediate migrations are **historical debt** only. They cannot be safely rewritten without journal surgery. On databases that already applied them, risk is nil. Fresh TiDB apply from scratch could fail on 0035–0037 if those migrations were ever replayed — mitigated because 0043 drops everything and no fresh environment should depend on intermediate print schema.

---

## Migration Lifecycle

```
0030 CREATE infrastructure
  → 0031–0042 incremental hardening (idempotency, agent, FKs, telemetry)
    → 0043 DROP ALL (RESET-1 purification)
      → 0044+ unrelated (order read, auth, etc.)
```

**Net schema effect after full journal apply:** Zero print tables.

---

## Unused / Deprecated Migrations

| Migration | Status |
|-----------|--------|
| 0030–0042 | **Historically used** then **superseded by 0043** — retain for journal integrity |
| 0043 | **Active retirement** — required on all environments that had print tables |

**Do not remove** 0030–0043 from journal — breaks migration history and fresh-clone reproducibility.

---

## Documentation Drift

| Item | Drift |
|------|-------|
| 0038–0042 comments reference `scripts/preflight-printing-integrity-audit.ts` | Script **removed** — comment is stale |
| THERMAL-PRINTING-* program IDs in SQL headers | Historical — no active program |
| `MIGRATION-COMPATIBILITY-1` docs | Reference print migration apply history — accurate as historical record |

---

## Compatibility with Future PRINTING-1

| Concern | Assessment |
|---------|------------|
| Migration number availability | Next migrations after 0046 — **0047+** available for new print schema |
| Name collision | Old table names (`print_jobs`, `printers`) **free** after 0043 drop |
| Re-using dropped schema | **Needs Verification** — PRINTING-1 should design fresh schema per RA-08; avoid blind revival of 0030–0042 shape without ADR review |
| Journal gap | None — continuous 0030→0043 block |

---

## Migration Audit Verdict

| Criterion | Status |
|-----------|--------|
| Migration order correct | ✓ |
| Purification migration present | ✓ |
| Schema/code alignment | ✓ (no print tables in schema.ts) |
| Breakpoint gaps | ⚠ Historical only (0035–0037) |
| Safe to delete migrations | ✗ — journal immutability |
