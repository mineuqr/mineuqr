# MIGRATION-COMPATIBILITY-1 — Implementation Readiness

**Program:** MIGRATION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Next program:** Migration fix (out of scope for this investigation)

---

## Investigation Complete

| Deliverable | Status |
|-------------|--------|
| Root cause proven | ✓ |
| TiDB behavior documented | ✓ |
| drizzle-kit flow documented | ✓ |
| 0044/0045/0046 compared | ✓ |
| Canonical policy drafted | ✓ |
| Code changes | **None** (per program charter) |

---

## Fix Readiness

### Required fix (migration packaging only)

Repackage `0046_order_read_projections.sql` using one of:

| Option | Effort | Risk |
|--------|--------|------|
| **A: Add `--> statement-breakpoint` between 7 CREATE TABLEs** | Low | Low — matches drizzle-kit output |
| **B: Split into 0046a–0046g (one table each)** | Medium | Low — clearest rollback |
| **C: Regenerate via `drizzle-kit generate`** | Medium | Medium — may produce diff vs hand schema |

**Recommended:** Option A or B. **Reject:** Option C from investigation — enabling `multipleStatements`.

### Pre-fix validation

```bash
# After fix, local audit:
node -e "
const fs=require('fs');
const sql=fs.readFileSync('drizzle/0046_order_read_projections.sql','utf8');
const parts=sql.split('--> statement-breakpoint');
const creates=(sql.match(/^CREATE TABLE/gm)||[]).length;
console.log({parts:parts.length, creates, ok: parts.length>=creates});
"
# Expected: parts >= 7, creates = 7, ok = true
```

### Staging validation sequence (post-fix)

```bash
DATABASE_URL='<staging-tls>' pnpm db:preflight
DATABASE_URL='<staging-tls>' pnpm db:migrate
DATABASE_URL='<staging-tls>' pnpm db:order-read:verify-schema
```

---

## What Does NOT Need Changing

| Component | Reason |
|-----------|--------|
| `drizzle.config.ts` | Correct; should not add `multipleStatements` |
| `server/db.ts` pool config | Runtime pool unrelated to migration failure |
| TiDB server settings | Platform policy; not app concern |
| Production application code | No DDL involvement |
| `ORDER_READ_PROJECTIONS_ENABLED` | Unrelated to migration apply |

---

## Gate Checklist for Fix Program

- [ ] Repackage 0046 with statement breakpoints OR split migrations
- [ ] Update journal if split into multiple files
- [ ] Recompute hash integrity (drizzle handles on migrate)
- [ ] Run journal packaging audit (no `creates>1 && !hasBP`)
- [ ] Apply on staging TiDB Cloud
- [ ] Verify 7 tables via `db:order-read:verify-schema`
- [ ] Resume ORDERS-READ-MODEL-1 Phase 3A backfill

---

## CI Recommendation (Future)

Add to `scripts/migration-preflight.cjs` or new `journal-packaging-audit.mjs`:

```
WARN/FAIL: journal entry with multiple CREATE/ALTER/DROP and no statement-breakpoint
```

---

## Exit Verdict

**Investigation READY FOR FIX** — Root cause is unambiguous. Implementation is a **migration packaging correction only**. No architectural changes to application runtime required.

**Authority action:** Approve migration repackaging program to unblock ORDERS-READ-MODEL-1 Phase 3A.
