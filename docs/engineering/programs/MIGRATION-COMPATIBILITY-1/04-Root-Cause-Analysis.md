# MIGRATION-COMPATIBILITY-1 — Root Cause Analysis

**Program:** MIGRATION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Verdict:** PROVEN — migration packaging defect, not TiDB DDL incompatibility

---

## Question 1: Why does 0046 fail?

**Root cause:** `0046_order_read_projections.sql` contains **7 `CREATE TABLE` statements** in a single file **without** Drizzle `--> statement-breakpoint` delimiters.

**Causal chain:**

```
0046 authored manually (Phase 2)
  → no statement-breakpoint markers
    → readMigrationFiles() produces migration.sql = [ entire_file ]
      → MySqlDialect.migrate() calls tx.execute() once for 0046
        → mysql2 sends one COM_QUERY with 7 semicolon-separated statements
          → multipleStatements defaults to false (CLIENT_MULTI_STATEMENTS unset)
            → TiDB rejects: "client has multi-statement capability disabled"
```

**Evidence:**

| Evidence | Source |
|----------|--------|
| Split logic uses breakpoints only | `drizzle-orm/migrator.js:16` |
| 0046: `parts=1, creates=7, hasBP=false` | Journal migration scan |
| 0044/0045: `parts=1, creates=1` | Same scan — single statement, no conflict |
| All other multi-DDL migrations: `hasBP=true` | Journal migration scan |
| Error message matches TiDB 8130 | TiDB docs + server source |

---

## Question 2: Why did previous migrations succeed?

**Because every previously applied journal migration either:**

1. **Contains only one SQL statement per file** (e.g. 0044, 0045, 0040–0042), OR
2. **Uses `--> statement-breakpoint`** between statements so drizzle executes one statement per `execute()` (e.g. 0000, 0014, 0030, 0043)

0044 and 0045 appear structurally similar to 0046 (no breakpoints) but differ critically in **statement count**:

| Migration | Statements per `execute()` |
|-----------|-------------------------|
| 0044 | 1 |
| 0045 | 1 |
| 0046 | **7** |

The absence of breakpoints is harmless for single-statement files and fatal for multi-statement files.

---

## Question 3: What is NOT the root cause?

| Ruled out | Evidence |
|-----------|----------|
| TiDB rejects `order_read_*` DDL syntax | Error is 8130 multi-statement, not syntax/DDL error |
| drizzle.config.ts TLS misconfiguration | Earlier migrations applied; same config |
| Repository missing `multipleStatements` regression | Default was always false; prior migrations never needed it |
| Journal not listing 0046 | Journal entry exists; failure is at execution not discovery |
| Transaction wrapping | Transaction applies; failure is on first statement batch |
| Print table absence | Unrelated; 0030/0043 used breakpoints correctly |

---

## Contributing Factors (Not Root Cause)

| Factor | Role |
|--------|------|
| Manual migration authoring outside `drizzle-kit generate` | Allowed missing breakpoints |
| Phase 3A journal entry without packaging review | Migration merged without breakpoint audit |
| No CI check for `creates > 1 && !hasBP` | Gap in migration governance |

---

## Architecturally Correct Permanent Solution

**Repackage migration 0046** to comply with Drizzle + TiDB execution model:

### Option A (Preferred): Add statement breakpoints

Insert `--> statement-breakpoint` between each `CREATE TABLE` in 0046 (matching drizzle-kit generate output). Each segment executes as a separate `execute()`.

### Option B: Split into multiple journal migrations

`0046a` … `0046g` — one `CREATE TABLE` per migration file. Aligns with "one DDL per migration" policy.

### Option C (Not recommended): Enable `multipleStatements: true`

In drizzle-kit migrate connection only. Rejected because:

- Broadens SQL injection surface
- Fights TiDB security defaults
- Masks future packaging errors
- Not Drizzle's intended MySQL migration path

---

## Confidence

**HIGH** — Reproducible from source code inspection and journal-wide migration audit. No code changes were required to prove the chain.
