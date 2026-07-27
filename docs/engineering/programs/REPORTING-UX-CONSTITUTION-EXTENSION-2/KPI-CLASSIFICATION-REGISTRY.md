# KPI Classification Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Constitution** | KPI-08 |
| **Code SSOT (definitions)** | `shared/reporting-platform/kpiDictionary.ts` |
| **Date** | 2026-07-27 |

Every registered product KPI has **exactly one** class. Display in a secondary Analytics area does not create a second class.

| KPI id | Business Name | Class | Audience | Business purpose |
|--------|---------------|-------|----------|------------------|
| `revenue` | Total Sales | **1 Executive** | Owner / GM / Area | Financial sales health |
| `orderSales` | Sales Orders | **1 Executive** | Owner / GM / Area | Operational sales volume |
| `orderCount` | Orders | **1 Executive** | Owner / GM / Area | Order activity volume |
| `refundPublishedTotal` | Refund Amount | **1 Executive** | Owner / GM / Area | Refund magnitude at a glance |
| `taxCollected` | Tax Collected | **1 Executive** | Owner / GM / Area | Tax collected health |
| `completedOrders` | Completed Orders | **2 Operational** | Ops / Floor / Managers | Completed order throughput |
| `pendingOrders` | Pending Orders | **2 Operational** | Ops / Kitchen / Floor | Queue backlog |
| `activeOrders` | Active Orders | **2 Operational** | Ops / Kitchen | In-flight operational load |
| `kitchenLoad` | Kitchen Load | **2 Operational** | Kitchen / Ops | Kitchen pressure |
| `activeSessions` | Active Sessions | **2 Operational** | Ops / Floor | Live session load |
| `occupiedTables` | Occupied Tables | **2 Operational** | Floor / Ops | Floor occupancy |
| `netRevenue` | Net Sales | **3 Financial** | Finance / Owner | Sales after refunds |
| `paidCheckCount` | Paid Checks | **3 Financial** | Finance / Ops | Paid check volume |
| `dailySales` | Daily Total Sales | **3 Financial** | Finance / Owner | Day-bucketed financial sales |
| `refundPublicationCount` | Refund Count | **3 Financial** | Finance | Refund publication volume |
| `averageCheck` | Average Check | **4 Diagnostic** | Finance / investigation | Typical paid-check value |
| `averageOrder` | Average Order | **4 Diagnostic** | Ops / investigation | Typical completed-order value |
| `refundRate` | Refund Rate | **4 Diagnostic** | Finance / investigation | Refund intensity vs Total Sales |
| `complimentaryCount` | Complimentary Count | **4 Diagnostic** | Finance / investigation | Comp volume |
| `complimentaryAmount` | Complimentary Amount | **4 Diagnostic** | Finance / investigation | Comp monetary impact |
| `voidedCount` | Voided Count | **4 Diagnostic** | Ops / investigation | Void activity |
| `topSellingItems` | Top Selling Items | **4 Diagnostic** | Ops / merchandising | Item-level investigation |
| `catalogCategoryCount` | Catalog Categories | **4 Diagnostic** | Ops / catalog | Catalog structure signal |
| `catalogItemCount` | Catalog Items | **4 Diagnostic** | Ops / catalog | Catalog size signal |
| `menuVisits` | Menu Visits | **4 Diagnostic** | Growth / investigation | Menu engagement |

## Non-KPI Executive presentation

| Card id | Object | Class | Note |
|---------|--------|-------|------|
| `paymentOverview` | Widget / Card | N/A (not a KPI) | Executive companion under OBJ-02/04; promotion gates of KPI-09 apply to Executive placement |

## Class 5

See [Internal KPI Registry](./INTERNAL-KPI-REGISTRY.md) — not product dictionary entries.

## Classification change

Requires Architecture + Business Review per constitution change governance. Update this registry and KPI Dictionary documentation together.
