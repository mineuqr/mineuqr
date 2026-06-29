# ORDERS-READ-MODEL-1 — Architecture Traceability Matrix

**Program:** ORDERS-READ-MODEL-1 — Phase 1 (Read Foundation)  
**Reference:** READ-ARCHITECTURE-1  
**Date:** 2026-06-29  
**Supersedes:** Investigation-only traceability in `READ-ARCHITECTURE-1/architecture-traceability-matrix.md` for implementation artifacts

---

## Design → Implementation Traceability

| RA Artifact | Design Requirement | Phase 1 Implementation | Status |
|-------------|-------------------|--------------------------|--------|
| RA-01 | `server/order/read/` module topology | `server/order/read/` (22 TypeScript files) | ✓ |
| RA-01 | Query application services layer | `application/QueryHandler.ts`, `ReadQueryContext.ts` | ✓ Contract |
| RA-01 | Read services layer | `services/ReadService.ts` | ✓ Contract |
| RA-01 | Projection consumers separate from integration | `OrderProjectionConsumerRegistry` | ✓ |
| RA-02 | P-01–P-12 projection catalog | `projectionIds.ts`, `ProjectionLifecycleRegistry` | ✓ |
| RA-02 | Lifecycle states | `projectionContracts.ts` | ✓ |
| RA-03 | Q-01–Q-08 query catalog | `queryContracts.ts` | ✓ |
| RA-03 | Query → projection bindings | `ORDER_READ_QUERY_BINDINGS` | ✓ |
| RA-04 | Event → projection consumer mapping | Consumer contract + registry dispatch | ✓ Infra |
| RA-05 | Read service boundaries | Interfaces only; no SQL | ✓ |
| RA-06 | Projection ownership | `ownerModule` per definition | ✓ |
| RA-07 | Refresh via event consumers | Registry + composite delegate (not wired) | ✓ Infra |
| RA-08 Phase 1 | Read foundation | This program Phase 1 | ✓ |
| RA-08 Phase 2+ | Store, consumers, APIs | — | Deferred |
| RA-09 | Tenant isolation on projections | `TenantScopedProjectionKey`, `restaurantId` on DTOs | ✓ Contract |
| RA-10 | ADR-ARCH-015 alignment | Read module foundation | ✓ |

---

## Investigation Finding → Phase 1 Resolution

| Finding ID | Investigation Source | Phase 1 Response | Phase 2+ |
|------------|---------------------|------------------|----------|
| BLOCK-R01 No read module | RM-01 | `server/order/read/` created | — |
| BLOCK-R03 No event projections | RM-03 | Consumer registry + idempotency infra | Materialize |
| GAP-R04 Unbounded list | RM-04 | `clampActiveOrderLimit` in contracts | Q-01 handler |
| GAP-R08 Metric drift | RM-05 | P-06 DTO + repository contract | Consumer impl |
| GAP-R03 N+1 | RM-10 | Denormalized DTO contracts | Projection store |
| BLOCK-R02 Client KPIs | RM-05, RM-07 | Q-05/Q-06 contracts | Phase 3 UI |
| GAP-R01 Legacy order.list | RM-02 | Unchanged | RA-08 Phase 2–3 |

---

## Code Artifact Map

| Artifact | Path |
|----------|------|
| Public module surface | `server/order/read/index.ts` |
| Composition root | `server/order/read/readComposition.ts` |
| Projection IDs | `server/order/read/domain/contracts/projectionIds.ts` |
| Projection contracts | `server/order/read/domain/contracts/projectionContracts.ts` |
| Query contracts | `server/order/read/domain/contracts/queryContracts.ts` |
| Query handler contract | `server/order/read/application/QueryHandler.ts` |
| Read query context | `server/order/read/application/ReadQueryContext.ts` |
| Read service contract | `server/order/read/services/ReadService.ts` |
| Lifecycle registry | `server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts` |
| Projection consumer contract | `server/order/read/projections/consumers/contracts/OrderProjectionConsumer.ts` |
| Repository interfaces | `server/order/read/infrastructure/persistence/contracts/ProjectionRepositoryContracts.ts` |
| Idempotency (in-memory) | `server/order/read/infrastructure/persistence/idempotency/ProjectionConsumerIdempotencyStore.ts` |
| Idempotency (Drizzle) | `server/order/read/infrastructure/persistence/idempotency/DrizzleProjectionConsumerIdempotencyStore.ts` |
| Projection consumer registry | `server/order/read/infrastructure/registry/OrderProjectionConsumerRegistry.ts` |
| Composite dispatch | `server/order/read/infrastructure/registry/CompositeEventDispatchDelegate.ts` |
| Metrics interface | `server/order/read/infrastructure/monitoring/ProjectionConsumerMetrics.ts` |
| Ops metrics | `server/order/read/infrastructure/monitoring/OpsProjectionConsumerMetrics.ts` |
| Feature flag | `server/_core/env.ts` → `orderReadProjectionsEnabled` |
| Ops taxonomy | `server/_core/opsTaxonomy.ts` → `order_projection_consumer_*` |

---

## Certified Path Integrity

| Path | Pre-Phase 1 | Post-Phase 1 | Changed? |
|------|-------------|--------------|----------|
| Write: Aggregate → Outbox | Certified | Certified | No |
| Events: Relay → Publisher | Certified | Certified | No |
| Integration consumers | ORDER-EVENTS-1B | ORDER-EVENTS-1B | No |
| Read: order.list → db.ts | Legacy | Legacy | No |
| Read: projection consumers | None | Infra only (empty registry) | No runtime effect |

**Publisher wiring:**

```typescript
// server/order/eventInfrastructureComposition.ts — unchanged
orderEventPublisher = new InProcessEventPublisher(metrics, orderEventConsumerRegistry);
```

Composite projection dispatch available via `createOrderEventDispatchDelegate()` when `ORDER_READ_PROJECTIONS_ENABLED=true` — not used in production composition.

---

## Test Traceability

| RA Requirement | Test |
|----------------|------|
| ADR-ARCH-014 idempotency | `OrderProjectionConsumerRegistry.test.ts` — duplicate skip |
| ADR-ARCH-014 failure isolation | `OrderProjectionConsumerRegistry.test.ts` — partial failure |
| RA-02 catalog completeness | `ProjectionLifecycleRegistry.test.ts` |
| RA-03 query bindings | `queryContracts.test.ts`, `ProjectionLifecycleRegistry.test.ts` |
| Production safety (flag off) | `readComposition.test.ts` |
| Composite dispatch | `CompositeEventDispatchDelegate.test.ts` |

---

## Downstream Program Dependencies

| Program | Depends on Phase 1 | Next Dependency |
|---------|-------------------|-----------------|
| ORDERS-READ-MODEL-1 Phase 2 | ✓ Foundation | Projection store schema |
| ORDERS-WORKSPACE-1 | Contracts only | Phase 2 read APIs + Phase 3 cutover |
| KITCHEN-DISPLAY-1 | P-07 defined | Kitchen read module + P-07 materialization |
| PRINTING-1 | P-08 defined | Printing read module + P-08 materialization |

---

## References

- [READ-ARCHITECTURE-1 RA-01](../READ-ARCHITECTURE-1/RA-01-read-architecture-blueprint.md)
- [READ-ARCHITECTURE-1 RA-08](../READ-ARCHITECTURE-1/RA-08-migration-blueprint.md)
- [ORDERS-READ-MODEL-1 Investigation](./investigation/implementation-readiness.md)
- [Architecture Compliance Report](./Architecture-Compliance-Report.md)
- [Test Summary](./Test-Summary.md)
- [Migration Readiness Report](./Migration-Readiness-Report.md)
