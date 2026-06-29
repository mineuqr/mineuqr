# RA-06 — Projection Ownership Matrix

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Ownership Rules

1. **One primary owner module** per projection.
2. **One primary projection consumer** per projection write path.
3. **Multiple query consumers** allowed; they share the same read service.
4. **No duplicated projection ownership** — extend existing certified modules rather than fork.

---

## Matrix

| Projection ID | Name | Owning Module | Producing Consumer(s) | Consuming Applications / Queries |
|---------------|------|---------------|----------------------|----------------------------------|
| P-01 | Owner Orders | `server/order/read/` | `OwnerOrdersProjectionConsumer` | Q-02 `order.read.listHistory`; Reports export |
| P-02 | Active Orders | `server/order/read/` | `ActiveOrdersProjectionConsumer` | Q-01 `order.read.listActive`; Sessions board |
| P-03 | Order Details | `server/order/read/` | `OrderDetailsProjectionConsumer` | Q-03 `order.read.getDetail`; P-12 compose |
| P-04 | Order Timeline | `server/order/read/` | `OrderTimelineProjectionConsumer` | Q-04; future activity feed enrich |
| P-05 | Dashboard | `server/ops/` | `DashboardOverviewProjectionConsumer` + session maintainers | Q-10 `ops.getRestaurantOverview`; Q-11 board |
| P-06 | Operational KPI | `server/order/read/` | `OperationalKpiProjectionConsumer` | Q-05 `order.read.getOperationalKpis`; Q-10 pendingOrders source |
| P-07 | Kitchen Queue | `server/kitchen/read/` | `KitchenQueueProjectionConsumer` | Q-20 `kitchen.read.getQueue` |
| P-08 | Printing Queue | `server/printing/read/` | `PrintingQueueProjectionConsumer` | Q-30 `printing.read.getQueue` |
| P-09 | Settlement | `server/analytics/` | Session settlement writers (existing) | Q-13–15 `ops.getSettlement*` |
| P-10 | Analytics | `server/analytics/order/` | `OrderAnalyticsProjectionConsumer` | Q-06, Q-07 |
| P-11 | Public Order Status | `server/order/read/` | `PublicOrderStatusProjectionConsumer` | Q-08 `order.getPublicStatus` |
| P-12 | Session Workspace | `server/diningSession/` | Session services + **reads** P-01/P-03 | Q-40 `session.getOwnerWorkspace` |

---

## Integration Consumer Ownership (Separate — Not Projections)

| Consumer | Owns | Must NOT own |
|----------|------|--------------|
| `OrderNotificationConsumer` | Notification rows | Order projections |
| `OrderSessionConsumer` | Session events / aggregates | Order projections |
| `OrderKitchenConsumer` | Telemetry (until KITCHEN-DISPLAY-1) | Kitchen queue projection |
| `OrderPrintingConsumer` | Print dispatch port (until PRINTING-1) | Print queue projection |

**Post-program split:** `OrderKitchenConsumer` telemetry may remain; P-07 owns KDS data. `OrderPrintingConsumer` dispatches jobs; P-08 owns job state.

---

## Duplication Resolution

| Previous duplication | Resolution |
|---------------------|------------|
| `getActiveOrdersCount` vs client pending counts | **P-06** is canonical; P-05 reads P-06 counter |
| `order.list` vs `getOrdersBySessionId` | P-03 detail + Q-01 list; session compose uses `listBySessionId` read service |
| Ops board pending vs order list client join | Board uses P-02 rollup per session; remove client `order.list` join |
| Settlement server vs `deriveSettlementSummary` | P-09 + server `settlementState` on P-12 |
| `toPublicOrderStatus` mapper vs raw token query | P-11 materializes; mapper becomes thin |
| Activity feed `orders.updatedAt` vs timeline | P-04 becomes authoritative for order status history |

---

## Module Authority Diagram

```
server/order/read/          → P-01, P-02, P-03, P-04, P-06, P-10, P-11
server/ops/                 → P-05 (order slice + existing session/board)
server/analytics/           → P-09 (existing), P-10 (order extension)
server/diningSession/       → P-12 (composite)
server/kitchen/read/        → P-07  [KITCHEN-DISPLAY-1]
server/printing/read/       → P-08  [PRINTING-1]
```

---

## Consumer Registry Layout (Target)

```
OrderEventConsumerRegistry
├── Integration registrations (ORDER-EVENTS-1B — certified)
│   ├── OrderNotificationConsumer
│   ├── OrderSessionConsumer
│   ├── OrderKitchenConsumer
│   └── OrderPrintingConsumer
└── Projection registrations (ORDERS-READ-MODEL-1 — new)
    ├── OwnerOrdersProjectionConsumer
    ├── ActiveOrdersProjectionConsumer
    ├── OrderDetailsProjectionConsumer
    ├── OrderTimelineProjectionConsumer
    ├── OperationalKpiProjectionConsumer
    ├── OrderAnalyticsProjectionConsumer
    ├── PublicOrderStatusProjectionConsumer
    ├── KitchenQueueProjectionConsumer      [deferred]
    └── PrintingQueueProjectionConsumer   [deferred]
```

All registrations obey ORDER-EVENTS-1B Amendment R1–R7 (zero consumer-to-consumer dependencies).

---

## References

- ORDERS-READ-MODEL-1 RM-06 Projection Ownership
- RA-02 Projection Catalog
- ORDER-EVENTS-1B Architecture Amendment
