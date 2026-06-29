# MIGRATION-COMPATIBILITY-1 — Architecture Risks

**Program:** MIGRATION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29

---

## Immediate Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **ORDERS-READ-MODEL-1 blocked** | HIGH | 0046 cannot apply; no `order_read_*` tables; Phase 3A staging blocked |
| **Partial migration state** | LOW | Transaction wraps migration; 0046 fails atomically — no partial 0046 tables |
| **Journal/DB drift** | MEDIUM | 0046 in journal but not applied; `db:migrate` retries 0046 on each run |

---

## Process Risks

| Risk | Severity | Mitigation (recommended) |
|------|----------|--------------------------|
| Manual SQL bypasses drizzle-kit | HIGH | Policy: generate-only; review hand-written SQL |
| No breakpoint CI gate | MEDIUM | Add journal packaging audit to CI |
| Phase 2 migration not validated on TiDB before journal merge | HIGH | Require staging migrate in program gate |
| Assumption "no breakpoints = OK" | HIGH | Document: breakpoints required when statements > 1 |

---

## Technical Debt Risks

| Risk | Impact |
|------|--------|
| Enabling `multipleStatements: true` as quick fix | Masks packaging errors; expands injection surface |
| `SET GLOBAL tidb_multi_statement_mode=ON` on Cloud | Platform policy conflict; shared security risk |
| Manual SQL apply outside journal | Breaks `__drizzle_migrations` tracking |
| Splitting 0046 without journal update | Orphan hash mismatch on future migrates |

---

## Downstream Program Impact

| Program | Impact while 0046 blocked |
|---------|---------------------------|
| ORDERS-READ-MODEL-1 Phase 3A | Backfill cannot persist to Drizzle |
| Shadow read APIs (Phase 3B) | Blocked on projection store |
| `pnpm db:order-read:*` staging scripts | `--verify-schema` fails (tables missing) |

---

## False Fix Risks

| Proposed "fix" | Why risky |
|----------------|-----------|
| Increase test timeout only | N/A — not applicable; wrong problem class |
| Apply 0046 via mysql CLI manually | Journal won't record; repeat failures on migrate |
| `db:push` instead of migrate | Different code path; production drift risk |

---

## Security Risks

| Vector | Assessment |
|--------|------------|
| Multi-statement enablement | HIGH risk if applied to runtime pool |
| TiDB 8130 enforcement | Correct behavior — do not weaken |
| Migration SQL injection | Low — migrations are trusted; breakpoints don't change trust model |

---

## Risk Summary

The highest risk is **continuing to hand-author multi-statement migrations** without Drizzle packaging conventions. The failure is predictable and will recur on every TiDB deployment until migration structure is corrected.
