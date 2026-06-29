# ORDERS-READ-MODEL-1 — Phase 3A Telemetry Validation Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation  
**Date:** 2026-06-29

---

## Required Ops Events

### Backfill (active in Phase 3A)

| Event | When | Source |
|-------|------|--------|
| `order_read_backfill_started` | Run begins | `OrderReadProjectionBackfillService.run()` |
| `order_read_backfill_completed` | Run succeeds | Same |
| `order_read_backfill_failed` | Run throws | Same |

**Taxonomy:** `server/_core/opsTaxonomy.ts`  
**Category:** `ORDER`  
**Metadata:** `runId`, `scope`, `rowsProcessed` / `error`

### Projection consumers (inactive in Phase 3A)

| Event | When | Phase 3A |
|-------|------|----------|
| `order_projection_consumer_executed` | Consumer handles event | Not emitted (dispatch off) |
| `order_projection_consumer_failed` | Consumer error | Not emitted |
| `order_projection_consumer_skipped` | Idempotent skip | Not emitted |

---

## Validation Methods

### 1. Taxonomy check (local)

```bash
node scripts/order-read-projection-staging.mjs --verify-telemetry
```

Lists required event IDs; confirms taxonomy registration.

### 2. Unit test evidence

`OrderReadProjectionBackfillService.test.ts` stdout captures:

```
[OPS][ORDER][info] order_read_backfill_started { ... }
[OPS][ORDER][info] order_read_backfill_completed { ... }
```

### 3. Staging observation

During staging backfill, monitor application logs for `[OPS][ORDER]` entries with `order_read_backfill_*` types.

Query `order_read_backfill_runs` for run status as durable audit complement to ops logs.

---

## Staging Checklist

- [ ] `order_read_backfill_started` logged at run start
- [ ] `order_read_backfill_completed` logged with `rowsProcessed`
- [ ] Run row in `order_read_backfill_runs` with `status=completed`
- [ ] No `order_projection_consumer_*` events (dispatch inactive — expected)

---

## Verdict

Backfill telemetry is **implemented, taxonomy-registered, and unit-tested**. Consumer telemetry validated structurally; runtime emission deferred to Phase 3B dispatch activation.
