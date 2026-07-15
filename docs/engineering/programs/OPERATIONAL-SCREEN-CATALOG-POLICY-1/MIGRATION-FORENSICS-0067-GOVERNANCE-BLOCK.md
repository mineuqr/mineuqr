# Migration 0067 — Governance Block Forensics

**Program:** OPERATIONAL-SCREEN-CATALOG-POLICY-1  
**Date:** 2026-07-15  
**Gate:** `pnpm db:governance-check`  
**Result:** **BLOCKED** — certification sequence stopped at Gate 1  

---

## Evidence

```
Journal entries: 67
Last journal tag: 0066_order_business_identity_scope

✗ FAIL — non-legacy SQL files outside journal:
  - 0067_operational_device_waiter_display
  Fix: drizzle-kit generate after schema.ts changes, or journalize existing SQL.

[governance-guard] BLOCKED — resolve violations before deploy.
```

---

## Root cause

| Fact | Evidence |
|------|----------|
| SQL file exists on disk | `drizzle/0067_operational_device_waiter_display.sql` |
| Not in journal | `drizzle/meta/_journal.json` ends at `0066_order_business_identity_scope` (idx 66) |
| Canonical terminus still 0066 | `scripts/lib/migration-governance-lib.cjs` → `CANONICAL_MIGRATION_TAIL_TAG` / count **67** |
| Anti-pattern | `docs/DB_MIGRATION_GOVERNANCE.md` §5 — hand-written `.sql` without journal entry |

`schema.ts` already declares `waiter_display`. SQL was authored for the catalog program but was **not** journalized, so it is invisible to governed `drizzle-kit migrate` and fails the governance guard.

---

## What was NOT done (policy)

- No manual SQL against the database for certification
- No journal history rewrite of `0000`–`0066`
- No hash repair / `__drizzle_migrations` surgery
- No governance bypass

---

## Required remediation (official only)

Per guard + `DB_MIGRATION_GOVERNANCE.md` §2.C / orphan anti-pattern fix:

1. **Journalize** `0067_operational_device_waiter_display` into `_journal.json` (append idx 67).  
2. Advance canonical terminus to `0067_operational_device_waiter_display` (count **68**) in governance lib + guard tests.  
3. Extend `db:verify-schema` to assert `waiter_display` on `operational_devices.role`.  
4. Re-run certification sequence: governance → preflight → migrate → preflight → verify-schema → integrity → tests → build → certification report.

This is **lineage extension**, not migration-history modification.
