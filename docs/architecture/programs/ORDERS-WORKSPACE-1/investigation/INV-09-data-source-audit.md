# INV-09 — Data Source Audit

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Widget Data Source Matrix

### Orders Tab (`OrdersTab`)

| Widget | API | Query Key | Cache | Polling | Projection | Refresh Strategy |
|--------|-----|-----------|-------|---------|------------|------------------|
| Order list cards | `order.list` | `{ restaurantId }` | React Query | **10s** (`orderListQueryOptions`) | Raw DB rows via `getOrdersWithItemsByRestaurant` | Poll + mutation `refetch()` |
| Status filter counts | *(none)* | — | Derived from cached list | — | Client filter | On list refresh |
| Session link label | `order.list` | same | shared cache | 10s | Client: `buildVisibleSessionOrderCounts` | On list refresh |
| Line item prices | `order.list` (embedded items) | same | shared | 10s | DB join | On list refresh |
| Email gate | `order.list` error shape | — | — | — | — | On error |

**Evidence:** `Dashboard.tsx` lines 3858–3861, 3892; `queryRuntime.ts` lines 66–70.

---

### Home Operational Snapshot (`OperationalSnapshotSection`)

| Widget | API | Polling | Projection | Refresh |
|--------|-----|---------|------------|---------|
| Pending / preparing counts | `order.list` + **client** `buildOrderStatistics` | **No poll** (staleTime 120s) | Client-derived breakdown | Manual retry + revisit |
| Today revenue | `order.list` + client stats | No poll | Client: sum of served orders today | Same |
| Active tables / sessions | `ops.getRestaurantOverview` | **10s** | Server ops projection | Poll |
| Overview pending orders | `ops.getRestaurantOverview.pendingOrders` | 10s | Server: `getActiveOrdersCount` | Poll |

**Evidence:** Lines 934–948, 951–954; `homeSnapshotOrderQueryOptions` in `queryRuntime.ts` lines 74–79.

**Mismatch:** Two sources for "pending" — ops overview vs client breakdown.

---

### Reports Tab (`ReportsTab`)

| Widget | API | Polling | Projection | Refresh |
|--------|-----|---------|------------|---------|
| Today/month order KPIs | `order.list` + `buildOrderStatistics` | 10s | Client-derived | Poll |
| Monthly report table | `order.list` + `buildMonthlyReport` | 10s | Client-derived | Poll |
| Yearly summary | `order.list` + `buildYearlySummary` | 10s | Client-derived | Poll |
| Settlement overview | `ops.getSettlementSummary` | 10s | Server projection | Poll |
| Settlement trends | `ops.getSettlementTrend` | 10s | Server projection | Poll |
| Menu stats (categories/items) | Props from parent `stats` | — | Restaurant metadata | Parent fetch |

**Evidence:** `Dashboard.tsx` lines 3575–3591, 3681–3691.

---

### Sessions Workspace (`SessionsWorkspacePanel`)

| Widget | API | Polling | Projection | Refresh |
|--------|-----|---------|------------|---------|
| Today completed sales KPI | `order.list` + `computeTodayCompletedSales` | 10s | Client-derived | Poll |
| Ops overview KPIs | `ops.getRestaurantOverview` | 10s | Server | Poll |
| Active sessions board | `ops.getActiveTablesBoard` + `order.list` | 10s | Mixed server + client join | Poll |

**Evidence:** `SessionsWorkspacePanel.tsx` lines 87, 99; `ActiveSessionsTableSection.tsx` line 82.

---

### Session Sheet (`DiningSessionWorkspaceSheet`)

| Widget | API | Polling | Projection | Refresh |
|--------|-----|---------|------------|---------|
| Session overview | `session.getOwnerWorkspace` | 10s when open | Server session read | Poll while open |
| Order items count | `order.list` | staleTime 30s when open | Client: `countSessionItems` | On open + stale |
| Settlement summary | `session.getOwnerWorkspace.events` | 10s | **Client: `deriveSettlementSummary`** | Poll |
| Orders summary section | Props from workspace data | — | Server session payload | Poll |

**Evidence:** `DiningSessionWorkspaceSheet.tsx` lines 83–96, 99–113.

---

### Order Alert System (`OrderAlertSystem`)

| Widget | API | Polling | Projection | Refresh |
|--------|-----|---------|------------|---------|
| New order notifications | `notification.getUnread` | **10s** | Notification table (created by consumer) | Poll |
| Alert overlay | Local state from notifications | — | View State | On notification poll |

**Evidence:** `OrderAlertSystem.tsx` lines 56–58.

---

### Activity Feed (`OperationalActivityFeedSection`)

| Widget | API | Polling | Projection | Refresh |
|--------|-----|---------|------------|---------|
| Order events in feed | `ops.getActivityFeed` | 10s | Ops event log | Poll |

**Event types:** `order_created`, `order_status_changed` (referenced in exploration).

---

## Server Read Path Detail

| API | Server Function | Layer | Read Model? |
|-----|-----------------|-------|-------------|
| `order.list` | `getOrdersWithItemsByRestaurant` (`db.ts`) | Legacy DB | **No** |
| `order.getById` | `getOrderById` + `getOrderItemsByOrderId` | Legacy DB | **No** |
| `order.activeCount` | `getActiveOrdersCount` | Legacy DB | **No** (unused by UI) |
| `order.getPublicStatus` | `getOrderByTrackingToken` + `toPublicOrderStatus` | Legacy DB + mapper | Partial |
| `ops.getRestaurantOverview` | Ops composition | Server projection | **Yes** (ops) |

---

## Cache Behavior

| Pattern | Behavior | Evidence |
|---------|----------|----------|
| React Query deduplication | Same `{ restaurantId }` key shares cache across components | tRPC React Query default |
| Independent poll timers | Each mounted query may register 10s interval | Multiple `useQuery` with `orderListQueryOptions` |
| Mutation invalidation | Session actions invalidate `order.list` | `DiningSessionActionBar.tsx` line 42 |
| No optimistic updates | Status mutation does not patch cache | `onSuccess: refetch()` only |
| Home snapshot staleTime | 120s before background refetch | `homeSnapshotOrderQueryOptions` |

---

## Polling Load Summary

When owner has **Orders tab active**, minimum concurrent polls:
- `order.list` — 10s
- `notification.getUnread` — 10s (global `OrderAlertSystem`)

When **Sessions tab active**, additional:
- `ops.getActiveTablesBoard` — 10s
- `ops.getRestaurantOverview` — 10s
- `order.list` — 10s
- `ops.getActivityFeed` — 10s

**No adaptive polling** (e.g. faster when orders pending).

---

## Projection Gaps (vs Architecture Target)

| Expected (ADR-ARCH-009) | Actual |
|---------------------------|--------|
| Server read model for owner order list | Raw `order.list` → full table scan per restaurant |
| Server analytics API for KPIs | Client `buildOrderStatistics` |
| Dedicated order detail query in UI | Full list fetch only |
| Event-driven refresh | 10s polling |
