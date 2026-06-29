# ORDERS-READ-MODEL-1 — Phase 2 Architecture Compliance Report

**Program:** ORDERS-READ-MODEL-1 — Projection Materialization (Phase 2)  
**Reference:** READ-ARCHITECTURE-1 (RA-01 through RA-10)  
**Date:** 2026-06-29  
**Exit verdict:** PASS (Phase 2 scope — materialized, not activated)

---

## Scope Statement

Phase 2 delivers **projection store schema, repositories, materializers, consumers, and backfill infrastructure** without activating live dispatch or production read APIs. Legacy `order.list`, Dashboard, Orders Workspace, and React remain unchanged.

---

## RA-01 Module Topology

| RA-01 Target | Phase 2 Implementation | Status |
|--------------|--------------------------|--------|
| `infrastructure/persistence/` — projection store | `DrizzleOrderReadProjectionStore`, `InMemoryOrderReadProjectionStore`, `PersistingOrderReadProjectionRepositories` | ✓ |
| `projections/` — materializers | `OrderReadProjectionMaterializer`, `projectionStatus.ts` | ✓ |
| `projections/` — consumers | `createOrderReadProjectionConsumers.ts` (7 consumers) | ✓ |
| Context loader (write → read denorm) | `OrderReadContextLoader`, `DrizzleOrderReadContextLoader` | ✓ |
| Backfill | `OrderReadProjectionBackfillService` | ✓ |
| Composition | `readPersistenceComposition.ts`, `readComposition.ts` (consumers registered) | ✓ |

---

## RA-02 Projection Catalog — Materialization

| Projection | Lifecycle | Store Table(s) | Consumer | Phase 2 |
|------------|-----------|----------------|----------|---------|
| P-01 Owner Orders | `materializing` | `order_read_orders`, `order_read_order_line_items` | `OwnerOrdersProjectionConsumer` | ✓ |
| P-02 Active Orders | `materializing` | `order_read_orders` (`isActive`) | `ActiveOrdersProjectionConsumer` | ✓ |
| P-03 Order Details | `materializing` | `order_read_orders`, line items | `OrderDetailsProjectionConsumer` | ✓ |
| P-04 Order Timeline | `materializing` | `order_read_order_timeline` | `OrderTimelineProjectionConsumer` | ✓ |
| P-05 Dashboard | `queryable` (ops) | — | — | Out of scope |
| P-06 Operational KPI | `materializing` | `order_read_operational_kpi_daily` | `OperationalKpiProjectionConsumer` | ✓ |
| P-07 Kitchen Queue | `defined` | — | — | Deferred |
| P-08 Print Jobs | `defined` | — | — | Deferred |
| P-09 Session Orders | `defined` | — | — | Deferred |
| P-10 Analytics | `materializing` | `order_read_analytics_daily` | `OrderAnalyticsProjectionConsumer` | ✓ |
| P-11 Public Order Status | `materializing` | `order_read_public_order_status` | `PublicOrderStatusProjectionConsumer` | ✓ |
| P-12 Order Search | `defined` | — | — | Deferred |

---

## RA-04 / RA-05 / RA-06 / RA-09 Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Tenant isolation (`restaurantId` on all keys) | PKs include `restaurantId`; loader scopes by restaurant | ✓ |
| Idempotent consumer delivery | `OrderProjectionConsumerRegistry` + `DrizzleProjectionConsumerIdempotencyStore` (Phase 1) | ✓ |
| Restart-safe materialization | Upsert semantics; backfill safe retry | ✓ |
| Observable consumers | `OpsProjectionConsumerMetrics` + ops taxonomy | ✓ |
| Observable backfill | `order_read_backfill_started/completed/failed` | ✓ |
| No cross-calls integration ↔ projection | Separate registries; publisher unchanged | ✓ |
| Consumers registered, dispatch inactive | `registerOrderProjectionConsumers()`; flag default `false` | ✓ |
| No production read APIs | No tRPC/router changes | ✓ |

---

## Production Safety Checklist

| Guard | Verified |
|-------|----------|
| `eventInfrastructureComposition.ts` — publisher uses `orderEventConsumerRegistry` only | ✓ Unchanged |
| `ORDER_READ_PROJECTIONS_ENABLED` default `false` | ✓ |
| `createOrderEventDispatchDelegate()` not used in publisher composition | ✓ |
| No Dashboard / React / `order.list` changes | ✓ |
| Migration `0046_order_read_projections.sql` additive only | ✓ |

---

## ADR Compliance

| ADR | Phase 2 Response | Status |
|-----|------------------|--------|
| ADR-ARCH-006 | KPI materialized in P-06; UI still client-side | Deferred Phase 3 |
| ADR-ARCH-008 | Consumers ready for same outbox bus | ✓ Infra |
| ADR-ARCH-009 | P-06/P-10 Drizzle tables + materializers | ✓ |
| ADR-ARCH-014 | Idempotent parallel consumers with metrics | ✓ |
| ADR-ARCH-015 | Read module materialization per RA-08 Phase 2 | ✓ |

---

## Exit Verdict

**PASS** — Phase 2 deliverables complete. Projections are materializable via backfill and registered consumers; live dispatch and read APIs remain inactive pending Phase 3 gates.
