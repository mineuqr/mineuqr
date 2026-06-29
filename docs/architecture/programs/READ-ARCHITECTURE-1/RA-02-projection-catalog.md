# RA-02 — Projection Catalog

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Catalog Rules

1. Every projection is **derived** — never SSOT for order lifecycle.
2. Every projection has **one owning module** (RA-06).
3. Refresh is **event-driven** via Projection Consumers unless marked transitional (RA-07).
4. Naming follows `{Context}{Purpose}Projection` internally; API DTOs may use shorter names.

**Traceability:** Blueprint §11; ORDERS-READ-MODEL-1 RM-03; Constitution principles 2–3.

---

## P-01 — Owner Orders Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Historical and filtered owner view of orders with line items for workspace list and exports |
| **Owner** | `server/order/read/` — Order Read Context |
| **Source events** | `OrderCreated`, `OrderStatusChanged`, `OrderCompleted`, `OrderCancelled` |
| **Projection consumer** | `OwnerOrdersProjectionConsumer` |
| **Consistency** | Eventual — typically sub-second in-process; bounded by ADR-ARCH-014 relay |
| **Refresh policy** | Event-driven upsert per order; full row replace on status/line changes |
| **Consumers (applications)** | ORDERS-WORKSPACE-1 Orders tab, Reports tab (historical slice), session workspace order list |
| **Replaces** | `getOrdersWithItemsByRestaurant` (legacy) |

**Investigation basis:** ORDERS-READ-MODEL-1 GAP-R01, GAP-R04; Blueprint OwnerOrderList.

---

## P-02 — Active Orders Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Operational subset: orders in `pending`, `preparing`, or `ready` — optimized for live workspace |
| **Owner** | `server/order/read/` |
| **Source events** | Same as P-01; rows removed or archived on `OrderCompleted` / `OrderCancelled` |
| **Projection consumer** | `ActiveOrdersProjectionConsumer` (may share handler with P-01 with status index) |
| **Consistency** | Eventual |
| **Refresh policy** | Event-driven; active index maintained on status transitions |
| **Consumers** | ORDERS-WORKSPACE-1 Orders tab (primary), dashboard pending indicators |
| **Replaces** | Client-side status filter on full `order.list`; extends `getActiveOrdersCount` semantics |

**Investigation basis:** ORDERS-READ-MODEL-1 RM-04, RM-11; ORDERS-WORKSPACE-1 INV-09.

---

## P-03 — Order Details Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Single-order operational detail: header, lines, session link, timestamps, actor metadata |
| **Owner** | `server/order/read/` |
| **Source events** | `OrderCreated`, `OrderStatusChanged`, `OrderReady`, `OrderCompleted`, `OrderCancelled` |
| **Projection consumer** | `OrderDetailsProjectionConsumer` |
| **Consistency** | Eventual |
| **Refresh policy** | Event-driven upsert by `orderId` |
| **Consumers** | ORDERS-WORKSPACE-1 order detail view, session sheet order summary |
| **Replaces** | Unused `order.getById` raw read; inline card fields from list |

**Investigation basis:** ORDERS-READ-MODEL-1 GAP-R11; ORDERS-WORKSPACE-1 GAP-13.

---

## P-04 — Order Timeline Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Append-only status transition history per order for owner audit and activity views |
| **Owner** | `server/order/read/` |
| **Source events** | `OrderStatusChanged` (primary); initial entry from `OrderCreated` |
| **Projection consumer** | `OrderTimelineProjectionConsumer` |
| **Consistency** | Eventual; append-only per `eventId` idempotency |
| **Refresh policy** | Insert-on-event; no updates to historical entries |
| **Consumers** | ORDERS-WORKSPACE-1, ops activity feed enrichment (future), session timeline |
| **Replaces** | `activityFeed` proxy using `orders.updatedAt` only (ORDERS-READ-MODEL-1 RR-07) |

**Investigation basis:** `activityFeed.ts` documented limitation — intermediate hops not persisted.

---

## P-05 — Dashboard Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Restaurant operational snapshot: active sessions, occupied tables, pending order count |
| **Owner** | `server/ops/` (existing module — extend, do not duplicate) |
| **Source events** | Order events update pending count slice; session events update session/table slices |
| **Projection consumer** | `DashboardOverviewProjectionConsumer` (order slice); session slice via existing session writers |
| **Consistency** | Eventual for order counts; session metrics may use maintained aggregates |
| **Refresh policy** | Event-driven increment/decrement on order status transitions; session rollup on session events |
| **Consumers** | Home snapshot, Sessions tab KPIs |
| **Replaces** | Dual-source home metrics (ops + client `buildOrderStatistics`) |

**Investigation basis:** ORDERS-READ-MODEL-1 GAP-R08; ORDERS-WORKSPACE-1 BLOCK-05; existing `getRestaurantOverview`.

---

## P-06 — Operational KPI Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Canonical today-scope operational KPIs: status breakdown, pending+preparing count, active ready count |
| **Owner** | `server/order/read/` with single metric glossary shared with P-05 |
| **Source events** | `OrderCreated`, `OrderStatusChanged`, `OrderCompleted`, `OrderCancelled` |
| **Projection consumer** | `OperationalKpiProjectionConsumer` |
| **Consistency** | Eventual |
| **Refresh policy** | Rolling counters per restaurant per calendar day (restaurant timezone authority) |
| **Consumers** | Home operational snapshot, Orders tab filter badges (counts only) |
| **Replaces** | Client `statusCount`, `buildOrderStatistics.today.*` |

**Investigation basis:** ORDERS-READ-MODEL-1 RM-05 SA-01; ADR-ARCH-006.

**Metric glossary (canonical):**

| Metric | Definition |
|--------|------------|
| `activeOrders` | status ∈ {pending, preparing, ready} |
| `pendingOrders` | status = pending |
| `preparingOrders` | status = preparing |
| `readyOrders` | status = ready |

Aligns with existing `getActiveOrdersCount` (ORDERS-READ-MODEL-1 RM-05).

---

## P-07 — Kitchen Queue Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Kitchen display queue: orders in preparation pipeline sorted for KDS |
| **Owner** | `server/kitchen/read/` |
| **Source events** | `OrderCreated`, `OrderStatusChanged`, `OrderReady`, `OrderCancelled` |
| **Projection consumer** | `KitchenQueueProjectionConsumer` |
| **Consistency** | Eventual |
| **Refresh policy** | Add on create/preparing; remove on ready/served/cancelled per KDS policy |
| **Consumers** | KITCHEN-DISPLAY-1 |
| **Replaces** | None — net new (current `OrderKitchenConsumer` is telemetry only) |

**Investigation basis:** ORDERS-READ-MODEL-1 GAP-R06; ADR-ARCH-012.

---

## P-08 — Printing Queue Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Print jobs derived from order events: job id, order reference, status, attempts |
| **Owner** | `server/printing/read/` |
| **Source events** | `OrderCreated`, `OrderReady` |
| **Projection consumer** | `PrintingQueueProjectionConsumer` |
| **Consistency** | Eventual |
| **Refresh policy** | Insert job on event; update status on dispatch/retry outcomes (PRINTING-1) |
| **Consumers** | PRINTING-1, PRINT-WORKSPACE-1, PRINT-CONNECTOR-1 |
| **Replaces** | `LogOrderPrintDispatchPort` log-only foundation |

**Investigation basis:** ORDERS-READ-MODEL-1 GAP-R07; ADR-ARCH-012.

---

## P-09 — Settlement Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Session settlement analytics: paid revenue, complimentary totals, trends |
| **Owner** | `server/analytics/` — **existing certified pattern** |
| **Source events** | Session settlement events (session domain — not order events) |
| **Projection consumer** | Session settlement writers (existing); no change required for READ-ARCHITECTURE-1 |
| **Consistency** | Read-time aggregation from `dining_sessions` settled fields |
| **Refresh policy** | On session mark-paid / close commands |
| **Consumers** | Reports tab settlement sections |
| **Status** | **Retain** — do not rebuild |

**Investigation basis:** ORDERS-READ-MODEL-1 RM-03 P-08; `settlementMetrics.ts`.

---

## P-10 — Analytics Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Order-based sales analytics: daily facts, monthly/yearly rollups for reports and Excel |
| **Owner** | `server/analytics/order/` (extension of analytics module) |
| **Source events** | `OrderCompleted` (primary revenue fact); `OrderCreated` for volume facts |
| **Projection consumer** | `OrderAnalyticsProjectionConsumer` |
| **Consistency** | Eventual |
| **Refresh policy** | Upsert daily fact row on `OrderCompleted`; rollup tables regenerated or incrementally updated |
| **Consumers** | Reports tab, Excel export |
| **Replaces** | `buildOrderStatistics`, `buildMonthlyReport`, `buildYearlySummary` |

**Investigation basis:** Blueprint DailySalesFact, MonthlyRollup; ADR-ARCH-009; ORDERS-WORKSPACE-1 BLOCK-01.

**Revenue rule:** Served order `totalAmount` on `OrderCompleted` event — mirrors domain terminal state, not client filter logic.

---

## P-11 — Public Order Status Projection

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Guest-safe tracking view: sanitized fields, tracking expiry, no internal IDs |
| **Owner** | `server/order/read/` |
| **Source events** | `OrderCreated`, `OrderStatusChanged`, `OrderReady`, `OrderCompleted`, `OrderCancelled` |
| **Projection consumer** | `PublicOrderStatusProjectionConsumer` |
| **Consistency** | Eventual; guest may poll every 8s (transitional) |
| **Refresh policy** | Upsert by `trackingToken` + restaurant slug key |
| **Consumers** | `OrderStatusPage`, customer push eligibility |
| **Replaces** | `getOrderByTrackingToken` + `toPublicOrderStatus` router assembly |

**Investigation basis:** Existing `orderPublicStatus.ts` mapper — logic moves to projection materialization; mapper becomes thin DTO pass-through.

---

## P-12 — Session Workspace Composite (Reference)

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Owner session view: session metadata + order list slice + timeline + settlement state |
| **Owner** | `server/diningSession/` — composes P-03/P-01 slices |
| **Source events** | Session events + order projections |
| **Projection consumer** | Existing session aggregate maintainers; reads order projections not write tables |
| **Consistency** | Eventual |
| **Refresh policy** | Read-time compose from session store + order projections |
| **Consumers** | `DiningSessionWorkspaceSheet` |
| **Replaces** | Dual fetch of `session.getOwnerWorkspace` + full `order.list`; client `deriveSettlementSummary` |

**Investigation basis:** ORDERS-WORKSPACE-1 BLOCK-04; ORDERS-READ-MODEL-1 GAP-R09.

---

## Projection Summary Table

| ID | Name | Owner Module | Event-driven | Implementation Program |
|----|------|--------------|--------------|------------------------|
| P-01 | Owner Orders | order/read | Yes | ORDERS-READ-MODEL-1 |
| P-02 | Active Orders | order/read | Yes | ORDERS-READ-MODEL-1 |
| P-03 | Order Details | order/read | Yes | ORDERS-READ-MODEL-1 |
| P-04 | Order Timeline | order/read | Yes | ORDERS-READ-MODEL-1 |
| P-05 | Dashboard | ops | Partial extend | ORDERS-READ-MODEL-1 |
| P-06 | Operational KPI | order/read | Yes | ORDERS-READ-MODEL-1 |
| P-07 | Kitchen Queue | kitchen/read | Yes | KITCHEN-DISPLAY-1 |
| P-08 | Printing Queue | printing/read | Yes | PRINTING-1 |
| P-09 | Settlement | analytics | Existing | No change |
| P-10 | Analytics | analytics/order | Yes | ORDERS-READ-MODEL-1 |
| P-11 | Public Order Status | order/read | Yes | ORDERS-READ-MODEL-1 |
| P-12 | Session Workspace | diningSession | Compose | ORDERS-WORKSPACE-1 |
