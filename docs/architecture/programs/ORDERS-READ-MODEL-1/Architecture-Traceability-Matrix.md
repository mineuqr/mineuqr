# ORDERS-READ-MODEL-1 — Architecture Traceability Matrix

**Program:** ORDERS-READ-MODEL-1 — Phase 2 (Projection Materialization)  
**Reference:** READ-ARCHITECTURE-1  
**Date:** 2026-06-29  
**Supersedes:** Phase 1 traceability for implementation artifacts

---

## Design → Implementation Traceability

| RA Artifact | Design Requirement | Phase 2 Implementation | Status |
|-------------|-------------------|--------------------------|--------|
| RA-01 | `server/order/read/` module topology | 36 TypeScript files under `server/order/read/` | ✓ |
| RA-02 | P-01–P-12 projection catalog | 7 projections `materializing`; 5 deferred/`defined` | ✓ |
| RA-02 | Lifecycle states | `materializing` for P-01–P-04, P-06, P-10, P-11 | ✓ |
| RA-03 | Q-01–Q-08 query catalog | Contracts unchanged; handlers not implemented | Contract |
| RA-04 | Event → projection consumer mapping | `createOrderReadProjectionConsumers` | ✓ |
| RA-05 | Read service boundaries | Interfaces only; no production SQL reads | ✓ |
| RA-06 | Projection ownership | `ownerModule: server/order/read` on materialized projections | ✓ |
| RA-07 | Refresh via event consumers | 7 consumers registered; dispatch inactive | ✓ Infra |
| RA-08 Phase 1 | Read foundation | Phase 1 complete | ✓ |
| RA-08 Phase 2 | Store, consumers, backfill | This program Phase 2 | ✓ |
| RA-08 Phase 3+ | Read APIs, UI cutover | — | Deferred |
| RA-09 | Tenant isolation on projections | `restaurantId` on all PKs and DTOs | ✓ |
| RA-10 | ADR-ARCH-015 alignment | Materialization per reference architecture | ✓ |

---

## Investigation Finding → Resolution

| Finding ID | Investigation Source | Phase 2 Response | Phase 3+ |
|------------|---------------------|------------------|----------|
| BLOCK-R03 No event projections | RM-03 | 7 materializing consumers + store | Activate dispatch |
| GAP-R04 Unbounded list | RM-04 | Active filter in P-02 store | Q-01 handler |
| GAP-R08 Metric drift | RM-05 | P-06 materializer + daily rollup | Shadow compare |
| GAP-R03 N+1 | RM-10 | Denormalized projection rows | Q-03 handler |
| GAP-R01 Legacy order.list | RM-02 | Unchanged | RA-08 Phase 3 |
| BLOCK-R02 Client KPIs | RM-05 | P-06 populated; UI unchanged | Dashboard cutover |

---

## Code Artifact Map

| Artifact | Path |
|----------|------|
| Public module surface | `server/order/read/index.ts` |
| Composition root | `server/order/read/readComposition.ts` |
| Persistence composition | `server/order/read/readPersistenceComposition.ts` |
| Migration | `drizzle/0046_order_read_projections.sql` |
| Drizzle schema | `drizzle/schema.ts` → `orderRead*` tables |
| Projection IDs | `server/order/read/domain/contracts/projectionIds.ts` |
| Repository contracts | `server/order/read/infrastructure/persistence/contracts/ProjectionRepositoryContracts.ts` |
| In-memory store | `server/order/read/infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore.ts` |
| Drizzle persist | `server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts` |
| Persist decorator | `server/order/read/infrastructure/persistence/PersistingOrderReadProjectionRepositories.ts` |
| Context loader | `server/order/read/infrastructure/persistence/DrizzleOrderReadContextLoader.ts` |
| Materializer | `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts` |
| Consumer factory | `server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts` |
| Backfill service | `server/order/read/infrastructure/backfill/OrderReadProjectionBackfillService.ts` |
| Lifecycle registry | `server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts` |
| Projection consumer registry | `server/order/read/infrastructure/registry/OrderProjectionConsumerRegistry.ts` |
| Composite dispatch | `server/order/read/infrastructure/registry/CompositeEventDispatchDelegate.ts` |
| Feature flag | `server/_core/env.ts` → `orderReadProjectionsEnabled` |
| Ops taxonomy | `server/_core/opsTaxonomy.ts` → `order_projection_consumer_*`, `order_read_backfill_*` |

---

## Certified Path Integrity

| Path | Pre-Phase 2 | Post-Phase 2 | Changed? |
|------|-------------|--------------|----------|
| Write: Aggregate → Outbox | Certified | Certified | No |
| Events: Relay → Publisher | Certified | Certified | No |
| Integration consumers | ORDER-EVENTS-1B | ORDER-EVENTS-1B | No |
| Read: order.list → db.ts | Legacy | Legacy | No |
| Read: projection consumers | Infra only (empty) | 7 registered, dispatch inactive | No runtime effect |

**Publisher wiring (unchanged):**

```typescript
// server/order/eventInfrastructureComposition.ts
orderEventPublisher = new InProcessEventPublisher(metrics, orderEventConsumerRegistry);
```

Composite projection dispatch available via `createOrderEventDispatchDelegate()` when `ORDER_READ_PROJECTIONS_ENABLED=true` — **not used** in production composition.

---

## Test Traceability

| RA Requirement | Test |
|----------------|------|
| ADR-ARCH-014 idempotency | `OrderProjectionConsumerRegistry.test.ts` |
| ADR-ARCH-014 failure isolation | `OrderProjectionConsumerRegistry.test.ts` |
| RA-02 lifecycle `materializing` | `ProjectionLifecycleRegistry.test.ts` |
| P-01–P-03 repository upsert | `InMemoryOrderReadProjectionStore.test.ts` |
| Materializer sync / timeline / KPI | `OrderReadProjectionMaterializer.test.ts` |
| Seven consumers registered | `OrderReadProjectionMaterializers.integration.test.ts` |
| Backfill tenant / partial / retry | `OrderReadProjectionBackfillService.test.ts` |
| Feature flag default | `readComposition.test.ts` |

---

## Phase Gate Summary

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Contracts, registry, idempotency | ✓ Complete |
| Phase 2 | Schema, repos, materializers, backfill | ✓ Complete |
| Phase 3 | Shadow read APIs, dispatch activation | Not started |
| Phase 4 | UI cutover (ORDERS-WORKSPACE-1) | Not started |
