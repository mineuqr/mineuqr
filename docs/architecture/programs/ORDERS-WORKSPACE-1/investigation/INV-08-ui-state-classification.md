# INV-08 — UI State Classification

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Classification Legend

| Class | Definition |
|-------|------------|
| **Domain State** | Authoritative persisted order/session data owned by server aggregate |
| **Projection State** | Derived read data from server (or should be); may lag domain |
| **View State** | Ephemeral UI-only state with no business authority |
| **Invalid State** | Client-owned business logic or duplicated domain authority |

---

## OrdersTab State

| State | Class | Source | Evidence |
|-------|-------|--------|----------|
| `order.status` (per card) | Domain State | `order.list` response | `OrdersTab` line 3951 |
| `order.totalAmount`, items, customer fields | Domain State | `order.list` | Lines 4006–4030 |
| `allOrders` (React Query cache) | Projection State | Cached `order.list` payload | Line 3858 |
| `statusFilter` | View State | `useState("all")` | Line 3849 |
| `timelineSessionId` | View State | `useState(null)` | Line 3850 |
| `orders` (filtered list) | View State | `useMemo` filter on projection | Lines 3864–3868 |
| `sessionOrderCounts` | Projection State (client-derived) | `buildVisibleSessionOrderCounts(orders)` | Lines 3870–3873 |
| `statusColors`, `statusLabels` | View State | Inline maps | Lines 3875–3889 |
| `updateStatusMutation.isPending` | View State (temporary) | React Query mutation state | Line 3891 |
| `ordersBlocked` | View State (gate) | Email verification error | Line 3862 |

---

## Dashboard Home Snapshot State

| State | Class | Source | Evidence |
|-------|-------|--------|----------|
| `orderStats.today.*` | **Invalid State** | `buildOrderStatistics(allOrders)` client computation | Lines 951–954, 3450–3480 |
| `overview.pendingOrders` | Projection State | `ops.getRestaurantOverview` | Line 934 |
| `newOrders`, `preparingOrders`, `todayRevenue` | **Invalid State** (partial) | Derived from client `orderStats` + ops | Lines 980–982 |

**Duplicated domain authority:** Home shows pending counts from both `ops.getRestaurantOverview` and client-computed `orderStats.today.statusBreakdown`.

---

## Reports Tab State

| State | Class | Evidence |
|-------|-------|----------|
| `orderStats` | **Invalid State** | `buildOrderStatistics` lines 3581–3583 |
| `monthlyReport`, `yearlySummary` | **Invalid State** | `buildMonthlyReport`, `buildYearlySummary` lines 3585–3591 |
| `reportYear`, `reportMonth` | View State | Lines 3553–3554 |
| Settlement sections data | Projection State | `ops.getSettlementSummary`, `ops.getSettlementTrend` |

---

## Session Workspace Sheet State

| State | Class | Evidence |
|-------|-------|----------|
| `data` (session workspace) | Projection State | `session.getOwnerWorkspace` line 83 |
| `restaurantOrders` | Projection State | `order.list` line 91 |
| `itemsCount` | **Invalid State** | `countSessionItems(restaurantOrders, sessionId)` — client derivation |
| `settlementSummary` | **Invalid State** | `deriveSettlementSummary(data.events, ...)` — client derivation |
| `sheetSide` | View State | Responsive bottom/right sheet | Lines 115–119 |

---

## OrderAlertSystem State

| State | Class | Evidence |
|-------|-------|----------|
| `unreadNotifications` | Projection State | `notification.getUnread` line 56 |
| `alerts[]` | View State | Local overlay queue | Lines 33, 96 |
| `lastSeenIdRef` | View State | Dedup cursor | Line 34 |
| `soundEnabled` | View State | User preference | Line 32 |

---

## Global / Persistent UI State

| State | Class | Evidence |
|-------|-------|----------|
| `restaurantTab` | View State | `Dashboard.tsx` line 194 |
| `selectedRestaurantId` | View State | Dashboard state |
| `dashboard:lastRestaurantId` | View State | sessionStorage |
| Sidebar collapse | View State | localStorage via `RestaurantSidebarProvider` |
| React Query cache (all order queries) | Projection State | tRPC React Query |

---

## Duplicated Domain State

| Duplication | Locations | Risk |
|-------------|-----------|------|
| **Order status labels** | `orderStatusDisplay.ts` + inline in `OrdersTab` + inline in `ReportsTab` | Drift between customer and owner UI |
| **Pending order count** | `ops.getRestaurantOverview.pendingOrders` vs `buildOrderStatistics` pending+preparing | Inconsistent KPI definitions |
| **Today sales** | Client `completedSales` (served only) vs settlement ops APIs | Different revenue definitions |
| **Full order list** | 6+ independent `order.list` subscriptions | Cache coherence relies on React Query dedup (same key) |
| **Session order totals** | `session.getOwnerWorkspace.ordersTotalAmount` vs client `countSessionItems` from `order.list` | Potential mismatch if sources diverge |

---

## Invalid State Summary

Per ADR-ARCH-006 and ADR-ARCH-009, the following are **architecturally invalid** (documented, not fixed in this investigation):

1. `buildOrderStatistics` — business KPI computation in UI layer
2. `buildMonthlyReport` / `buildYearlySummary` — sales analytics in UI layer
3. `computeTodayCompletedSales` — `SessionsWorkspacePanel.tsx`
4. `deriveSettlementSummary` — settlement state machine in client
5. `countSessionItems` — order item aggregation in client
6. `sessionWorkspaceOps.ts` board derivations — operational projection in client

**ADR evidence:** `docs/architecture/adrs/ADR-ARCH-006.md` line 15; `ADR-ARCH-009.md` line 19.
