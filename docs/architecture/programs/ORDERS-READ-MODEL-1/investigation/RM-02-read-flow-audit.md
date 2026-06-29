# RM-02 — Read Flow Audit

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Flow Template

For each workflow: UI → API → Router → Application → Repository → Database

**Legend:** `(—)` = layer bypassed or not present.

---

## RF-01: Owner Live Order List (Orders Tab)

```
OrdersTab (Dashboard.tsx)
  ↓ trpc.order.list.useQuery({ restaurantId })
orderRouter.list (verifiedProcedure)
  ↓ assertRestaurantAccess
(—) Application layer
(—) Read service
db.getOrdersWithItemsByRestaurant(restaurantId)
  ↓ getOrdersByRestaurant → getOrderItemsByOrderId per order
MySQL: orders, order_items
  ↓
React Query cache → useMemo status filter (client)
```

**Coupling:** Router → legacy DB; optional `status` filter unused by UI; full history returned.

**Evidence:** `Dashboard.tsx` 3858–3868; `routers.ts` 1886–1893; `db.ts` 1064–1074.

---

## RF-02: Owner Order Status Update (read-after-write)

```
OrdersTab → updateStatusMutation
  ↓ order.updateStatus
orderRouter.updateStatus
  ↓ getOrderById (access) → AdvanceOrderStatusService → DrizzleOrderRepository
  ↓ runOrderCommand → relay → consumers
onSuccess: refetch() → RF-01 (full list re-fetch)
```

**Coupling:** Mutation uses certified path; refresh re-executes uncertified read path.

---

## RF-03: Home Operational Snapshot

```
OperationalSnapshotSection
  ├─ trpc.ops.getRestaurantOverview
  │    ↓ opsRouter → getRestaurantOverview
  │    ↓ resolveActiveSessionOverviewMetrics + getActiveOrdersCount
  │    MySQL: dining_sessions, orders (COUNT)
  │
  └─ trpc.order.list (homeSnapshotOrderQueryOptions — no poll)
       ↓ RF-01 path
       ↓ buildOrderStatistics (CLIENT)
       KPI: pending, preparing, today revenue
```

**Coupling:** Dual sources; client recomputes order KPIs despite server `pendingOrders` count.

**Evidence:** `Dashboard.tsx` 934–954, 980–982.

---

## RF-04: Reports Order Analytics

```
ReportsTab
  ↓ trpc.order.list (10s poll)
RF-01 database path
  ↓ buildOrderStatistics, buildMonthlyReport, buildYearlySummary (CLIENT)
  ↓ Excel export from client-derived rows
```

**Coupling:** Entire order analytics read path is client-side over raw list payload.

---

## RF-05: Settlement Analytics (Reports Tab)

```
SettlementOverviewSection / SettlementTrendsSection
  ↓ trpc.ops.getSettlementSummary / getSettlementTrend
opsRouter
  ↓ getSettlementSummary / getSettlementTrend (analytics/settlementMetrics.ts)
MySQL: dining_sessions (settlementOutcome, settledAt, totalAmount)
```

**Coupling:** None with order write path. **Certified server read pattern.**

---

## RF-06: Active Tables Board

```
ActiveSessionsTableSection / ActiveTablesBoardSection
  ↓ trpc.ops.getActiveTablesBoard
opsRouter → getActiveTablesBoard
  ↓ resolveTableSessionRows (tables ⋈ sessions)
  ↓ resolvePendingOrdersBySessionId (orders GROUP BY sessionId)
MySQL: restaurant_tables, dining_sessions, orders
```

**Optional parallel:**
```
  ↓ trpc.order.list
RF-01 → sessionWorkspaceOps.ts (CLIENT join/enrichment)
```

**Coupling:** Board is server projection; sessions UI also fetches full order list for client joins.

---

## RF-07: Activity Feed

```
OperationalActivityFeedSection
  ↓ trpc.ops.getActivityFeed
opsRouter → getActivityFeed
  ↓ resolveTableEventFeedRows (table_events)
  ↓ resolveOrderStatusFeedRows (orders where updatedAt > createdAt)
  ↓ mergeActivityFeedEvents
```

**Coupling:** Reads `orders` write table directly; only latest status change per order (documented limitation, `activityFeed.ts` lines 17–18).

---

## RF-08: Session Owner Workspace

```
DiningSessionWorkspaceSheet
  ├─ trpc.session.getOwnerWorkspace
  │    ↓ sessionRouter → getOwnerSessionWorkspace
  │    ↓ findSessionById, getOrdersBySessionId, findEventsBySessionId
  │    ↓ resolveSessionAggregates (maintained or computed fallback)
  │
  └─ trpc.order.list (when sheet open)
       RF-01 → countSessionItems (CLIENT)
       → deriveSettlementSummary (CLIENT from events)
```

**Coupling:** Server workspace exists but UI re-fetches full restaurant order list and re-derives settlement.

---

## RF-09: Guest Order Tracking

```
OrderStatusPage
  ↓ trpc.order.getPublicStatus (8s poll until terminal)
orderRouter.getPublicStatus
  ↓ getOrderByTrackingToken
  ↓ optional findSessionById (dual-write)
  ↓ toPublicOrderStatus (mapper)
```

**Coupling:** Public read mapper at router boundary; no dedicated public read service module.

---

## RF-10: New Order Alerts

```
OrderAlertSystem
  ↓ trpc.notification.getUnread (10s poll)
notificationRouter.getUnread
  ↓ getUnreadNotifications(userId)
MySQL: notifications
```

**Indirect order path:** `OrderCreated` → `OrderNotificationConsumer` → `createNotification` → later polled by UI.

---

## RF-11: Consumer Read-Back (Write Side Leak into Read)

```
OrderNotificationConsumer.handleOrderReady
  ↓ getOrderById(event.orderId)
db.ts → orders table
```

**Coupling:** Event consumer uses same legacy read helper as routers; not a UI read flow but shares read infrastructure.

---

## Unnecessary Coupling Summary

| ID | Coupling | Severity |
|----|----------|----------|
| UC-01 | Owner UI depends on full `order.list` for all operational views | High |
| UC-02 | Client KPI functions duplicate server-capable aggregations | Critical |
| UC-03 | Session sheet fetches both workspace API and full order list | Medium |
| UC-04 | `order.list` status filter unused — client filters instead | Medium |
| UC-05 | `getActiveOrdersCount` exists but UI also client-counts pending | Medium |
| UC-06 | Activity feed and order list are independent polls — no shared refresh | Low |
| UC-07 | `getOrderById` in router for access check duplicates service load | Low |
