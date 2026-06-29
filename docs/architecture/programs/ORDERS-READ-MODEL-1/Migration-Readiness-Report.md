# ORDERS-READ-MODEL-1 — Phase 1 Migration Readiness Report

**Program:** ORDERS-READ-MODEL-1  
**Reference:** READ-ARCHITECTURE-1 RA-08  
**Date:** 2026-06-29

---

## Current Production State (Unchanged)

```
Dashboard / OrdersTab
    → order.list (tRPC)
    → getOrdersWithItemsByRestaurant (db.ts)
    → orders + order_items (write tables)

Client KPIs → buildOrderStatistics (ADR-ARCH-006 / ADR-ARCH-009 violation — unchanged)
```

Write path remains certified:

```
Order Aggregate → Application Services → Outbox → Relay → Publisher
    → OrderEventConsumerRegistry → Integration Consumers only
```

---

## Phase 1 Deliverables (Complete)

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Read module structure | ✓ | `server/order/read/` |
| Query contracts (Q-01–Q-08) | ✓ | Types only |
| Projection catalog (P-01–P-12) | ✓ | Lifecycle registry |
| Repository interfaces | ✓ | No Drizzle implementations |
| Projection consumer registry | ✓ | Empty registration |
| Composite dispatch delegate | ✓ | Not wired to publisher |
| Idempotency store adapter | ✓ | Reuses `order_domain_consumer_processed` |
| Observability taxonomy | ✓ | Three ops events |
| Feature flag | ✓ | `ORDER_READ_PROJECTIONS_ENABLED=false` default |

---

## Migration Gates

### Gate 0 — Architecture Approval

| Item | Status |
|------|--------|
| READ-ARCHITECTURE-1 design complete | ✓ |
| Phase 1 foundation implemented | ✓ |
| ADR-ARCH-015 ratification | Pending Authority |

### Gate 1 — Phase 2 (Next)

Per RA-08, Phase 2 requires:

1. **Projection store schema** — Drizzle tables for P-01, P-02, P-03, P-04, P-06, P-10, P-11
2. **Materializing consumers** — Register in `orderProjectionConsumerRegistry`
3. **Publisher wiring** — Switch `orderEventPublisher` to `createOrderEventDispatchDelegate()` when flag enabled
4. **Backfill job** — Historical orders → projection rows
5. **Drizzle repository implementations** — Against projection store

**Readiness:** NOT STARTED — foundation only in Phase 1.

### Gate 2 — Shadow Read APIs

- Implement Q-01, Q-03, Q-05, Q-08 read services behind new tRPC procedures
- Shadow comparison telemetry (legacy vs projection reads)
- Dashboard still on `order.list`

**Readiness:** BLOCKED on Phase 2 projection population.

### Gate 3 — UI Cutover (ORDERS-WORKSPACE-1)

- Replace `order.list` with Q-01
- Remove `buildOrderStatistics`
- Prerequisite: shadow divergence below threshold

**Readiness:** BLOCKED — ORDERS-WORKSPACE-1 investigation verdict NOT READY.

---

## Backward Compatibility Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Event publisher | None | Publisher unchanged |
| Integration consumers | None | Separate registry |
| `order.list` | None | No router changes |
| Dashboard | None | No client changes |
| Database schema | None | No new tables in Phase 1 |
| Env vars | Low | New optional `ORDER_READ_PROJECTIONS_ENABLED`; default off |

---

## Enablement Path (Phase 2+)

1. Deploy projection store migration
2. Register projection consumers in `registerOrderProjectionConsumers()`
3. Run backfill for existing restaurants
4. Set `ORDER_READ_PROJECTIONS_ENABLED=true` in staging
5. Update `eventInfrastructureComposition.ts` to use `createOrderEventDispatchDelegate()`
6. Verify projection row counts and consumer idempotency
7. Introduce shadow read APIs

---

## Verdict

**Phase 1 migration readiness: FOUNDATION COMPLETE**

Production migration has **not begun**. The platform is ready to start Phase 2 (projection store + materialization) once Architecture Authority approves READ-ARCHITECTURE-1 / ADR-ARCH-015 and authorizes Phase 2 implementation.
