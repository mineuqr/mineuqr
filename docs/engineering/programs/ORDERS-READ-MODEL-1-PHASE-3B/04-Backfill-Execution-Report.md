# ORDERS-READ-MODEL-1 Phase 3B — Backfill Execution Report

**Date:** 2026-06-29  
**Target:** TiDB Cloud (`gateway01` / `mineuqr`)

---

## Execution

| Run | Command | Scope | Result | Rows |
|-----|---------|-------|--------|------|
| 1 (failed) | `pnpm db:order-read:backfill` | full | Failed — `lastEventId` too long (`backfill:uuid`) | 0 |
| 2 | `pnpm db:order-read:backfill` | full | **completed** | 206 |
| 3 (idempotency) | `pnpm db:order-read:backfill` | full | **completed** | 206 |

**Fix applied:** `OrderReadProjectionBackfillService` uses `runId` (36-char UUID) as `lastEventId` to fit `varchar(36)` schema.

**Fix applied:** `parseFlag()` in backfill script — safe CLI arg parsing when optional flags absent.

---

## Discover (Post-Backfill)

```
restaurants: 6
write orders: 206
projection orders: 206
backfill runs: completed=2, failed=1 (pre-fix attempt)
```

---

## Tooling

| Script | Purpose |
|--------|---------|
| `pnpm db:order-read:backfill` | Full backfill (`ORDER_READ_BACKFILL_CONFIRM=YES` embedded) |
| `scripts/order-read-backfill-execute.ts` | Existing backfill service entry point |
| `OrderReadProjectionBackfillService` | Reused — no new backfill implementation |

---

## Verdict

**Backfill SUCCEEDED.** All 206 production orders materialized into `order_read_*` tables.
