# RM-09 — Server Aggregation Audit

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Server-Side Aggregations

| Aggregation | Location | SQL / Logic | Consumers |
|-------------|----------|-----------|-----------|
| Active orders count | `getActiveOrdersCount` | `COUNT(*)` WHERE status IN (pending, preparing, ready) | `getRestaurantOverview` |
| Active sessions count | `resolveActiveSessionOverviewMetrics` | `COUNT(*)` on dining_sessions | Overview |
| Occupied tables count | same | `COUNT(DISTINCT tableId)` | Overview |
| Pending orders by session | `resolvePendingOrdersBySessionId` | `GROUP BY sessionId` | Active tables board |
| Activity feed merge | `mergeActivityFeedEvents` | Sort + slice limit | Activity feed |
| Settlement paid revenue | `getSettlementSummary` | SUM totalAmount WHERE paid | Reports |
| Settlement trend buckets | `getSettlementTrend` | Time-grouped SUMs | Reports |
| Session order count/amount | `resolveSessionAggregates` | Maintained columns OR compute from order rows | Session workspace |
| Public order item count | `getOrderByTrackingToken` | `SUM(quantity)` subquery | Guest status |
| Order number generation | `generateOrderNumber` | COUNT orders per restaurant | Write path |

---

## Client-Side Aggregations

| Aggregation | Location | Logic |
|-------------|----------|-------|
| Today order stats | `buildOrderStatistics` | Filter by date, count by status, sum served amounts |
| Monthly report | `buildMonthlyReport` | Per-day filter + sum |
| Yearly summary | `buildYearlySummary` | Per-month filter + sum |
| Today completed sales | `computeTodayCompletedSales` | Filter served today + sum |
| Session item count | `countSessionItems` | Sum quantities for session from order list |
| Settlement summary | `deriveSettlementSummary` | State machine from session events |
| Session order counts visible | `buildVisibleSessionOrderCounts` | Count orders per session in filtered list |
| Table status metrics | `computeTableStatusMetrics` | Count open/paid/complimentary from board rows |
| Session table number map | `buildSessionTableNumbers` | Map sessionId → tableNumber from orders |
| Operational table rows | `buildOperationalTableRows` | Enrich board with session status |

---

## Duplicated Aggregations

| Metric | Server | Client | Aligned? |
|--------|--------|--------|----------|
| Active/pending orders | `getActiveOrdersCount` (3 statuses) | `pendingOrders` in stats (2 statuses) | **No** |
| Pending per session | `resolvePendingOrdersBySessionId` | — | Server only |
| Today served revenue | — | `buildOrderStatistics.completedSales` | Client only |
| Session order total | `resolveSessionAggregates` | `countSessionItems` (items not amount) | Partial overlap |
| Settlement revenue | `getSettlementSummary` | `deriveSettlementSummary` | Different models (session vs events) |

---

## Reusable Server Aggregations (underutilized)

| API | Could replace | Currently |
|-----|---------------|-----------|
| `getActiveOrdersCount` | Client pending counts | Embedded in ops only; `order.activeCount` unused |
| `getOrdersBySessionId` | Full list for session items | Used server-side; client still fetches full list |
| `session.getOwnerWorkspace` aggregates | `countSessionItems` | Partial — client still re-derives |
| `ops.getSettlementSummary` | — | Used correctly |

---

## Violations (Client aggregation of operational KPIs)

| ID | Violation | Severity | ADR |
|----|-----------|----------|-----|
| SA-01 | `buildOrderStatistics` replaces required server analytics API | Critical | ADR-ARCH-006, ADR-ARCH-009 |
| SA-02 | `computeTodayCompletedSales` duplicates order revenue KPI | High | ADR-ARCH-006 |
| SA-03 | `deriveSettlementSummary` duplicates settlement read | High | ADR-ARCH-006 |
| SA-04 | Client joins order.list with ops board | Medium | ADR-ARCH-009 |
| SA-05 | Conflicting pending order definitions | Medium | ADR-ARCH-002 |

---

## Server Aggregations Missing (per architecture)

| Required aggregation | Status |
|---------------------|--------|
| Today order count (server) | Missing |
| Today served sales (order-based) | Missing |
| Month order/sales summary | Missing |
| Status breakdown today | Missing |
| Active orders list (not full history) | Missing |
| Kitchen queue by status/station | Missing |
| Print job queue | Missing |

---

## Aggregation Location Diagram

```
                    SERVER                          CLIENT
                    ──────                          ──────
Overview KPIs       getRestaurantOverview ──────────► (display only)
Order KPIs          getActiveOrdersCount ───┐
                                            ├── mismatch
Order KPIs          (missing) ────────────┘      buildOrderStatistics
Settlement KPIs     settlementMetrics ───────────► (display only)
Session KPIs        sessionAggregates ───┐
                                         ├── dual fetch
Session KPIs        (partial) ─────────┘       countSessionItems
Board               activeTablesBoard ───┐
                                         ├── client enrichment
Board               (complete server) ───┘       sessionWorkspaceOps
```
