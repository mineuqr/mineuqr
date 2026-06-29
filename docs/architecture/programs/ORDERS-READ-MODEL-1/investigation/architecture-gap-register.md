# Architecture Gap Register

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## GAP-R01 — No Order Read Model Layer (Critical)

| Field | Value |
|-------|-------|
| **Description** | Owner order reads bypass `server/order/` and query `db.ts` write tables directly via `orderRouter`. |
| **Evidence** | `routers.ts` 1886–1893; `db.ts` 1064–1074; ORDER-1 TD-08 |
| **Impacted files** | `server/routers.ts`, `server/db.ts` |
| **Architectural impact** | Read/write not independent; violates ADR-ARCH-001 partial, ADR-ARCH-009 |
| **ADRs** | ADR-ARCH-001, ADR-ARCH-009 |

---

## GAP-R02 — Client-Side Order Analytics (Critical)

| Field | Value |
|-------|-------|
| **Description** | `buildOrderStatistics`, `buildMonthlyReport`, `buildYearlySummary` compute operational KPIs in React. |
| **Evidence** | `Dashboard.tsx` 3450–3528; ADR-ARCH-006 line 15 |
| **Impacted files** | `client/src/pages/Dashboard.tsx` |
| **Architectural impact** | SSOT violation; blocks ORDERS-WORKSPACE-1 |
| **ADRs** | ADR-ARCH-002, ADR-ARCH-006, ADR-ARCH-009 |

---

## GAP-R03 — N+1 Order List Query (High)

| Field | Value |
|-------|-------|
| **Description** | `getOrdersWithItemsByRestaurant` fetches items per order in parallel queries. |
| **Evidence** | `db.ts` 1069–1073 |
| **Impacted files** | `server/db.ts` |
| **Architectural impact** | Read performance degrades with order volume |
| **ADRs** | ADR-ARCH-009, Quality Attributes §Performance |

---

## GAP-R04 — Unbounded Order List Payload (High)

| Field | Value |
|-------|-------|
| **Description** | No pagination; full restaurant order history returned on every `order.list` call. |
| **Evidence** | `getOrdersByRestaurant` — no LIMIT; UI never passes `status` filter |
| **Impacted files** | `server/db.ts`, `client/src/pages/Dashboard.tsx` |
| **Architectural impact** | Operational UI loads historical terminal orders unnecessarily |
| **ADRs** | ADR-ARCH-009 |

---

## GAP-R05 — No Event-Driven Order Projections (High)

| Field | Value |
|-------|-------|
| **Description** | Domain events drive integration consumers but no read model materialization. |
| **Evidence** | Consumers in `server/order/infrastructure/events/consumers/`; no projection tables |
| **Impacted files** | Order event infrastructure |
| **Architectural impact** | Read side cannot evolve independently; blocks KITCHEN-DISPLAY-1, PRINTING-1 |
| **ADRs** | ADR-ARCH-004, ADR-ARCH-012 |

---

## GAP-R06 — Kitchen Read Surface Missing (High)

| Field | Value |
|-------|-------|
| **Description** | No kitchen queue query API or projection. `OrderKitchenConsumer` is telemetry-only. |
| **Evidence** | `OrderKitchenConsumer.ts`; RM-03 P-15 |
| **Impacted files** | N/A (absent) |
| **Architectural impact** | KITCHEN-DISPLAY-1 blocked |
| **ADRs** | ADR-ARCH-012 |

---

## GAP-R07 — Printing Read Surface Missing (High)

| Field | Value |
|-------|-------|
| **Description** | No print queue or job status read API. `LogOrderPrintDispatchPort` only. |
| **Evidence** | `OrderPrintingConsumer.ts`; `consumerComposition.ts` |
| **Impacted files** | N/A (absent) |
| **Architectural impact** | PRINTING-1, PRINT-WORKSPACE-1 blocked |
| **ADRs** | ADR-ARCH-012 |

---

## GAP-R08 — Duplicated Pending Order Metrics (Medium)

| Field | Value |
|-------|-------|
| **Description** | `getActiveOrdersCount` (3 statuses) vs client `pendingOrders` (2 statuses) vs home `newOrders` (pending only). |
| **Evidence** | `db.ts` 1181–1185; `buildOrderStatistics` 3459; `OperationalSnapshotSection` 980 |
| **Impacted files** | `server/db.ts`, `client/src/pages/Dashboard.tsx` |
| **Architectural impact** | Inconsistent operator metrics |
| **ADRs** | ADR-ARCH-002, ADR-ARCH-006 |

---

## GAP-R09 — Client Settlement Derivation (Medium)

| Field | Value |
|-------|-------|
| **Description** | `deriveSettlementSummary` computes settlement state client-side despite server settlement APIs. |
| **Evidence** | `diningSessionWorkspaceView.ts`; `DiningSessionWorkspaceSheet.tsx` 104–113 |
| **Impacted files** | `client/src/lib/diningSessionWorkspaceView.ts` |
| **Architectural impact** | Business rules in presentation |
| **ADRs** | ADR-ARCH-006 |

---

## GAP-R10 — Shared db.ts Read/Write Module (Medium)

| Field | Value |
|-------|-------|
| **Description** | Legacy `db.ts` serves both read helpers and write helpers (`createOrder`, `updateOrderStatus`). |
| **Evidence** | `db.ts` 1020–1187 |
| **Impacted files** | `server/db.ts` |
| **Architectural impact** | Coupled evolution; repository fallback uses legacy writes |
| **ADRs** | ADR-ARCH-005 |

---

## GAP-R11 — Unused Read APIs (Low)

| Field | Value |
|-------|-------|
| **Description** | `order.getById`, `order.activeCount` exposed but no client consumers. |
| **Evidence** | Grep client — no matches; ops uses embedded count |
| **Impacted files** | `server/routers.ts` |
| **Architectural impact** | API surface drift |
| **ADRs** | ADR-ARCH-009 |

---

## GAP-R12 — Polling-Only Owner Refresh (Medium)

| Field | Value |
|-------|-------|
| **Description** | No subscription/SSE; 10s poll of large payloads for operational freshness. |
| **Evidence** | `queryRuntime.ts` 4, 66–70 |
| **Impacted files** | `client/src/lib/queryRuntime.ts`, dashboard components |
| **Architectural impact** | Latency and load at scale |
| **ADRs** | ADR-ARCH-008 (events exist but not surfaced to read UI) |

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 5 |
| Medium | 4 |
| Low | 1 |
| **Total** | **12** |
