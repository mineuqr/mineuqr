# INV-07 — Event Flow

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Event Pipeline (Certified ORDER-EVENTS-1B)

```
Order Aggregate (domain events)
    ↓ onPersisted
Transactional Outbox (DrizzleOrderRepository)
    ↓
runOrderCommand success → runOrderEventRelayBatch()
    ↓
OrderEventRelay.processBatch
    ↓
InProcessEventPublisher.publish (transport only)
    ↓
OrderEventConsumerRegistry.dispatch (parallel, idempotent)
    ↓
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Notification │   Session    │   Kitchen    │   Printing   │
│  Consumer    │   Consumer   │   Consumer   │   Consumer   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Evidence:**
- Relay trigger: `server/order/application/mapOrderDomainError.ts` lines 33–35
- Publisher: `InProcessEventPublisher.ts` delegates to registry
- Registry: `OrderEventConsumerRegistry.ts` lines 45–50
- Registration: `server/order/consumerComposition.ts`

---

## Domain Events Inventory

**Source:** `server/order/domain/events/OrderDomainEvents.ts`

| Event | Emitted When | Payload Highlights |
|-------|--------------|-------------------|
| `OrderCreated` | `Order.placeNew` persist | orderId, restaurantId, tableNumber, orderNumber, trackingToken, totalAmount, sessionId |
| `OrderStatusChanged` | Any status advance or cancel | fromStatus, toStatus, changedAt |
| `OrderReady` | Transition to `ready` | orderId, trackingToken, readyAt |
| `OrderCompleted` | Transition to `served` | orderId, servedAt |
| `OrderCancelled` | Cancel | orderId, cancelledAt |

**Aggregate evidence:** `server/order/domain/aggregate/Order.ts` lines 175–238.

---

## Consumer Subscription Matrix

| Event | Notification | Session | Kitchen | Printing |
|-------|-------------|---------|---------|----------|
| `OrderCreated` | ✓ `createNotification` | ✓ aggregates + event (dual-write) | ✓ telemetry | ✓ print dispatch |
| `OrderStatusChanged` | — | — | ✓ telemetry | — |
| `OrderReady` | ✓ ready push | — | — | ✓ print dispatch |
| `OrderCompleted` | ✓ push cleanup | — | — | — |
| `OrderCancelled` | ✓ push cleanup | ✓ decrement aggregates | — | — |

**Evidence files:**
- `OrderNotificationConsumer.ts` lines 21–26, 53–88
- `OrderSessionConsumer.ts` — `OrderCreated`, `OrderCancelled`
- `OrderKitchenConsumer.ts` — `OrderCreated`, `OrderStatusChanged`
- `OrderPrintingConsumer.ts` — `OrderCreated`, `OrderReady`

---

## Orders Workspace UI Event Awareness

| UI Surface | Event Awareness | Mechanism |
|------------|-----------------|-----------|
| `OrdersTab` | **None direct** | Polls `order.list` every 10s |
| `OrderAlertSystem` | **Indirect** | Polls `notification.getUnread` for `new_order` type |
| `OperationalActivityFeedSection` | **Projection** | `ops.getActivityFeed` includes `order_created`, `order_status_changed` |
| Customer `OrderStatusPage` | **Indirect** | Polls `order.getPublicStatus` every 8s |

**No WebSocket or SSE subscription exists for owner orders UI.**

---

## Synchronous Dependencies

| Dependency | Type | Evidence |
|------------|------|----------|
| `runOrderEventRelayBatch` in `runOrderCommand` | **Synchronous post-commit** | Awaits relay before returning mutation response |
| Consumer dispatch | **Synchronous within request** | Registry `await consumer.handle` per consumer |
| Notification creation | **Blocks relay batch** | `OrderNotificationConsumer` awaits `createNotification` |
| Ready push | **Blocks consumer** | `sendReadyPushForOrder` awaited |
| Session consumer failures | **Non-blocking** | Ops-logged, does not rethrow (per consumer design) |

**Architectural note:** Event consumers run in-process synchronously after commit, not via async message broker.

---

## Hidden Side Effects

| Side Effect | Trigger | Visible to Orders UI? |
|-------------|---------|----------------------|
| Owner notification row created | `OrderCreated` → Notification consumer | Yes, via `OrderAlertSystem` poll (delayed up to 10s) |
| Browser push to guest | `OrderReady` → Notification consumer | No (guest device) |
| Session aggregate increment | `OrderCreated` → Session consumer | Visible in session sheet / ops board after refresh |
| Print dispatch log | `OrderCreated`/`OrderReady` → Printing consumer | No UI surfacing |
| Kitchen telemetry ops log | All subscribed events | No UI surfacing |

---

## Missing Events

| Gap | Description | Evidence |
|-----|-------------|----------|
| ME-01 | **No `OrderPreparing` dedicated event** — only generic `OrderStatusChanged` | Domain emits `OrderStatusChanged` for all transitions |
| ME-02 | **No analytics consumer** | No projection update on order events for dashboard KPIs |
| ME-03 | **No UI push/subscription for status changes** | Owner relies on 10s poll, not event-driven refresh |
| ME-04 | **Activity feed may lag** | Separate `ops.getActivityFeed` poll, not tied to mutation callback |

---

## Duplicated Events

| Pattern | Description | Evidence |
|---------|-------------|----------|
| DE-01 | `ready` transition emits **both** `OrderStatusChanged` and `OrderReady` | Aggregate lines 175–192 |
| DE-02 | `served` emits **both** `OrderStatusChanged` and `OrderCompleted` | Lines 195–201 |
| DE-03 | `cancelled` emits **both** `OrderStatusChanged` and `OrderCancelled` | Lines 223–238 |

**Assessment:** Intentional specialization events atop generic status change. Consumers subscribe to specific types — Kitchen receives `OrderStatusChanged` for all transitions; Notification uses specialized events for push/cleanup.

**Idempotency:** `DrizzleConsumerIdempotencyStore` prevents duplicate consumer processing per `eventId`.

---

## Event → UI Refresh Gap

```
Owner clicks "Ready"
  → updateStatus mutation
  → aggregate + outbox + relay + consumers (sync)
  → mutation returns { success: true }
  → OrdersTab onSuccess: refetch()
  → UI updates

Alternative path (no click):
  → 10s poll eventually refreshes list
```

**Evidence:** `OrdersTab` line 3892 — explicit refetch on mutation success mitigates poll delay.

---

## Verification: Router No Longer Emits Side Effects Inline

**Evidence:** `server/order-router-cleanup.test.ts` — asserts `createNotification`, `recordSessionEvent`, `incrementSessionAggregatesForOrder` not called from router on create/update.

**Status:** ✓ Compliant with ORDER-EVENTS-1B for mutation side-effect decoupling.
