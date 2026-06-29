# INV-05 — Action Flow Matrix

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Owner Orders Workspace Actions

### A-01: Advance Order to Preparing

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | `OrdersTab` "Prepare" button | `Dashboard.tsx` line 4039: `updateStatusMutation.mutate({ id, status: "preparing" })` |
| **API** | `order.updateStatus` mutation | `trpc.order.updateStatus.useMutation` line 3891 |
| **Router** | `orderRouter.updateStatus` | `server/routers.ts` lines 1904–1924 |
| **Application Service** | `AdvanceOrderStatusService.execute` | Line 1916–1921 via `runOrderCommand` |
| **Aggregate** | `Order.advanceStatus("preparing", ...)` | `server/order/domain/aggregate/Order.ts` line 145+ |
| **Domain Events** | `OrderStatusChanged` | Aggregate lines 175–183 |
| **Consumers** | Kitchen (telemetry), Notification (none for this event), Session (none), Printing (none) | `OrderKitchenConsumer` subscribes to `OrderStatusChanged` |

### A-02: Mark Order Ready

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | "Ready" button when `status === "preparing"` | Line 4058 |
| **API** | `order.updateStatus` `{ status: "ready" }` | Same mutation |
| **Router** | `orderRouter.updateStatus` | Same procedure |
| **Application Service** | `AdvanceOrderStatusService` | Same |
| **Aggregate** | `advanceStatus("ready")` | Sets `_readyAt`, emits `OrderReady` |
| **Domain Events** | `OrderStatusChanged`, `OrderReady` | Aggregate lines 175–192 |
| **Consumers** | Notification → `sendReadyPushForOrder`; Printing → `dispatchPrintRequest`; Kitchen → telemetry | `OrderNotificationConsumer` lines 72–80; `OrderPrintingConsumer`; `OrderKitchenConsumer` |

### A-03: Mark Order Served

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | "Served" button when `status === "ready"` | Line 4068 |
| **API** | `order.updateStatus` `{ status: "served" }` | Same |
| **Router** | `orderRouter.updateStatus` | Same |
| **Application Service** | `AdvanceOrderStatusService` | Same |
| **Aggregate** | `advanceStatus("served")` | Emits `OrderCompleted` |
| **Domain Events** | `OrderStatusChanged`, `OrderCompleted` | Aggregate lines 195–201 |
| **Consumers** | Notification → `cleanupPushSubscriptionsForOrder` | `OrderNotificationConsumer` lines 83–85 |

### A-04: Cancel Order (from pending)

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | "Cancel" button when `status === "pending"` | Line 4047 |
| **API** | `order.updateStatus` `{ status: "cancelled" }` | Same |
| **Router** | `orderRouter.updateStatus` | Same |
| **Application Service** | `AdvanceOrderStatusService` → `Order.cancel()` | Aggregate `cancel()` line 205+ |
| **Domain Events** | `OrderStatusChanged`, `OrderCancelled` | Aggregate lines 223–238 |
| **Consumers** | Notification → push cleanup; Session → `decrementSessionAggregatesForCancelledOrder` (if dual-write) | `OrderSessionConsumer`; `OrderNotificationConsumer` |

### A-05: Filter Orders by Status

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | Filter chips → `setStatusFilter` | Lines 3910–3926 |
| **API** | None (client-side filter on cached `order.list`) | `useMemo` lines 3864–3868 |
| **Router** | Not invoked | — |
| **Application / Aggregate** | Not invoked | — |
| **Domain Events** | None | — |
| **Consumers** | None | — |

### A-06: Open Session from Order Card

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | Session label click → `setTimelineSessionId` | Lines 3961–3963 |
| **API** | `session.getOwnerWorkspace`, `order.list` (sheet open) | `DiningSessionWorkspaceSheet.tsx` lines 83–96 |
| **Router** | `sessionRouter.getOwnerWorkspace` | Session router (not order router) |
| **Application Service** | Session read path (outside order domain) | — |
| **Aggregate** | Not invoked | — |
| **Domain Events** | None | — |
| **Consumers** | None | — |

### A-07: Refresh Order List

| Layer | Artifact | Evidence |
|-------|----------|----------|
| **UI** | Implicit 10s poll + post-mutation `refetch()` | `orderListQueryOptions`, line 3892 |
| **API** | `order.list` query | Line 3858 |
| **Router** | `orderRouter.list` | `routers.ts` lines 1886–1893 |
| **Application Service** | **Bypassed** — direct `getOrdersWithItemsByRestaurant` | `db.ts` |
| **Aggregate** | Not invoked | — |
| **Domain Events** | None | — |
| **Consumers** | None | — |

---

## Adjacent Actions (Order-Related, Not in Orders Tab)

### A-08: Guest Place Order

| Layer | Evidence |
|-------|----------|
| **UI** | `CheckoutPage.tsx` line 97: `trpc.order.create.useMutation` |
| **Router** | `orderRouter.create` lines 1761–1883 — gates: restaurant active, closure, hours, commercial, table validation, session resolution |
| **Application** | `placeOrderService.execute` line 1852 |
| **Aggregate** | `Order.placeNew` |
| **Events** | `OrderCreated` |
| **Consumers** | Notification (`createNotification`), Session (dual-write aggregates), Kitchen (telemetry), Printing (`dispatchPrintRequest`) |

### A-09: New Order Alert (Owner)

| Layer | Evidence |
|-------|----------|
| **UI** | `OrderAlertSystem.tsx` polls `notification.getUnread` |
| **Router** | `notification` router (not order router) |
| **Trigger chain** | Guest `order.create` → `OrderCreated` event → `OrderNotificationConsumer.handleOrderCreated` → `createNotification` |
| **Evidence** | `OrderNotificationConsumer.ts` lines 53–69 |

### A-10: Session Settlement Actions (from sheet)

| Layer | Evidence |
|-------|----------|
| **UI** | `DiningSessionActionBar` — mark paid, complimentary, close |
| **API** | `session.markPaid`, `session.markComplimentary`, `session.close` |
| **Cache effect** | `utils.order.list.invalidate({ restaurantId })` — `DiningSessionActionBar.tsx` line 42 |
| **Order domain** | Not directly mutated | — |

---

## Post-Command Event Relay (All Mutations)

```
runOrderCommand(fn)
  → fn() [PlaceOrderService | AdvanceOrderStatusService]
  → runOrderEventRelayBatch()
  → OrderEventRelay.processBatch
  → InProcessEventPublisher.publish
  → OrderEventConsumerRegistry.dispatch (parallel, idempotent)
```

**Evidence:** `mapOrderDomainError.ts` lines 30–38; `OrderEventConsumerRegistry.ts` lines 45–50.

---

## Actions NOT Available in Orders Workspace UI

| Action | Server Support | UI Gap |
|--------|----------------|--------|
| Cancel from `preparing` / `ready` | Yes (domain) | No UI button |
| `order.getById` (single order fetch) | Yes | Not used; list fetch only |
| `order.activeCount` | Yes | Not used; ops overview instead |
| Bulk status update | No | N/A |
| Print order | Consumer only (log dispatch) | No UI trigger |
