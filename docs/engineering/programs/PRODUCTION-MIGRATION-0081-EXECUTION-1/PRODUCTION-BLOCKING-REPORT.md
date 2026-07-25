# PRODUCTION-MIGRATION-0081-EXECUTION-1 — Production Blocking Report

| Field | Value |
|---|---|
| **Program** | PRODUCTION-MIGRATION-0081-EXECUTION-1 |
| **Phase** | Pre-Migration Preconditions / Pre-Migration Audit |
| **Date** | 2026-07-25 |
| **Migration** | `drizzle/0081_crmp_financial_shift_number.sql` |
| **Target** | Production TiDB Cloud |
| **Verdict** | **BLOCKED — MIGRATION NOT EXECUTED** |

---

## 1. Executive Summary

Production execution of **`0081_crmp_financial_shift_number`** was **stopped before `pnpm db:migrate`**. Official MineuQR migration governance refuses to proceed while `0081` SQL exists on disk but is **not journalized**, and the certified governance terminus remains **`0080_crmp_register_catalog`**.

No DDL was applied. Production schema for Financial Shifts is unchanged. Settlement, Reporting, and register ownership were not touched.

---

## 2. Migration Status

| Item | Status |
|------|--------|
| `pnpm db:migrate` | **NOT RUN** |
| `0081` applied to Production | **NO** |
| Production terminus | Still **`0080_crmp_register_catalog`** |
| Manual SQL / schema edits | **NONE** |

---

## 3. Stop Conditions Triggered

| # | Stop condition | Result | Evidence |
|---|----------------|--------|----------|
| 1 | Migration journal mismatch | **STOP** | `drizzle/meta/_journal.json` ends at idx 80 / `0080_crmp_register_catalog`. Tag `0081_crmp_financial_shift_number` **absent**. |
| 2 | Governance / preflight failure | **STOP** | `pnpm db:governance-check` **FAIL** — non-legacy SQL outside journal: `0081_crmp_financial_shift_number`. `pnpm db:preflight` **BLOCKED**. |
| 3 | Production app version supports 0081 | **STOP** | App / schema support for `shiftNumber` exists only in **local dirty working tree**, not as a committed/deployed production release on `origin/main`. HEAD = `64d9c9d` (DRAP). `0081` SQL is **untracked**. |
| 4 | Backup missing | **Not independently re-verified in this run** | Same TiDB Cloud continuous backup control as 0077–0080 is assumed; not used as sole blocker. |
| 5 | Migration previously applied | **PASS (safe)** | Probe: `hash0081Applied: []`; `shiftNumber` absent; sequences table absent. |
| 6 | Database reachable / journal hashes recorded | **PASS (partial)** | Preflight reached DB; all journal migration hashes recorded. Extra historical `__drizzle_migrations` rows vs journal count (expected bootstrap residue). |

**Rule applied:** any hard STOP → do not execute → produce this blocking report.

---

## 4. Phase 1 — Pre-Migration Audit (read-only)

Probe: `docs/engineering/programs/PRODUCTION-MIGRATION-0081-EXECUTION-1/_preflight-probe.mjs pre`  
SQL SHA-256: `31357aa8e32408a4db7bde9ed786bae13e616adc56f13cc68e9bcffd6cd76789`

### 4.1 Current schema / journal

| Check | Finding |
|-------|---------|
| Journal entries | **81** (tags `0000`…`0080`) |
| Last journal tag | `0080_crmp_register_catalog` |
| Governance terminus (`CANONICAL_MIGRATION_TAIL_TAG`) | `0080_crmp_register_catalog` |
| Last applied DB migration | hash `9d93a2c23a8a84b19c146482bf33805474f4eb2ed5cb040b2853e7e08e414bae` (0080), id `5874102`, `created_at` `1784660000000` |
| Pending via official pipeline | **None that can be applied** — 0081 is orphan SQL, not pending journal |

### 4.2 `crmp_financial_shifts`

| Expectation for 0081 | Pre state |
|----------------------|-----------|
| Column `shiftNumber` | **Absent** |
| Unique `(restaurantId, registerId, shiftNumber)` | **Absent** |
| Index `crmp_financial_shifts_restaurant_closed` | **Absent** |
| Index `crmp_financial_shifts_restaurant_status_closed` | **Absent** |
| Table `crmp_register_shift_sequences` | **Absent** |
| Soft-archive columns (`archivedAt`, status enum incl. `archived`) | **Present** (0078) |

### 4.3 Data integrity (pre)

| Metric | Value |
|--------|-------|
| Financial shift row count | **2** |
| Null/empty `financialShiftId` | **0** |
| Duplicate `financialShiftId` | **0** |
| Orphan shifts vs `crmp_registers` (tenant+register) | **0** |

UUID integrity and register linkage are healthy for the existing population. No orphan records detected in the audited join.

---

## 5. Phases 2–6 — Not Executed

| Phase | Status |
|-------|--------|
| 2 Execution (`pnpm db:migrate` / 0081 only) | **SKIPPED — STOP** |
| 3 Data validation | **SKIPPED** |
| 4 Application validation | **SKIPPED** |
| 5 Reporting validation | **SKIPPED** |
| 6 Performance validation | **SKIPPED** |

---

## 6. Rollback Readiness (standby — unused)

No production change was made; rollback is **N/A**.

If a future certified execute applies 0081 and fails mid-way, recovery remains:

| Scenario | Recovery |
|----------|----------|
| Migrate fails before commit of full SQL batch | Re-run only after forensic check; do not hand-edit schema |
| Partial DDL visible without journal hash | Restore from TiDB Cloud backup / support-guided repair; never invent compensatory DDL in prod |
| Successful apply then app defect | Prefer forward fix; column/table drop is last-resort and out of band for this program |

---

## 7. Required Unblock Path (outside this program’s “no code changes” scope)

Mirror **CRMP-PRODUCTION-MIGRATION-0080 / GOVERNANCE-ADOPTION**, then re-run this execution program:

1. **Governance adoption for 0081**
   - Journalize `0081_crmp_financial_shift_number` in `drizzle/meta/_journal.json` (idx 81)
   - Advance `CANONICAL_MIGRATION_TAIL_TAG` → `0081_crmp_financial_shift_number`
   - Update governance guard strings + `migrationGovernance.test.ts` expectations
   - `pnpm db:governance-check` must **PASS**
2. **Ship / confirm production application** that supports `shiftNumber` (FINANCIAL-SHIFT-RETENTION-ADOPTION-1) **before or atomically with** migrate, per product release policy
3. Re-run **PRODUCTION-MIGRATION-0081-EXECUTION-1**:
   - `pnpm db:preflight` → pending **0081 only**
   - Confirm backup control
   - `pnpm db:migrate`
   - Post-probe + `pnpm db:verify-schema` + runtime/reporting checks
   - Issue **Production Migration Certification** (not this blocking report)

**This execution program did not perform governance adoption or application deploy** (explicit: no implementation / no code changes / database migration only).

---

## 8. Production Readiness

| Criterion | Status |
|-----------|--------|
| Safe to run `pnpm db:migrate` now | **NO** |
| Human Shift Number available in Production | **NO** |
| UUID / existing shifts preserved | **YES** (untouched) |
| Reporting / Settlement regressions from this run | **NONE** (no execute) |
| Production healthy relative to prior terminus 0080 | **YES** (unchanged) |

---

## 9. Final Certification

**NOT CERTIFIED FOR PRODUCTION MIGRATION.**

**Certification type:** Production Blocking Report  
**Authority decision:** **STOP — DO NOT EXECUTE**  
**Next authorized action:** Complete Governance Adoption + production app readiness for 0081, then restart PRODUCTION-MIGRATION-0081-EXECUTION-1 from Phase 1.
