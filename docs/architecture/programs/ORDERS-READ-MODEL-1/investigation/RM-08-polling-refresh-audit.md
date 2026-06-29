# RM-08 — Polling & Refresh Audit

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Polling Constants

**Source:** `client/src/lib/queryRuntime.ts`

| Constant | Value | Purpose |
|----------|-------|---------|
| `DASHBOARD_ORDER_LIST_POLL_MS` | 10,000 ms | Owner order list + ops queries |
| `DASHBOARD_NOTIFICATION_POLL_MS` | 10,000 ms | Notifications |
| `CUSTOMER_ORDER_STATUS_POLL_MS` | 8,000 ms | Guest tracking |

---

## Polling Inventory

| API | Interval | Trigger | Component(s) | Payload |
|-----|----------|---------|----------------|---------|
| `order.list` | 10s | `orderListQueryOptions` | OrdersTab, ReportsTab, SessionsWorkspacePanel, ActiveSessionsTableSection | Full restaurant orders + all items |
| `order.list` | None (staleTime 120s) | `homeSnapshotOrderQueryOptions` | OperationalSnapshotSection | Same full payload |
| `order.list` | On sheet open, staleTime 30s | DiningSessionWorkspaceSheet | Session sheet | Same full payload |
| `ops.getRestaurantOverview` | 10s | `opsOverviewQueryOptions` | Home, SessionsWorkspacePanel | Small metrics object |
| `ops.getActiveTablesBoard` | 10s | `opsActiveTablesBoardQueryOptions` | Board sections | Table rows array |
| `ops.getActionCenter` | 10s | `opsActionCenterQueryOptions` | ActionCenterSection | Long-running sessions |
| `ops.getActivityFeed` | 10s | `opsActivityFeedQueryOptions` | Activity feed (2 queries in component) | Limited event list |
| `ops.getSettlementSummary` | 10s | `opsSettlementSummaryQueryOptions` | SettlementOverviewSection | Summary DTO |
| `ops.getSettlementTrend` | 10s | `opsSettlementTrendQueryOptions` | SettlementTrendsSection | Trend points |
| `session.getOwnerWorkspace` | 10s (when open) | sheet enabled + poll options | DiningSessionWorkspaceSheet | Session workspace DTO |
| `notification.getUnread` | 10s | global | OrderAlertSystem, header | Notification array |
| `order.getPublicStatus` | 8s until terminal | `customerOrderStatusQueryOptions` | OrderStatusPage | Public status DTO |

---

## Non-Polling Refresh

| Mechanism | API | Trigger |
|-----------|-----|---------|
| Mutation refetch | `order.list` | `updateStatusMutation.onSuccess → refetch()` |
| Cache invalidation | `order.list`, `ops.getRestaurantOverview` | Session actions (`DiningSessionActionBar`, `SessionRowQuickActions`) |
| Manual retry | ops + order on home | Error state retry buttons |

---

## Concurrent Poll Load (Orders Tab Active)

Minimum background requests per 10s window:
- `order.list` × 1
- `notification.getUnread` × 1

**Sessions tab active** adds:
- `ops.getRestaurantOverview` × 1
- `ops.getActiveTablesBoard` × 1
- `ops.getActivityFeed` × 1–2
- `order.list` × 1

**Reports tab active** adds:
- `order.list` × 1
- `ops.getSettlementSummary` × 1
- `ops.getSettlementTrend` × 1

---

## Payload Size Concerns

| Poll | Grows with |
|------|------------|
| `order.list` | Total historical orders × line items — **unbounded** |
| Ops queries | Active sessions/tables — bounded |
| Settlement | Date range — bounded |
| Notifications | Unread count — typically small |

**Dominant cost:** `order.list` full history with nested items every 10s.

---

## Architectural Classification

| Mechanism | Classification | Rationale |
|-----------|----------------|-----------|
| 10s dashboard polling | **Transitional** | No WebSocket/SSE; comment in `queryRuntime.ts` references H-03 home snapshot reduction |
| 8s customer polling | **Transitional** | PR-CUX-1B tracking UX |
| Mutation refetch | **Correct short-term** | Compensates for lack of event-driven UI |
| No server push | **Gap** | Events processed server-side but not pushed to owner UI |

**Evidence of transitional intent:** `homeSnapshotOrderQueryOptions` — "fetch once per visit, no 10s poll — reduces load vs full order.list polling (H-03)" (`queryRuntime.ts` line 73).

Polling is a **workaround** for missing read-model push/subscribe, not an approved long-term architecture.

---

## Event-Driven Refresh Gap

```
OrderCreated / OrderStatusChanged
  → consumers (notification, session, etc.)
  → NO read projection update
  → NO UI subscription
  → owner waits for next poll (up to 10s)
```

Exception: `OrderAlertSystem` polls `notifications` table (indirect, up to 10s delay).

---

## DEV Diagnostics

`useDevQueryRuntimeLog` registers poll intervals in DEV and warns on duplicate registrations (`queryRuntime.ts` lines 98–139).

---

## Scalability of Polling Model

| Scale factor | Effect |
|--------------|--------|
| More restaurants | Linear per-owner (isolated) |
| More orders per restaurant | **Linear payload growth** per poll |
| More dashboard tabs mounted | React Query dedupes same key — single network request per key |
| More concurrent owners | Server load = owners × polls/sec × payload |

**Bottleneck:** `order.list` poll with unbounded payload.
