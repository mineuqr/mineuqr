# ORDERS-READ-MODEL-1 — Migration Readiness Report

**Program:** ORDERS-READ-MODEL-1  
**Reference:** READ-ARCHITECTURE-1 RA-08  
**Date:** 2026-06-29  
**Phase:** 2 complete — materialized, not activated

---

## Current Production State (Unchanged)

```
Dashboard / OrdersTab
    → order.list (tRPC)
    → getOrdersWithItemsByRestaurant (db.ts)
    → orders + order_items (write tables)

Client KPIs → buildOrderStatistics (ADR-ARCH-006 / ADR-ARCH-009 — unchanged)
```

Write path remains certified:

```
Order Aggregate → Application Services → Outbox → Relay → Publisher
    → OrderEventConsumerRegistry → Integration Consumers only
```

---

## Phase 2 Deliverables (Complete)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Projection store schema | ✓ | `drizzle/0046_order_read_projections.sql` |
| Drizzle schema types | ✓ | `drizzle/schema.ts` — 7 tables + backfill runs |
| In-memory repositories | ✓ | `InMemoryOrderReadProjectionStore` |
| Drizzle persist layer | ✓ | `DrizzleOrderReadProjectionStore` + decorator |
| Context loader | ✓ | `DrizzleOrderReadContextLoader` (write tables) |
| Materializers | ✓ | `OrderReadProjectionMaterializer` |
| Projection consumers (7) | ✓ | Registered on `orderProjectionConsumerRegistry` |
| Backfill service | ✓ | Full / tenant / partial + retry |
| Observability | ✓ | Backfill + consumer ops events |
| Feature flag | ✓ | `ORDER_READ_PROJECTIONS_ENABLED=false` default |
| Publisher wiring | ✗ Intentional | Still `orderEventConsumerRegistry` only |

---

## Migration Gates

### Gate 0 — Architecture Approval

| Item | Status |
|------|--------|
| READ-ARCHITECTURE-1 design complete | ✓ |
| Phase 1 foundation | ✓ |
| Phase 2 materialization | ✓ |
| ADR-ARCH-015 ratification | Pending Authority |

### Gate 1 — Phase 2 (Complete)

| Item | Status |
|------|--------|
| Projection store schema | ✓ |
| Materializing consumers registered | ✓ |
| Backfill job | ✓ |
| Drizzle persist implementations | ✓ (write path) |
| Publisher wiring | Deferred — flag off |
| Apply migration `0046` in staging | **Required before backfill in staging** |

### Gate 2 — Shadow Read APIs (Next)

- Implement Q-01, Q-03, Q-05, Q-08 read services behind new tRPC procedures
- Drizzle **read** repositories for query handlers
- Shadow comparison telemetry (legacy vs projection reads)
- Enable `ORDER_READ_PROJECTIONS_ENABLED` in staging only
- Switch publisher to `createOrderEventDispatchDelegate()` when flag enabled
- Dashboard still on `order.list`

**Readiness:** UNBLOCKED for Phase 3 planning — projection infrastructure ready; population via backfill + live dispatch pending gate approval.

### Gate 3 — UI Cutover (ORDERS-WORKSPACE-1)

- Replace `order.list` with Q-01
- Remove `buildOrderStatistics`
- Prerequisite: shadow divergence below threshold

**Readiness:** BLOCKED on Gate 2.

---

## Deployment Checklist (When Activating — Not Phase 2)

1. Apply `0046_order_read_projections.sql`
2. Run tenant backfill per restaurant (or full rebuild)
3. Set `ORDER_READ_PROJECTIONS_ENABLED=true` in staging
4. Wire `orderEventPublisher` to `createOrderEventDispatchDelegate()`
5. Monitor `order_projection_consumer_*` and `order_read_backfill_*` ops events
6. Shadow read APIs before UI cutover

---

## Risk Register (Phase 2)

| Risk | Mitigation |
|------|------------|
| Accidental dispatch activation | Flag default false; publisher composition unchanged |
| Empty projection store in prod | No read APIs exposed; legacy path active |
| Backfill load on write DB | Scoped tenant/partial rebuild; ops telemetry |
| KPI drift during dual-write | Shadow comparison planned Gate 2 |

---

## Exit Verdict

**Phase 2 READY** — Infrastructure materialized and tested. Production behavior unchanged. Proceed to Gate 2 (shadow read APIs + controlled activation) when approved.
