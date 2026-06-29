# MIGRATION-COMPATIBILITY-2 — Updated Migration Readiness Report

**Program:** MIGRATION-COMPATIBILITY-2  
**Date:** 2026-06-29  
**Updates:** ORDERS-READ-MODEL-1 Migration Readiness (Gate 2)

---

## Blocker Resolution

| Blocker | Status |
|---------|--------|
| 0046 fails on TiDB (`multi-statement capability disabled`) | **RESOLVED** |
| `order_read_*` tables missing | **RESOLVED** — 7 tables created |
| `__drizzle_migrations` missing 0046 | **RESOLVED** |

---

## Migration Gate Status

### Gate 1 — Phase 2 Schema Deploy

| Item | Before | After |
|------|--------|-------|
| 0046 packaging | 7 statements, 0 breakpoints | 7 statements, 6 breakpoints |
| `pnpm db:migrate` on TiDB | FAIL | **PASS** |
| Projection tables | Missing | **Present** |

### Gate 2 — Phase 3A Staging Execution

| Item | Status |
|------|--------|
| Apply migration 0046 | ✓ Complete (TiDB Cloud) |
| Run backfill | **Ready** — ops scripts available |
| Integrity validation | **Ready** — `--validate` available |
| Enable projection dispatch | Deferred (Phase 3B) |

---

## ORDERS-READ-MODEL-1 — Unblocked Actions

Staging operators may now proceed with:

```bash
DATABASE_URL='<staging>' pnpm db:order-read:discover
DATABASE_URL='<staging>' ORDER_READ_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-backfill-execute.ts --scope tenant --restaurant-id <id>
DATABASE_URL='<staging>' pnpm db:order-read:validate
```

---

## Production Safety (Unchanged)

| Guard | Status |
|-------|--------|
| Application code | No changes |
| `ORDER_READ_PROJECTIONS_ENABLED` | false |
| Publisher wiring | Integration only |
| `order.list` / Dashboard | Unchanged |

---

## Canonical Migration Policy

MIGRATION-COMPATIBILITY-1 policy now enforced on 0046:

> Multi-statement migrations MUST use `--> statement-breakpoint` delimiters.

---

## Exit Verdict

**Migration readiness RESTORED** for ORDERS-READ-MODEL-1 Phase 3A staging backfill and validation.
