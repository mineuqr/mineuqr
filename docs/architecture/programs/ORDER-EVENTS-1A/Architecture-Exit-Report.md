# ORDER-EVENTS-1A — Architecture Exit Report

**Program:** ORDER-EVENTS-1A — Event Infrastructure  
**Constitution:** MineuQR 2.0 Architecture Constitution v1.0.0  
**Report type:** Architecture Exit Review (permanent record)  
**Certification date:** 2026-06-27  
**Authority:** Architecture Authority  

**Related documents:**

- [Program Charter](./Program-Charter.md)
- [Architecture Traceability Matrix](./Architecture-Traceability-Matrix.md)
- [Delivery Guarantees](./DELIVERY-GUARANTEES.md)
- [ORDER-1 Exit Report](../ORDER-1/Architecture-Exit-Report.md)

---

## 1. Executive Summary

### Objectives

ORDER-EVENTS-1A was chartered to build **reliable event publication infrastructure** for the Order bounded context: transactional outbox, canonical envelope, publisher, relay, serialization, monitoring hooks, and tests — **without implementing consumers**.

### Scope

In scope: outbox table, repository, envelope, serialization, in-process publisher, relay with retry/dead-letter foundation, infrastructure interfaces, telemetry hooks, repository transactional integration, delivery guarantee documentation.

Out of scope: all consumers (notification, session, kitchen, printing, analytics), read models, projections, UI, router side-effect removal.

### Major architectural achievements

1. **`order_domain_outbox` table** (migration `0044`) with pending/published/failed lifecycle.
2. **Transactional outbox append** in `DrizzleOrderRepository` — same transaction as order mutations when DB available.
3. **Transport-agnostic `EventEnvelope`** and JSON serialization with payload versioning.
4. **`OrderEventRelay`** with exponential backoff, idempotent `markPublished`, and dead-letter (`failed`) status.
5. **`InProcessEventPublisher`** — infrastructure-only; no consumer dispatch.
6. **Infrastructure metrics** via `OpsEventInfrastructureMetrics` and ops taxonomy events.
7. **Composition root** `eventInfrastructureComposition.ts` exposing `runOrderEventRelayBatch`.

### Overall outcome

ORDER-EVENTS-1A **achieved its chartered infrastructure objectives**. Constitutional compliance verified for event-driven integration foundations (ADR-ARCH-008). Consumer migration and router decoupling remain deferred to ORDER-EVENTS-1B per charter.

**Exit verdict:** PASS — ready for ORDER-EVENTS-1B consumer program

---

## 2. Program Scope Verification

### Implemented (confirmed)

| Deliverable | Evidence | Status |
|---|---|---|
| Transactional outbox | `drizzle/0044_order_domain_outbox.sql`, `DrizzleOutboxRepository` | ✓ |
| Event envelope | `EventEnvelope.ts` | ✓ |
| Serialization | `domainEventSerializer.ts` | ✓ |
| Outbox repository port | `EventInfrastructureContracts.ts` → `OutboxRepository` | ✓ |
| Event store port | `EventStore` + `DrizzleEventStore` | ✓ |
| Event publisher | `InProcessEventPublisher.ts` | ✓ |
| Event relay | `OrderEventRelay.ts` | ✓ |
| Monitoring hooks | `EventInfrastructureMetrics.ts`, `opsTaxonomy.ts` | ✓ |
| Repository integration | `DrizzleOrderRepository` transactional save | ✓ |
| Application wiring | `PlaceOrderService`, `AdvanceOrderStatusService` | ✓ |
| Delivery guarantees doc | `DELIVERY-GUARANTEES.md` | ✓ |
| Infrastructure tests | `server/order/infrastructure/events/__tests__/` | ✓ |

### Intentionally NOT implemented (confirmed)

| Exclusion | Status |
|---|---|
| Notification consumer | ✓ Not implemented |
| Session consumer | ✓ Not implemented |
| Kitchen / Printing consumers | ✓ Not implemented |
| Analytics / read models | ✓ Not implemented |
| Router inline side-effect removal | ✓ Deferred ORDER-EVENTS-1B |
| Message broker transport | ✓ Deferred (publisher is in-process) |

---

## 3. Architecture Traceability Matrix

See [Architecture-Traceability-Matrix.md](./Architecture-Traceability-Matrix.md) — all in-scope rows verified **Implemented**.

---

## 4. Constitution Compliance

| Principle | Compliance | Evidence |
|---|---|---|
| Event-Driven Domain Integration (§8) | ✓ | Outbox + relay; events from aggregate only |
| Production Path Authority (§13) | ✓ | Mutations → repository → outbox in transaction |
| Order Aggregate Authority (§19) | ✓ | Events originate from `Order` aggregate |
| Architecture Compliance (§28) | ✓ | No consumers; no transport coupling |
| No direct publish | ✓ | Services persist via repository outbox only |

**Residual (ORDER-EVENTS-1B):** Router still contains inline session/notification/push side effects from ORDER-1 deferred items CV-01–04.

---

## 5. ADR Compliance

| ADR | Subject | Compliance |
|---|---|---|
| ADR-ARCH-004 | Integration boundaries | ✓ Interfaces decoupled from domain |
| ADR-ARCH-005 | Repository pattern | ✓ Outbox in repository transaction |
| ADR-ARCH-007 | Aggregate persistence | ✓ Events with aggregate commit |
| ADR-ARCH-008 | Outbox / event publication | ✓ Full implementation |
| ADR-ARCH-011 | Optimistic concurrency | ✓ Preserved on update path |

---

## 6. Fitness Function Verification

| FF | Description | Result |
|---|---|---|
| FF-09 | Outbox same transaction as order commit | ✓ PASS (transactional path) |
| FF-08 | No business logic in infrastructure | ✓ PASS |
| FF-04 | Domain events from aggregate | ✓ PASS |

---

## 7. Deferred Register

| ID | Item | Target program |
|---|---|---|
| EV-01 | Consumer dispatch in publisher | ORDER-EVENTS-1B |
| EV-02 | Router session/notification decoupling | ORDER-EVENTS-1B |
| EV-03 | External message broker transport | Future |
| EV-04 | Dead-letter replay tooling | Future ops |
| EV-05 | `restaurantId` on all domain event types | Optional domain hardening |

---

## 8. Repository Impact

| Area | Change |
|---|---|
| `drizzle/schema.ts` | `orderDomainOutbox` table |
| `drizzle/0044_order_domain_outbox.sql` | Migration |
| `server/order/infrastructure/events/` | New event infrastructure package |
| `server/order/infrastructure/persistence/DrizzleOrderRepository.ts` | Transactional outbox |
| `server/order/repositories/OrderRepository.ts` | `SaveOrderOptions` / `SaveOrderResult` |
| `server/order/eventInfrastructureComposition.ts` | Wiring |
| `server/_core/opsTaxonomy.ts` | Outbox telemetry events |

---

## 9. Test Summary

| Suite | Tests | Result |
|---|---|---|
| `domainEventSerializer.test.ts` | 4 | PASS |
| `domainEventsToOutbox.test.ts` | 1 | PASS |
| `OrderEventRelay.test.ts` | 5 | PASS |
| `InProcessEventPublisher.test.ts` | 1 | PASS |
| `DrizzleOutboxRepository.test.ts` | 1 | PASS |
| Existing order integration tests | 43+ | PASS (legacy DB mock path) |

Run: `npm run check` · `npm test`

---

## 10. Technical Debt

1. **Legacy repository path** — test mocks without `getDb()` skip outbox writes; acceptable for unit tests, not production.
2. **In-process publisher** — no external broker; sufficient for 1A foundation.
3. **Partial `restaurantId` on events** — envelope uses aggregate fallback for `OrderReady` / `OrderCompleted` / `OrderCancelled`.
4. **Relay scheduling** — `runOrderEventRelayBatch` exported but not yet wired to cron/worker (invocation left to deployment).

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Duplicate delivery to future consumers | Documented; idempotent consumer design required in 1B |
| Relay not scheduled in production | Ops must invoke `runOrderEventRelayBatch` or add scheduler |
| Legacy test path without outbox | Production always uses `getDb()` transactional path |

---

## 12. Readiness Assessment for ORDER-EVENTS-1B

**Ready:** ✓

ORDER-EVENTS-1B may proceed to implement consumers against:

- `EventEnvelope` contract
- `eventId` idempotency key
- `InProcessEventPublisher` extension point for dispatch registration
- Outbox `published` / `failed` states

Prerequisites met: transactional outbox operational, relay tested, guarantees documented.

---

## 13. Certification

| Criterion | Met |
|---|---|
| Reliable event publication infrastructure exists | ✓ |
| Transactional outbox operational | ✓ |
| Publication is infrastructure-driven | ✓ |
| Delivery guarantees documented and tested | ✓ |
| No consumers implemented | ✓ |
| Constitution compliance verified | ✓ |

**Architecture Authority certification:** PASS — ORDER-EVENTS-1A closed.

---

*End of report.*
