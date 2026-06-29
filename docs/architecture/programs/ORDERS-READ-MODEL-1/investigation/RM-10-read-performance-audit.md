# RM-10 — Read Performance Audit

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26  
**Note:** Documentation only. No optimization.

---

## N+1 Risks

### PERF-01: Order List + Items (Confirmed)

**Pattern:** 1 query for orders + N queries for items per order.

**Evidence:** `getOrdersWithItemsByRestaurant` — `Promise.all(orderList.map(... getOrderItemsByOrderId))` (`db.ts` 1069–1073).

**Impact:** Grows linearly with order count per restaurant.

---

### PERF-02: Router Access Check + Service Load

**Pattern:** `updateStatus` calls `getOrderById` then `AdvanceOrderStatusService` loads via repository again.

**Evidence:** `routers.ts` 1910–1917; `DrizzleOrderRepository.findById`.

**Impact:** 2 reads per mutation (write flow, not pure read).

---

### PERF-03: Consumer Enrichment Reads

**Pattern:** `OrderNotificationConsumer` on `OrderCreated` reads restaurant + all order items.

**Evidence:** `OrderNotificationConsumer.ts` 54–57.

**Impact:** Per event, not per UI poll — scales with order volume at write time.

---

### PERF-04: Activity Feed Dual Query

**Pattern:** Parallel `table_events` + `orders` queries per feed request.

**Evidence:** `activityFeed.ts` 319–322.

**Impact:** Bounded by limit — acceptable.

---

## Duplicated Queries

| Duplication | Evidence |
|-------------|----------|
| `order.list` mounted in 5+ components | Grep `trpc.order.list.useQuery` — React Query dedupes network |
| `order.list` + `session.getOwnerWorkspace` when sheet open | `DiningSessionWorkspaceSheet.tsx` 83–96 |
| `order.list` + `ops.getActiveTablesBoard` on sessions tab | `ActiveSessionsTableSection.tsx` |
| `ops.getActivityFeed` called twice in one component | `OperationalActivityFeedSection.tsx` lines 262, 273 |
| `getOrderById` in router + repository + consumers | Multiple callers |

---

## Unnecessary Payloads

| Payload | Issue | Evidence |
|---------|-------|----------|
| Full order history on Orders tab | Served/cancelled orders loaded for operational view | No status filter on API call from UI |
| All line items for all orders | Large JSON per poll | `getOrdersWithItemsByRestaurant` always includes items |
| Full order list for session item count | Could use workspace `orders` array | Sheet fetches both workspace + full list |
| Customer fields on owner list | PII in every card | Order row includes customerName, phone |

---

## Expensive Client Aggregations

| Function | Complexity | Trigger |
|----------|------------|---------|
| `buildOrderStatistics` | O(n) | Every `order.list` update |
| `buildMonthlyReport` | O(n × daysInMonth) | Reports tab poll |
| `buildYearlySummary` | O(n × 12) | Reports tab poll |
| `orders.map` render in OrdersTab | O(n × items) | Every render + poll |

---

## Repeated Reads

| Scenario | Reads per 10s (Sessions tab) |
|----------|------------------------------|
| `order.list` | 1 (deduped) |
| `ops.getRestaurantOverview` | 1 |
| `ops.getActiveTablesBoard` | 1 |
| `ops.getActivityFeed` | 1–2 |
| `notification.getUnread` | 1 (global) |

**Sheet open adds:** `session.getOwnerWorkspace` + `order.list` (staleTime 30s but still subscribed).

---

## Rendering Hotspots (Read-Related)

| Hotspot | Cause |
|---------|-------|
| Full list re-render on poll | No virtualization; all cards rendered |
| Reports tab triple derivation | Three `useMemo` over full orders on each poll |
| Nested `order.items.map` | Per-card line item iteration |

---

## Database Read Patterns (No index audit)

| Query | Pattern |
|-------|---------|
| `getOrdersByRestaurant` | `WHERE restaurantId` ORDER BY createdAt DESC — full scan per tenant |
| `getActiveOrdersCount` | Filtered COUNT — narrower |
| `getOrderByTrackingToken` | Indexed lookup (token + slug) LIMIT 1 |
| Board pending rollup | GROUP BY sessionId with status filter |

**No pagination LIMIT on owner order list.**

---

## Performance Risk Summary

| ID | Risk | Severity |
|----|------|----------|
| PERF-01 | N+1 order items | High |
| PERF-05 | Unbounded order list payload | High |
| PERF-06 | 10s poll of full payload | High |
| PERF-07 | Client analytics on full dataset | Medium |
| PERF-08 | Duplicate activity feed query | Low |
| PERF-09 | Sheet dual fetch | Medium |

**No measurements taken** — structural analysis only per investigation rules.
