# RM-05 — KPI Audit

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## KPI Inventory

### Server-Side KPIs

| KPI | Location | Calculation | Consumers | ADR Compliant? |
|-----|----------|-------------|-----------|----------------|
| `activeSessions` | `restaurantOverview.ts` | COUNT open dining sessions | Home, Sessions ops | ✓ |
| `occupiedTables` | `restaurantOverview.ts` | COUNT DISTINCT tableId | Home, Sessions ops | ✓ |
| `pendingOrders` | `getActiveOrdersCount` | COUNT orders status ∈ pending/preparing/ready | `ops.getRestaurantOverview` | ✓ |
| `pendingOrders` (per session) | `activeTablesBoard.ts` | GROUP BY sessionId | Tables board | ✓ |
| `totalOrders` (session) | `sessionAggregateReaders` | Maintained column or computed from order rows | Session workspace | ✓ |
| `ordersTotalAmount` (session) | `sessionAggregateReaders` | Maintained or `computeOrdersTotalAmount` | Session workspace | ✓ |
| `paidRevenue` | `settlementMetrics.ts` | SUM session totalAmount WHERE paid | Reports settlement | ✓ |
| `paidSessionCount` | `settlementMetrics.ts` | COUNT settled paid sessions | Reports settlement | ✓ |
| Settlement trend points | `settlementMetrics.ts` | Time-bucketed aggregation | Reports trends | ✓ |
| `longRunningSessions` | `actionCenter.ts` | Duration ≥ threshold | Home action center | ✓ |
| Commercial executive KPIs | `CommercialReadService` | Admin export package | Admin only | ✓ (out of restaurant ops scope) |

---

### Client-Side KPIs (ADR-ARCH-006 Violations)

| KPI | Function | File | Inputs | Used By |
|-----|----------|------|--------|---------|
| Today total orders | `buildOrderStatistics` | `Dashboard.tsx:3450` | Full `order.list` | Home, Reports |
| Today completed orders | `buildOrderStatistics` | same | status === `served` | Home, Reports |
| Today completed sales | `buildOrderStatistics` | same | Sum served today amounts | Home, Reports |
| Today pending orders | `buildOrderStatistics` | same | pending + preparing count | Home (`statusCount`) |
| Today status breakdown | `buildOrderStatistics` | same | Per-status counts today | Home |
| Month total orders | `buildOrderStatistics` | same | Orders in current month | Reports |
| Month completed orders | `buildOrderStatistics` | same | Served in month | Reports |
| Month total sales | `buildOrderStatistics` | same | Sum served month amounts | Reports |
| Monthly report rows | `buildMonthlyReport` | `Dashboard.tsx:3494` | Per-day counts/sales | Reports Excel |
| Yearly summary rows | `buildYearlySummary` | `Dashboard.tsx:3513` | Per-month counts/sales | Reports Excel |
| Today completed sales (sessions) | `computeTodayCompletedSales` | `SessionsWorkspacePanel.tsx:36` | Full order list | Sessions tab KPI |
| Session item count | `countSessionItems` | `diningSessionWorkspaceView.ts` | order.list + sessionId | Session sheet |
| Settlement state | `deriveSettlementSummary` | `diningSessionWorkspaceView.ts:27` | Session events | Session sheet |
| Session status metrics | `computeTableStatusMetrics` | `sessionWorkspaceOps.ts` | Board rows | Sessions board |
| Line item subtotal | inline | `OrdersTab` | price × quantity per card | Orders tab display |

---

## Duplicated Logic

| Metric | Server definition | Client definition | Mismatch risk |
|--------|-------------------|-------------------|---------------|
| Active/pending orders | `getActiveOrdersCount`: pending+preparing+ready | `buildOrderStatistics.pendingOrders`: pending+preparing only | **Yes** — different status sets |
| Pending orders (overview) | `ops.pendingOrders` (3 statuses) | Home `newOrders` = pending only from breakdown | **Yes** |
| Today revenue | Settlement uses session settled revenue | Client uses served **order** totals | **Yes** — different domain concepts |
| Session order count | `resolveSessionAggregates` | `countSessionItems` from separate order.list | Medium — dual fetch |
| Completed = served | Domain terminal status | `isCompletedOrder` client helper | Aligned |

---

## Client vs Server Classification

```
┌─────────────────────────────────────────────────────────┐
│              ORDER-RELATED KPI AUTHORITY                 │
├──────────────────────┬──────────────────────────────────┤
│ SERVER (compliant)   │ CLIENT (non-compliant)            │
├──────────────────────┼──────────────────────────────────┤
│ pendingOrders (ops)  │ buildOrderStatistics.*            │
│ board pending/session│ buildMonthlyReport                │
│ settlement revenue   │ buildYearlySummary                │
│ session aggregates   │ computeTodayCompletedSales        │
│                      │ deriveSettlementSummary           │
│                      │ countSessionItems                 │
│                      │ computeTableStatusMetrics         │
└──────────────────────┴──────────────────────────────────┘
```

---

## Scalability of KPI Computation

| Approach | Scale behavior |
|----------|----------------|
| Server `getActiveOrdersCount` | O(1) indexed COUNT — scales |
| Server settlement aggregations | Filtered session query — scales with date range |
| Client `buildOrderStatistics` | O(n) per restaurant full order history — **degrades** |
| Client `buildMonthlyReport` | O(n × days) — **degrades** |
| Client poll + full list | Network + parse grows with order volume — **degrades** |

---

## Every Client-Side Operational KPI (Complete List)

1. `buildOrderStatistics` — all fields (today + month)
2. `buildMonthlyReport` — daily order count + sales
3. `buildYearlySummary` — monthly order count + sales
4. `buildTodayReport` — **dead code**, no callers (`Dashboard.tsx:3483`)
5. `statusCount` — helper for breakdown extraction
6. `computeTodayCompletedSales` — Sessions tab
7. `countSessionItems` — session sheet
8. `deriveSettlementSummary` — session sheet
9. `buildVisibleSessionOrderCounts` — order card labels (`diningSessionDashboardCopy.ts`)
10. `computeTableStatusMetrics` — sessions board (`sessionWorkspaceOps.ts`)
11. Inline line-item `parseFloat(line.price) * line.quantity` — display math (acceptable presentation)

**ADR-ARCH-006 evidence:** `docs/architecture/adrs/ADR-ARCH-006.md` — "Dashboard computes statistics client-side."

**ORDER-1 debt:** CV-05 assigned to ORDERS-WORKSPACE-1 / read model programs.

---

## Required Server KPIs (per ADR-ARCH-009, not implemented)

- Today orders count
- Today served sales (order-based)
- Month orders / sales
- Status breakdown (today)
- Daily/monthly report series
- Owner active orders queue metrics

**None exist as dedicated read APIs.**
