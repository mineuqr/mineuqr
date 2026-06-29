# RA-03 — Query Catalog

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Catalog Rules

1. Every query maps to **one primary projection** (may compose read services).
2. Queries are **reusable** across UI surfaces — no dashboard-specific one-offs.
3. All owner queries require **verified auth** + **restaurant access**.
4. Pagination is **mandatory** for list queries returning unbounded collections.
5. Legacy `order.list` is **deprecated** — mapped to migration queries below.

**Traceability:** Blueprint §11 OrderQueryFacade; ORDERS-READ-MODEL-1 RM-04; Principle 7 (purpose-built queries).

---

## Order Read Queries (New — `order.read.*`)

### Q-01: `order.read.listActive`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Live operational order list for owner workspace |
| **Primary projection** | P-02 Active Orders |
| **Callers** | ORDERS-WORKSPACE-1 Orders tab, Sessions board order join |
| **Authorization** | `verifiedProcedure` + `assertRestaurantAccess(restaurantId)` |
| **Filtering** | `restaurantId` (required); `status` optional ∈ {pending, preparing, ready, all-active} |
| **Sorting** | `createdAt DESC` default; optional `readyAt ASC` for kitchen-adjacent views |
| **Pagination** | `cursor` or `offset/limit`; default limit 50; max 100 |
| **Output contract** | `ActiveOrderListResult`: `{ generatedAt, items[], pageInfo }` — each item: orderId, orderNumber, status, tableNumber, sessionId, customerName, customerPhone, notes, totalAmount, createdAt, lineItems[] |

**Replaces:** `order.list` for operational UI.

---

### Q-02: `order.read.listHistory`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Historical orders for reports and audit (includes terminal statuses) |
| **Primary projection** | P-01 Owner Orders |
| **Callers** | Reports tab, export flows |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `restaurantId`; `status` optional; `from`/`to` on createdAt (required for large tenants) |
| **Sorting** | `createdAt DESC` |
| **Pagination** | Required — default limit 100 |
| **Output contract** | `OrderHistoryListResult` — same item shape as Q-01 with served/cancelled timestamps |

**Replaces:** `order.list` for reports.

---

### Q-03: `order.read.getDetail`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Single order operational detail |
| **Primary projection** | P-03 Order Details |
| **Callers** | Order detail panel, session workspace |
| **Authorization** | Verified + restaurant access via order's restaurantId |
| **Filtering** | `orderId` |
| **Sorting** | N/A |
| **Pagination** | N/A |
| **Output contract** | `OwnerOrderDetailDto` — full header, lines, status, readyAt, sessionId, timeline summary pointer |

**Replaces:** `order.getById` (unused).

---

### Q-04: `order.read.getTimeline`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Status transition history for one order |
| **Primary projection** | P-04 Order Timeline |
| **Callers** | Order detail, activity enrichment |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `orderId` |
| **Sorting** | `occurredAt ASC` |
| **Pagination** | Optional limit (default all) |
| **Output contract** | `OrderTimelineResult`: `{ orderId, events[] }` |

---

### Q-05: `order.read.getOperationalKpis`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Today-scope operational KPIs for dashboard home |
| **Primary projection** | P-06 Operational KPI |
| **Callers** | Home operational snapshot, Orders tab badge counts |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `restaurantId`; implicit today in restaurant timezone |
| **Sorting** | N/A |
| **Pagination** | N/A |
| **Output contract** | `OperationalKpiDto`: `{ generatedAt, activeOrders, pendingOrders, preparingOrders, readyOrders, statusBreakdown[] }` |

**Replaces:** Client `buildOrderStatistics.today.*`, `statusCount`.

---

### Q-06: `order.read.getAnalyticsSummary`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Today and month order analytics for reports KPI cards |
| **Primary projection** | P-10 Analytics |
| **Callers** | Reports tab KPI cards |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `restaurantId`; optional `year`, `month` |
| **Sorting** | N/A |
| **Pagination** | N/A |
| **Output contract** | `OrderAnalyticsSummaryDto`: today/month totals, completedOrders, completedSales |

**Replaces:** `buildOrderStatistics` month/today blocks.

---

### Q-07: `order.read.getAnalyticsRollup`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Daily or monthly series for reports tables and Excel |
| **Primary projection** | P-10 Analytics |
| **Callers** | Reports tab, Excel export |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `restaurantId`; `granularity` ∈ {day, month}; `year`; optional `month` |
| **Sorting** | Period key ASC |
| **Pagination** | N/A (bounded by calendar) |
| **Output contract** | `OrderAnalyticsRollupDto`: `{ periods[]: { periodKey, orderCount, completedSales } }` |

**Replaces:** `buildMonthlyReport`, `buildYearlySummary`.

---

### Q-08: `order.getPublicStatus` (Retained — projection-backed)

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Guest order tracking |
| **Primary projection** | P-11 Public Order Status |
| **Callers** | `OrderStatusPage` |
| **Authorization** | `publicProcedure` — trackingToken + slug |
| **Filtering** | Token + tenant slug |
| **Sorting** | N/A |
| **Pagination** | N/A |
| **Output contract** | Existing `PublicOrderStatus` DTO (unchanged contract) |

**Migration:** Implementation switches backing store from `getOrderByTrackingToken` to projection read service — **API contract stable**.

---

## Operations Queries (Existing — Extend)

### Q-10: `ops.getRestaurantOverview` (Extend)

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Dashboard snapshot metrics |
| **Primary projection** | P-05 Dashboard |
| **Callers** | Home, Sessions tab |
| **Change** | `pendingOrders` sourced from P-06 canonical counter — not separate COUNT query with divergent definition |
| **Output contract** | Unchanged shape: `{ activeSessions, occupiedTables, pendingOrders }` |

---

### Q-11–Q-16: Existing Ops Queries (Retain)

| Query | Projection | Status |
|-------|------------|--------|
| `ops.getActiveTablesBoard` | P-05 + session data | Retain; pending per session from P-02 |
| `ops.getActionCenter` | Session projection | Retain |
| `ops.getActivityFeed` | Mixed; enrich with P-04 over time | Retain then enhance |
| `ops.getSettlementSummary` | P-09 | Retain — certified |
| `ops.getSettlementBreakdown` | P-09 | Retain |
| `ops.getSettlementTrend` | P-09 | Retain |

---

## Kitchen Read Queries (Future — KITCHEN-DISPLAY-1)

### Q-20: `kitchen.read.getQueue`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Kitchen display queue |
| **Primary projection** | P-07 Kitchen Queue |
| **Callers** | KITCHEN-DISPLAY-1 |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `restaurantId`; optional station filter (future) |
| **Sorting** | FIFO by createdAt or priority rules (display policy — not domain) |
| **Pagination** | Limit default 200 active tickets |
| **Output contract** | `KitchenQueueResult`: tickets with orderNumber, table, lines summary, status, elapsed |

---

## Printing Read Queries (Future — PRINTING-1)

### Q-30: `kitchen.read.getQueue` → **Q-30: `printing.read.getQueue`**

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Print workspace job list |
| **Primary projection** | P-08 Printing Queue |
| **Callers** | PRINT-WORKSPACE-1 |
| **Authorization** | Verified + restaurant access |
| **Filtering** | `restaurantId`; `status` optional |
| **Sorting** | `createdAt DESC` |
| **Pagination** | Required |
| **Output contract** | `PrintQueueResult`: jobs with orderId, orderNumber, eventType, status, attempts |

### Q-31: `printing.read.getConnectorStatus`

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Connector health for PRINT-CONNECTOR-1 |
| **Primary projection** | Connector status store (PRINT-CONNECTOR-1 scope) |
| **Callers** | PRINT-CONNECTOR-1 admin UI |

---

## Session Queries (Composite — Extend)

### Q-40: `session.getOwnerWorkspace` (Extend)

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Session drill-down |
| **Primary projection** | P-12 composite — orders from P-03 list by sessionId |
| **Change** | Remove client `order.list` fetch; settlement state from server not `deriveSettlementSummary` |
| **Output contract** | Extend with `settlementState` server field |

---

## Deprecated Queries

| Legacy Query | Replacement | Deprecation Phase |
|--------------|-------------|-------------------|
| `order.list` | Q-01 + Q-02 | RA-08 Phase 2–3 |
| `order.getById` | Q-03 | Phase 2 |
| `order.activeCount` | Q-05 / P-06 | Phase 1 (already embedded in ops) |
| `order.trackOrder` | Removed | Already deprecated |

---

## Reusability Matrix

| Query | Orders Tab | Home | Reports | Sessions | Kitchen | Print |
|-------|------------|------|---------|----------|---------|-------|
| Q-01 listActive | ✓ | — | — | ✓ join | — | — |
| Q-05 getOperationalKpis | badges | ✓ | — | — | — | — |
| Q-06 getAnalyticsSummary | — | — | ✓ | — | — | — |
| Q-07 getAnalyticsRollup | — | — | ✓ | — | — | — |
| Q-10 getRestaurantOverview | — | ✓ | — | ✓ | — | — |
| Q-20 getQueue | — | — | — | — | ✓ | — |
| Q-30 getQueue | — | — | — | — | — | ✓ |

---

## References

- ORDERS-READ-MODEL-1 RM-04 Query Inventory
- ORDERS-WORKSPACE-1 INV-09 Data Source Audit
- Blueprint §11 `OrderQueryFacade`
