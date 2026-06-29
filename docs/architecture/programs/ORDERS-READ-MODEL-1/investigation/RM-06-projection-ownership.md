# RM-06 — Projection Ownership

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Ownership Matrix

| Bounded Context | Projections Owned | Read Module | Write Path |
|-----------------|-------------------|-------------|------------|
| **Orders Workspace** | P-01 Owner list (raw), P-11 client KPIs | `orderRouter` → `db.ts` | `server/order/` certified |
| **Dashboard (Home)** | P-04 overview, P-11 client order KPIs | `server/ops/` + client | Mixed |
| **Sessions Workspace** | P-05 board, P-09 workspace, P-13 client joins | `server/ops/` + `sessionOwnerWorkspace` | Session service |
| **Reports** | P-08 settlement, P-11 order analytics (client) | `analytics/` + client | — |
| **Kitchen** | **None** (telemetry only) | — | Events only |
| **Printing** | **None** (dispatch log only) | — | Events only |
| **Analytics (order)** | **None server-side** | — | — |
| **Notifications** | P-14 notification rows | `notificationRouter` → `db.ts` | `OrderNotificationConsumer` |
| **Guest tracking** | P-10 public status | `orderPublicStatus.ts` | — |
| **Commercial admin** | P-17 | `CommercialReadService` | — |

---

## Orders Workspace

| Projection | Owner | Authoritative? |
|------------|-------|----------------|
| Live order list | `db.ts` (legacy) | Reads write table — SSOT is aggregate, not this query |
| Status badges / filters | Client `OrdersTab` | View only |
| Order analytics | Client `Dashboard.tsx` | **Not authoritative** |

**Gap:** No `server/order/read/` owner for workspace projections.

---

## Kitchen

| Item | Owner | Evidence |
|------|-------|----------|
| Kitchen queue projection | **Unowned — does not exist** | `OrderKitchenConsumer` — ops telemetry only |
| Order status for KDS | Would need read model | ADR-ARCH-012: integrate via events + read models |
| Activity feed order events | `server/ops/activityFeed.ts` | Partial substitute, not a kitchen queue |

---

## Printing

| Item | Owner | Evidence |
|------|-------|----------|
| Print queue | **Unowned — does not exist** | `LogOrderPrintDispatchPort` |
| Print job status | **Unowned** | — |
| Order re-read on print | `OrderPrintingConsumer` → `db.ts` | Consumer internal, not UI projection |

---

## Dashboard

| Projection | Owner | Overlap |
|------------|-------|---------|
| `getRestaurantOverview` | `server/ops/restaurantOverview.ts` | `pendingOrders` overlaps P-03 |
| Home order KPIs | **Client** (`buildOrderStatistics`) | Duplicates needed order analytics owner |
| Settlement sections | `server/analytics/settlementMetrics.ts` | Distinct from order revenue |

---

## Analytics

| Domain | Owner | Notes |
|--------|-------|-------|
| Settlement analytics | `server/analytics/settlementMetrics.ts` | Session-settlement based |
| Order sales analytics | **Client** | No server owner |
| Commercial platform analytics | `server/commercial/reporting/analyticsProjection.ts` | Admin scope |

---

## Notifications

| Projection | Owner | Refresh |
|------------|-------|---------|
| Unread notifications | `db.ts` notification helpers | Poll |
| `new_order` messages | Created by `OrderNotificationConsumer` | Event-indirect |

**Not an order read model** — separate notification context feeding order alerts.

---

## Duplicated Projections

| Duplication | Instances | Impact |
|-------------|-----------|--------|
| Pending order count | `getActiveOrdersCount`, client `buildOrderStatistics`, board per-session pending | Inconsistent definitions |
| Order list for restaurant | `order.list` fetched by 5+ components independently | Shared React Query cache mitigates network, not computation |
| Session orders | `session.getOwnerWorkspace.orders` + `order.list` for `countSessionItems` | Dual source in sheet |
| Status labels | `orderStatusDisplay.ts`, inline Dashboard, `orderPublicStatus.ts` | Copy duplication |
| Session duration | `computeSessionDurationMs` server; used in ops board + action center | **Proper reuse** |
| Revenue | Settlement server KPIs vs order-served client KPIs | Conceptual duplication |

---

## Recommended Ownership Model (Architecture Target — not implementation)

Per constitution, target owners would be:

| Projection | Target owner module |
|------------|---------------------|
| Owner active orders | `server/order/read/` or ops facade |
| Order analytics | `server/order/read/analytics` or `server/analytics/orderMetrics` |
| Kitchen queue | `server/kitchen/read/` (KITCHEN-DISPLAY-1) |
| Print queue | `server/printing/read/` (PRINTING-1) |

**Current state:** Only ops and settlement modules approximate this pattern.

---

## Orphan / Unowned Artifacts

| Artifact | Status |
|----------|--------|
| `order.getById` API | Server-owned, no UI consumer |
| `order.activeCount` API | Server-owned, superseded by ops for UI |
| `buildTodayReport` | Client-owned, no callers |
| `DiningSessionOrdersList.tsx` | UI component, no consumers |
| Kitchen/print read APIs | Do not exist |
