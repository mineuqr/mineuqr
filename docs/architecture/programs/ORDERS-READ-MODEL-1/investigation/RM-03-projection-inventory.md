# RM-03 — Projection Inventory

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Projection Classification

| Type | Definition in this audit |
|------|--------------------------|
| **Server projection** | Query module returns shaped read DTO; aggregation on server |
| **Raw table read** | Direct SELECT from write tables without projection layer |
| **Client projection** | UI/lib derives metrics from API payloads |
| **Event projection** | Materialized view updated from domain events — **none exist for orders** |

---

## Inventory

### P-01: Owner Orders List

| Field | Value |
|-------|-------|
| **Source** | `orders` + `order_items` tables (write model) |
| **Ownership** | Legacy `db.ts` / `orderRouter` |
| **Refresh** | On-demand per request; client polls 10s |
| **Consumers** | `OrdersTab`, `ReportsTab`, `SessionsWorkspacePanel`, `ActiveSessionsTableSection`, `DiningSessionWorkspaceSheet` |
| **Type** | **Raw table read** (not a projection) |

---

### P-02: Owner Order Detail (single)

| Field | Value |
|-------|-------|
| **Source** | `getOrderById` + `getOrderItemsByOrderId` |
| **Ownership** | `db.ts` / `orderRouter.getById` |
| **Refresh** | On-demand |
| **Consumers** | **None in client UI** (procedure exists, unused) |
| **Type** | Raw table read |

---

### P-03: Active Orders Count

| Field | Value |
|-------|-------|
| **Source** | `COUNT(*)` on `orders` WHERE status IN pending/preparing/ready |
| **Ownership** | `db.ts` / embedded in `getRestaurantOverview` |
| **Refresh** | Per `ops.getRestaurantOverview` request (10s client poll) |
| **Consumers** | `OperationalSnapshotSection`, `SessionsWorkspacePanel` via ops |
| **Type** | **Server aggregation** (minimal projection) |

---

### P-04: Dashboard Operational Overview

| Field | Value |
|-------|-------|
| **Source** | `dining_sessions` COUNT + P-03 |
| **Ownership** | `server/ops/restaurantOverview.ts` |
| **Refresh** | 10s poll |
| **Consumers** | Home snapshot, Sessions tab KPIs |
| **Type** | **Server projection** |

---

### P-05: Active Tables Board

| Field | Value |
|-------|-------|
| **Source** | `restaurant_tables` ⋈ `dining_sessions` + pending orders by session |
| **Ownership** | `server/ops/activeTablesBoard.ts` |
| **Refresh** | 10s poll |
| **Consumers** | `ActiveTablesBoardSection`, `ActiveSessionsTableSection`, `ActiveSessionsPreviewSection` |
| **Type** | **Server projection** |

---

### P-06: Action Center (Long-Running Sessions)

| Field | Value |
|-------|-------|
| **Source** | Open `dining_sessions` with duration threshold |
| **Ownership** | `server/ops/actionCenter.ts` |
| **Refresh** | 10s poll |
| **Consumers** | `ActionCenterSection` |
| **Type** | **Server projection** |

---

### P-07: Operational Activity Feed

| Field | Value |
|-------|-------|
| **Source** | `table_events` + `orders.updatedAt` proxy for status changes |
| **Ownership** | `server/ops/activityFeed.ts` |
| **Refresh** | 10s poll |
| **Consumers** | `OperationalActivityFeedSection` |
| **Type** | **Server projection** (documented limitations) |

---

### P-08: Settlement Analytics

| Field | Value |
|-------|-------|
| **Source** | `dining_sessions.settlementOutcome`, `settledAt`, `totalAmount` |
| **Ownership** | `server/analytics/settlementMetrics.ts` |
| **Refresh** | 10s poll on reports tab |
| **Consumers** | `SettlementOverviewSection`, `SettlementTrendsSection` |
| **Type** | **Server projection** |

---

### P-09: Session Owner Workspace

| Field | Value |
|-------|-------|
| **Source** | Session row + `getOrdersBySessionId` + `table_events` + maintained aggregates |
| **Ownership** | `server/diningSession/sessionOwnerWorkspace.ts` |
| **Refresh** | 10s poll when sheet open |
| **Consumers** | `DiningSessionWorkspaceSheet` |
| **Type** | **Server projection** (session-scoped) |

---

### P-10: Public Order Status (Guest)

| Field | Value |
|-------|-------|
| **Source** | `getOrderByTrackingToken` + `toPublicOrderStatus` |
| **Ownership** | `db.ts` + `orderPublicStatus.ts` |
| **Refresh** | 8s poll until terminal |
| **Consumers** | `OrderStatusPage` |
| **Type** | **Server presentation projection** (mapper, not materialized) |

---

### P-11: Order Analytics KPIs (Today/Month/Year)

| Field | Value |
|-------|-------|
| **Source** | Client derivation from P-01 full list |
| **Ownership** | `Dashboard.tsx` — `buildOrderStatistics`, `buildMonthlyReport`, `buildYearlySummary` |
| **Refresh** | Recomputed on each `order.list` cache update |
| **Consumers** | Home snapshot, Reports tab |
| **Type** | **Client projection** — ADR violation |

---

### P-12: Session Settlement Summary (UI)

| Field | Value |
|-------|-------|
| **Source** | Client `deriveSettlementSummary(session events)` |
| **Ownership** | `client/src/lib/diningSessionWorkspaceView.ts` |
| **Refresh** | On workspace data change |
| **Consumers** | `DiningSessionWorkspaceSheet` |
| **Type** | **Client projection** |

---

### P-13: Operational Board Enrichment

| Field | Value |
|-------|-------|
| **Source** | Client join of P-05 + P-01 |
| **Ownership** | `client/src/lib/sessionWorkspaceOps.ts` |
| **Refresh** | On poll |
| **Consumers** | Sessions board components |
| **Type** | **Client projection** |

---

### P-14: Notifications (New Order)

| Field | Value |
|-------|-------|
| **Source** | `notifications` table (written by `OrderNotificationConsumer`) |
| **Ownership** | `db.ts` / `notificationRouter` |
| **Refresh** | 10s poll |
| **Consumers** | `OrderAlertSystem`, header actions |
| **Type** | **Indirect event projection** (row created by consumer, not event-sourced store) |

---

### P-15: Kitchen Queue

| Field | Value |
|-------|-------|
| **Source** | **Does not exist** |
| **Ownership** | — |
| **Refresh** | — |
| **Consumers** | — |
| **Type** | **Missing** |

---

### P-16: Printing Queue

| Field | Value |
|-------|-------|
| **Source** | **Does not exist** (consumer logs dispatch only) |
| **Ownership** | `OrderPrintingConsumer` → `LogOrderPrintDispatchPort` |
| **Refresh** | — |
| **Consumers** | — |
| **Type** | **Missing** |

---

### P-17: Commercial Admin Analytics

| Field | Value |
|-------|-------|
| **Source** | `CommercialReadService` → `projectCommercialAnalytics` |
| **Ownership** | `server/commercial/` |
| **Refresh** | Admin request |
| **Consumers** | Super-admin / commercial dashboards |
| **Type** | **Server projection** (non-restaurant order scope) |

---

## Event-Sourced / Materialized Projections

| Projection table | Exists? |
|------------------|---------|
| `order_read_model` | **No** |
| `order_analytics_facts` | **No** |
| `kitchen_queue` | **No** |
| `print_jobs` | **No** |
| `order_domain_outbox` | Write-side outbox only (not a UI read model) |
| `order_domain_consumer_processed` | Idempotency store (not UI) |

---

## Refresh Strategy Summary

| Strategy | Projections using it |
|----------|---------------------|
| **Client polling (10s)** | P-01, P-04, P-05, P-06, P-07, P-08, P-14 |
| **Client polling (8s)** | P-10 |
| **One-shot fetch (staleTime 120s)** | P-01 on home snapshot only |
| **Mutation refetch** | P-01 after `order.updateStatus` |
| **Event-driven materialization** | **None for order UI reads** |
| **Cache invalidation** | `order.list.invalidate` after session actions |

---

## Gap: No Order Event → Read Model Pipeline

Domain events are consumed for **integration side effects** (notification, session, kitchen telemetry, print dispatch) but **no consumer updates an order read projection**.
