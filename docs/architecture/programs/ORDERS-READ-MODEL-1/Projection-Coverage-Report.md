# ORDERS-READ-MODEL-1 — Projection Coverage Report (Phase 2)

**Program:** ORDERS-READ-MODEL-1 — Projection Materialization  
**Date:** 2026-06-29

---

## Summary

| Metric | Value |
|--------|-------|
| Projections in catalog (P-01–P-12) | 12 |
| Projections materialized in Phase 2 | 7 |
| Consumers registered | 7 |
| Drizzle tables added | 7 (+ `order_read_backfill_runs`) |
| Lifecycle state for materialized projections | `materializing` |

---

## Per-Projection Coverage

### P-01 — Owner Orders

| Aspect | Coverage |
|--------|----------|
| Schema | `order_read_orders`, `order_read_order_line_items` |
| Repository | `OwnerOrdersProjectionRepository` (in-memory + Drizzle persist) |
| Materializer | `syncOrderProjections()` |
| Consumer | `OwnerOrdersProjectionConsumer` |
| Events | OrderCreated, OrderStatusChanged, OrderReady, OrderCompleted, OrderCancelled |
| Tests | `InMemoryOrderReadProjectionStore.test.ts`, materializer integration |

### P-02 — Active Orders

| Aspect | Coverage |
|--------|----------|
| Schema | `order_read_orders.isActive` |
| Repository | `ActiveOrdersProjectionRepository` (view over P-01 store) |
| Materializer | `syncOrderProjections()` + `isActiveOrderStatus` |
| Consumer | `ActiveOrdersProjectionConsumer` |
| Query contract | Q-01 binding (handler not implemented) |

### P-03 — Order Details

| Aspect | Coverage |
|--------|----------|
| Schema | Shared `order_read_orders` + line items |
| Repository | `OrderDetailsProjectionRepository` |
| Materializer | `syncOrderProjections()` |
| Consumer | `OrderDetailsProjectionConsumer` |
| Query contract | Q-03 binding (handler not implemented) |

### P-04 — Order Timeline

| Aspect | Coverage |
|--------|----------|
| Schema | `order_read_order_timeline` |
| Repository | `OrderTimelineProjectionRepository` |
| Materializer | `appendTimeline()` |
| Consumer | `OrderTimelineProjectionConsumer` |
| Idempotency | PK `(restaurantId, orderId, eventId)` |

### P-06 — Operational KPI

| Aspect | Coverage |
|--------|----------|
| Schema | `order_read_operational_kpi_daily` |
| Repository | `OperationalKpiProjectionRepository` |
| Materializer | `adjustOperationalKpi()`, `rebuildRollupsForRestaurant()` |
| Consumer | `OperationalKpiProjectionConsumer` |
| Events | OrderCreated, OrderStatusChanged, OrderCompleted, OrderCancelled |

### P-10 — Analytics

| Aspect | Coverage |
|--------|----------|
| Schema | `order_read_analytics_daily` |
| Repository | `OrderAnalyticsProjectionRepository` |
| Materializer | `adjustAnalytics()`, rollup rebuild |
| Consumer | `OrderAnalyticsProjectionConsumer` |
| Events | OrderCreated, OrderCompleted |

### P-11 — Public Order Status

| Aspect | Coverage |
|--------|----------|
| Schema | `order_read_public_order_status` |
| Repository | `PublicOrderStatusProjectionRepository` |
| Materializer | `syncOrderProjections()` (tracking token path) |
| Consumer | `PublicOrderStatusProjectionConsumer` |
| Tenant key | `(trackingToken, restaurantSlug)` |

---

## Deferred Projections (Phase 2 Out of Scope)

| ID | Reason |
|----|--------|
| P-05 | Owned by `server/ops`; already `queryable` |
| P-07, P-08 | Kitchen/print modules — `defined` only per RA-02 |
| P-09 | Session orders — not in Phase 2 scope |
| P-12 | Search index — Phase 3+ |

---

## Event → Projection Matrix

| Event | P-01 | P-02 | P-03 | P-04 | P-06 | P-10 | P-11 |
|-------|------|------|------|------|------|------|------|
| OrderCreated | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OrderStatusChanged | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| OrderReady | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| OrderCompleted | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OrderCancelled | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |

---

## Gaps (Intentional — Phase 3+)

- No Drizzle **read** repository implementations for query handlers (write/persist path only)
- No live event dispatch to projection consumers
- No shadow comparison telemetry
- No tRPC read procedures
