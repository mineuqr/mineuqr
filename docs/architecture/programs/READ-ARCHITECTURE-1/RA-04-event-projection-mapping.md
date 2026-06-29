# RA-04 — Event → Projection Mapping

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Event Source

All mappings originate from certified Order domain events (`server/order/domain/events/OrderDomainEvents.ts`):

| Event | Emitted when |
|-------|--------------|
| `OrderCreated` | Order placed and persisted |
| `OrderStatusChanged` | Any status transition or cancel (includes from/to) |
| `OrderReady` | Transition to `ready` (specialized, alongside StatusChanged) |
| `OrderCompleted` | Transition to `served` |
| `OrderCancelled` | Cancellation terminal state |

**Delivery path:** Outbox → Relay → Publisher → Registry → **Projection Consumer** (ADR-ARCH-014).

---

## Mapping Matrix

| Domain Event | Affected Projections | Update Responsibility | Consistency Expectation |
|--------------|---------------------|----------------------|-------------------------|
| **OrderCreated** | P-01 Owner Orders | `OwnerOrdersProjectionConsumer` | Upsert full order + lines snapshot |
| | P-02 Active Orders | `ActiveOrdersProjectionConsumer` | Insert active row |
| | P-03 Order Details | `OrderDetailsProjectionConsumer` | Insert detail row |
| | P-04 Order Timeline | `OrderTimelineProjectionConsumer` | Insert "created" / pending entry |
| | P-05 Dashboard | `DashboardOverviewProjectionConsumer` | Increment pending/active counters |
| | P-06 Operational KPI | `OperationalKpiProjectionConsumer` | Increment today pending |
| | P-07 Kitchen Queue | `KitchenQueueProjectionConsumer` | Enqueue ticket (KITCHEN-DISPLAY-1) |
| | P-08 Printing Queue | `PrintingQueueProjectionConsumer` | Create print job (PRINTING-1) |
| | P-10 Analytics | `OrderAnalyticsProjectionConsumer` | Increment today order count fact |
| | P-11 Public Status | `PublicOrderStatusProjectionConsumer` | Upsert guest view |
| **OrderStatusChanged** | P-01 | Owner consumer | Update status + timestamps |
| | P-02 | Active consumer | Move between active index / remove if terminal |
| | P-03 | Details consumer | Update status |
| | P-04 | Timeline consumer | Append transition entry (idempotent by eventId) |
| | P-05 | Dashboard consumer | Adjust pending/active counters by from/to |
| | P-06 | KPI consumer | Update breakdown counters |
| | P-07 | Kitchen consumer | Reposition ticket by status |
| | P-11 | Public consumer | Update guest status |
| **OrderReady** | P-03 | Details consumer | Set `readyAt` |
| | P-04 | Timeline consumer | Append ready milestone (optional duplicate guard) |
| | P-07 | Kitchen consumer | Mark ready / remove from prep queue per KDS policy |
| | P-08 | Printing consumer | Create or trigger ready print job |
| | P-11 | Public consumer | Update status + readyAt + expiry clock |
| **OrderCompleted** | P-01 | Owner consumer | Set terminal served state |
| | P-02 | Active consumer | **Remove** from active index |
| | P-03 | Details consumer | Set served timestamp |
| | P-04 | Timeline consumer | Append served entry |
| | P-05 | Dashboard consumer | Decrement active; no pending change if from ready |
| | P-06 | KPI consumer | Update breakdown; freeze in today totals |
| | P-07 | Kitchen consumer | Remove ticket |
| | P-10 Analytics | Analytics consumer | **Record revenue fact** (totalAmount) |
| | P-11 | Public consumer | Terminal served state |
| **OrderCancelled** | P-01 | Owner consumer | Set cancelled |
| | P-02 | Active consumer | Remove from active index |
| | P-03 | Details consumer | Set cancelled |
| | P-04 | Timeline consumer | Append cancelled entry |
| | P-05 | Dashboard consumer | Decrement counters per fromStatus |
| | P-06 | KPI consumer | Update breakdown |
| | P-07 | Kitchen consumer | Remove ticket |
| | P-08 | Printing consumer | Cancel pending jobs if any |
| | P-11 | Public consumer | Terminal cancelled state |

---

## Projections NOT Updated by Order Events

| Projection | Source |
|------------|--------|
| P-09 Settlement | Session domain events / session command outcomes |
| P-12 Session Workspace (session slice) | Session events; order slice via order projections |

---

## Integration Consumers vs Projection Consumers

| Event | Integration Consumer (existing ORDER-EVENTS-1B) | Projection Consumer (new) |
|-------|--------------------------------------------------|----------------------------|
| OrderCreated | Notification, Session, Kitchen telemetry, Printing dispatch | All P-01–P-11 applicable |
| OrderReady | Notification push, Printing dispatch | P-03, P-07, P-08, P-11 |
| OrderCompleted | Notification cleanup | P-01–P-06, P-10, P-11 |
| OrderCancelled | Notification cleanup, Session decrement | P-01–P-06, P-07, P-08, P-11 |
| OrderStatusChanged | Kitchen telemetry | P-01–P-06, P-07, P-11 |

**Architectural rule:** Integration consumers **must not** update projection store. Projection consumers **must not** send notifications or mutate sessions.

**Traceability:** READ-ARCHITECTURE-1 Principle 9; ORDER-EVENTS-1B Architecture Amendment R1–R7; ADR-ARCH-014 parallel isolated dispatch.

---

## Idempotency and Ordering

| Concern | Policy |
|---------|--------|
| Duplicate delivery | `(consumerName, eventId)` in `order_domain_consumer_processed` — same store as integration consumers, distinct consumer names |
| Event order per order | Projections tolerate out-of-order status events by comparing monotonic version or `changedAt` |
| Specialized + generic events | `OrderReady` + `OrderStatusChanged` for same transition — handlers must be idempotent (investigation DE-01–DE-03) |
| Read-your-writes | Command response returns minimal DTO; projections catch up within eventual window (Blueprint §13) |

---

## Consistency Expectations by Consumer Application

| Application | Tolerance | Mitigation |
|-------------|-----------|------------|
| Owner status button → list refresh | Low | Mutation `onSuccess` invalidates read query cache; optional command DTO |
| Guest tracking poll (8s) | Medium | Poll projection query |
| Dashboard KPIs | Medium | `generatedAt` on KPI DTO |
| Reports analytics | High | Eventual — facts correct within seconds |
| Kitchen display | Low–medium | Shorter poll or push in KITCHEN-DISPLAY-1 |
| Print queue | Medium | Job idempotency by eventId |

**Traceability:** ADR-ARCH-014 eventual consistency; ORDERS-READ-MODEL-1 RM-07 synchronous consumer note.

---

## Session Event Cross-Reference (P-05, P-12)

Session events (`SESSION_OPENED`, `SESSION_PAID`, `SESSION_CLOSED`, etc.) update session projections and P-05 session slices. They do **not** mutate order projections. Order-session linkage is via `sessionId` on `OrderCreated` event payload.

---

## References

- `OrderDomainEvents.ts`
- ADR-ARCH-014
- ORDERS-READ-MODEL-1 RM-07 Event Flow
- Blueprint §13 Production Path
