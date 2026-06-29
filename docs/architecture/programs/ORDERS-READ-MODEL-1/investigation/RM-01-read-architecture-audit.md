# RM-01 — Read Architecture Audit

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Executive Summary

The Read Side is **heterogeneous and partially certified**. Operational session/settlement reads use dedicated server modules under `server/ops/` and `server/analytics/`. **Order operational reads do not** — they flow through legacy `server/db.ts` helpers invoked directly from `orderRouter`, bypassing the certified `server/order/` application layer. There is **no dedicated Order read model layer**, no event-sourced projections for orders, and significant **client-side KPI derivation**.

The Write Side (`server/order/` aggregate, repository, outbox, consumers) is certified. Read and write concerns are **mixed** at the router and `db.ts` boundary.

---

## Current Query Layer

| Layer | Location | Role | Order reads? |
|-------|----------|------|--------------|
| **tRPC routers** | `server/routers.ts`, `server/ops/opsRouter.ts` | HTTP/API boundary, access control | Yes — `orderRouter`, `opsRouter` |
| **Legacy DB helpers** | `server/db.ts` | Direct Drizzle queries | **Primary order read path** |
| **Ops read modules** | `server/ops/*.ts` | Operational projections | Partial — uses `getActiveOrdersCount`, order joins |
| **Analytics read modules** | `server/analytics/settlementMetrics.ts` | Settlement KPIs | Session-based, not order analytics |
| **Session read modules** | `server/diningSession/sessionOwnerWorkspace.ts`, `sessionAggregateReaders.ts` | Session workspace | Joins `getOrdersBySessionId` |
| **Public status mapper** | `server/orderPublicStatus.ts` | Customer projection | `toPublicOrderStatus` |
| **Commercial read** | `server/commercial/CommercialReadService.ts` | Admin commercial data | Not order ops |
| **Order domain repository** | `DrizzleOrderRepository.findById` | **Write path only** | Loads aggregate for mutations |

**No `OrderQueryFacade`, `OrderReadService`, or `server/order/read/` module exists.**

---

## Read Services Inventory

| Service | Path | Certified read model? | Evidence |
|---------|------|----------------------|----------|
| `getRestaurantOverview` | `server/ops/restaurantOverview.ts` | Yes (ops) | Aggregates sessions + `getActiveOrdersCount` |
| `getActiveTablesBoard` | `server/ops/activeTablesBoard.ts` | Yes (ops) | Table/session board with order pending counts |
| `getActionCenter` | `server/ops/actionCenter.ts` | Yes (ops) | Long-running sessions |
| `getActivityFeed` | `server/ops/activityFeed.ts` | Yes (ops) | Merges `table_events` + `orders` status changes |
| `getSettlementSummary/Breakdown/Trend` | `server/analytics/settlementMetrics.ts` | Yes (analytics) | `dining_sessions` settlement fields |
| `getOwnerSessionWorkspace` | `server/diningSession/sessionOwnerWorkspace.ts` | Partial | Session-centric; embeds order rows |
| `getOrdersWithItemsByRestaurant` | `server/db.ts` | **No** — raw table read | Lines 1064–1074 |
| `getOrderByTrackingToken` | `server/db.ts` | Partial public DTO | Lines 1085–1127 |
| `getActiveOrdersCount` | `server/db.ts` | Server aggregation | Lines 1178–1187 |
| `CommercialReadService` | `server/commercial/` | Admin only | Not restaurant order ops |

---

## Repositories

| Repository | Read usage | Write usage |
|------------|------------|-------------|
| `DrizzleOrderRepository` | `findById` for application commands | `save` with outbox |
| `sessionRepository` (`findSessionById`, `findEventsBySessionId`) | Session workspace, activity feed | Session commands |
| `DrizzleOutboxRepository` | Relay reads pending events | Write only |
| `DrizzleConsumerIdempotencyStore` | Consumer dedup | Write only |
| `auditReadRepository` | Admin audit | Read only |
| **`db.ts` functions** | **All owner order list/detail reads** | Also used by legacy write helpers |

**Finding:** Order reads for UI do not use `OrderRepository` or a read-specialized repository.

---

## Dashboard Queries

| tRPC Procedure | Server function | Data source |
|----------------|-----------------|-------------|
| `ops.getRestaurantOverview` | `getRestaurantOverview` | `dining_sessions` + `getActiveOrdersCount` |
| `ops.getActiveTablesBoard` | `getActiveTablesBoard` | `restaurant_tables` ⋈ `dining_sessions` + order pending rollup |
| `ops.getActionCenter` | `getActionCenter` | `dining_sessions` |
| `ops.getActivityFeed` | `getActivityFeed` | `table_events` + `orders` |
| `ops.getSettlementSummary` | `getSettlementSummary` | `dining_sessions` |
| `ops.getSettlementTrend` | `getSettlementTrend` | `dining_sessions` |
| `order.list` | `getOrdersWithItemsByRestaurant` | `orders` + `order_items` (N+1) |
| `session.getOwnerWorkspace` | `getOwnerSessionWorkspace` | Session + orders + events |
| `notification.getUnread` | `getUnreadNotifications` | `notifications` table |

---

## Order Queries

| Function / Procedure | Filters | Pagination | Used by |
|---------------------|---------|------------|---------|
| `getOrdersByRestaurant` | `restaurantId`, optional `status` | None; `orderBy desc(createdAt)` | `order.list` |
| `getOrdersWithItemsByRestaurant` | Same | None | Owner dashboard (all tabs) |
| `getOrderById` | `id` | — | Router access check, consumers, repository |
| `getOrderByTrackingToken` | token + slug | `limit 1` | `order.getPublicStatus`, push routes |
| `getOrdersBySessionId` | `restaurantId`, `sessionId` | None | Session workspace |
| `getActiveOrdersCount` | `pending\|preparing\|ready` | COUNT | `ops.getRestaurantOverview`, `order.activeCount` (unused by UI) |
| `order.getById` | — | — | **No client caller** |

---

## Analytics Queries

| Type | Server | Client |
|------|--------|--------|
| **Settlement analytics** | `settlementMetrics.ts` — server aggregations | Consumed via `ops.getSettlement*` |
| **Order sales KPIs** | **None** | `buildOrderStatistics`, `buildMonthlyReport`, `buildYearlySummary` in `Dashboard.tsx` |
| **Today completed sales** | **None** | `computeTodayCompletedSales` in `SessionsWorkspacePanel.tsx` |
| **Commercial admin analytics** | `CommercialReadService` + `analyticsProjection.ts` | Admin dashboards only |

---

## Kitchen Queries

| Item | Status | Evidence |
|------|--------|----------|
| Kitchen display read API | **Does not exist** | No KDS router or query module |
| Kitchen queue projection | **Does not exist** | — |
| Kitchen consumer | Telemetry only | `OrderKitchenConsumer.ts` — `opsLog` only |
| Kitchen-related ops feed | Partial | `activityFeed.ts` — `order_status_changed` from `orders.updatedAt` |

---

## Printing Queries

| Item | Status | Evidence |
|------|--------|----------|
| Print queue read API | **Does not exist** | — |
| Print job history | **Does not exist** | — |
| Printing consumer | Dispatch only | `OrderPrintingConsumer` → `LogOrderPrintDispatchPort` |
| Print-related read | Consumer re-reads `getOrderById` on `OrderReady` | `OrderPrintingConsumer.ts` line 25 |

---

## Read / Write Mixing Assessment

| Concern | Mixed? | Evidence |
|---------|--------|----------|
| `db.ts` shared by reads and writes | **Yes** | `getOrderById` used by repository and routers; `updateOrderStatus` legacy write still present |
| Router reads bypass application layer | **Yes** | `order.list` → `db.ts` directly |
| Router reads use domain repository | **No** | Only mutations use `AdvanceOrderStatusService` |
| Ops reads use order write table directly | **Yes** | `activeTablesBoard.ts`, `activityFeed.ts` query `orders` table |
| Client computes business metrics | **Yes** | ADR-ARCH-006 violation |
| Event consumers read for side effects | **Yes** | `OrderNotificationConsumer` calls `getOrderById`, `getOrderItemsByOrderId` |

---

## Architectural Compliance (8 Principles)

| # | Principle | Compliant? |
|---|-----------|------------|
| 1 | Order Aggregate is SSOT | **Partial** — writes yes; reads pull raw rows |
| 2 | Read models are projections only | **Partial** — ops/settlement yes; order list is raw table |
| 3 | Read models never become SSOT | **Yes** — no materialized order projection tables |
| 4 | Operational UI consumes server projections | **No** — order KPIs client-computed |
| 5 | React never computes operational KPIs | **No** |
| 6 | Business logic in Domain | **Partial** — lifecycle in domain; analytics in client |
| 7 | Queries optimized for reading | **No** — full list + N+1 items |
| 8 | Read/Write evolve independently | **No** — shared `db.ts`, no projection pipeline |
