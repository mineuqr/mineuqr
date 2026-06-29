# ORDERS-READ-MODEL-1 — Backfill Validation Report (Phase 2)

**Program:** ORDERS-READ-MODEL-1 — Projection Materialization  
**Date:** 2026-06-29

---

## Backfill Service

**Implementation:** `server/order/read/infrastructure/backfill/OrderReadProjectionBackfillService.ts`  
**Composition:** `readPersistenceComposition.ts` → `orderReadProjectionBackfillService`  
**Run tracking:** `order_read_backfill_runs` table (`drizzle/0046_order_read_projections.sql`)

---

## Scope Support

| Scope | Behavior | Validated |
|-------|----------|-----------|
| **Full rebuild** | `scope: "full"` — all restaurants via `listRestaurantIds()` | ✓ Code path |
| **Tenant rebuild** | `scope: "tenant"` + `restaurantId` | ✓ Test |
| **Partial rebuild** | `scope: "partial"` + `fromDayKey` / `toDayKey` day filter | ✓ Test |
| **Safe retries** | Re-run completes without throw; `attemptCount` tracked | ✓ Test |

---

## Backfill Algorithm

1. Create run record (`status: running`) in `order_read_backfill_runs`
2. Emit `order_read_backfill_started` ops event
3. For each target restaurant:
   - Load order IDs from write tables (`DrizzleOrderReadContextLoader`)
   - Filter by partial day range when requested
   - `materializer.syncOrderProjections(orderId, backfill:{runId})` per order
   - `materializer.rebuildRollupsForRestaurant(restaurantId)` for P-06/P-10
4. Mark run `completed` or `failed`; emit ops event

---

## Idempotency & Restart Safety

| Property | Mechanism |
|----------|-----------|
| Order rows | Upsert on `(restaurantId, orderId)` |
| Timeline | Upsert on `(restaurantId, orderId, eventId)` |
| KPI / Analytics | Upsert on `(restaurantId, dayKey)`; rollup rebuild overwrites from source |
| Retry | New run ID per invocation; upserts are idempotent |

---

## Observability

| Ops Event | When |
|-----------|------|
| `order_read_backfill_started` | Run begins |
| `order_read_backfill_completed` | Run succeeds (`rowsProcessed` in metadata) |
| `order_read_backfill_failed` | Run throws (`lastError` persisted) |

---

## Test Evidence

**File:** `server/order/read/infrastructure/backfill/__tests__/OrderReadProjectionBackfillService.test.ts`

| Test | Assertion |
|------|-----------|
| Tenant rebuild | Materializes orders; `rowsProcessed > 0` |
| Partial rebuild | Day-range filter applied |
| Safe retries | Two consecutive runs complete without error |

---

## Operational Notes (Pre-Activation)

- Backfill is **not scheduled** in production — manual/ops invocation only
- Requires migration `0046` applied before Drizzle persist path is active
- In test env, repositories use in-memory store only (`NODE_ENV=test`)
- Live dispatch (event-driven materialization) remains off until `ORDER_READ_PROJECTIONS_ENABLED=true` and publisher wiring in Phase 3 gate

---

## Exit Verdict

**PASS** — Backfill supports full, tenant, and partial rebuild with safe retries and ops telemetry. Not activated in production runtime paths.
