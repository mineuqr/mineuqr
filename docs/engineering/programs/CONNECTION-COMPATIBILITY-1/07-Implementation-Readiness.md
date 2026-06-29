# CONNECTION-COMPATIBILITY-1 — Implementation Readiness

**Program:** CONNECTION-COMPATIBILITY-1 (Investigation Only)  
**Date:** 2026-06-29  
**Next program:** CONNECTION-COMPATIBILITY-2 (proposed fix)

---

## Investigation Status

| Deliverable | Status |
|-------------|--------|
| Connection flow traced | ✓ |
| Configuration compared | ✓ |
| Environment loading verified | ✓ |
| TLS behavior documented | ✓ |
| Root cause proven | ✓ |
| Canonical recommendation | ✓ |
| Code changes | **None** (per charter) |

---

## Fix Scope (Future)

| File | Change | Effort |
|------|--------|--------|
| `scripts/order-read-projection-staging.mjs` | Use `createAuditReadonlyConnection` | Low |
| `scripts/verify-schema-deployment.cjs` | Same | Low |
| `scripts/migration-preflight.cjs` | Same (optional) | Low |

**No changes required to:**

- `drizzle.config.ts` (already correct)
- `server/db.ts` (already correct)
- `DATABASE_URL` / `.env`
- Migration SQL
- Application logic

---

## Validation Plan (Post-fix)

```bash
pnpm db:migrate                    # regression — must still pass
pnpm db:order-read:verify-schema   # must pass
pnpm db:verify-schema              # must pass
pnpm db:order-read:discover        # must pass
npm run check
npm test
```

---

## Risk Assessment

| Risk | Level |
|------|-------|
| Fix breaks local non-TiDB dev | Low — TLS only applied for `*.tidbcloud.com` |
| Fix changes query behavior | None — connection only |
| Production impact | None — scripts are ops-only |

---

## Blocking Impact

| Program | Blocked action |
|---------|----------------|
| ORDERS-READ-MODEL-1 Phase 3A | `db:order-read:verify-schema`, `discover`, `validate` |
| Deploy verification | `db:verify-schema` |

Migrate and backfill execute paths using `drizzle.config.ts` / `order-read-backfill-execute.ts` (via `getDb()` → `createRuntimeMysqlPool`) are **not** blocked.

---

## Exit Verdict

**Investigation COMPLETE.** Root cause is proven and fix path is clear. Ready for CONNECTION-COMPATIBILITY-2 implementation (estimated: single-file import change + 2 sibling scripts).
