# Architecture Gap Register

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Gap Classification

| Severity | Definition |
|----------|------------|
| **Critical** | Blocks architecture certification; SSOT or boundary violation |
| **High** | Significant deviation from approved architecture; must resolve before implementation approval |
| **Medium** | Notable gap; address in program scope |
| **Low** | Minor inconsistency; track but not blocking |

---

## Gaps

### GAP-01 — Client-Side Order Analytics (Critical)

| Field | Value |
|-------|-------|
| **Description** | Dashboard computes order KPIs, sales reports, and status breakdowns client-side via `buildOrderStatistics`, `buildMonthlyReport`, `buildYearlySummary`. Violates ADR-ARCH-006 and ADR-ARCH-009. |
| **Evidence** | `Dashboard.tsx` lines 3450–3528, 951–954, 3581–3591; `ADR-ARCH-006.md` line 15; `ADR-Registry.md` line 17 |
| **Impacted Files** | `client/src/pages/Dashboard.tsx`, `client/src/components/dashboard/SessionsWorkspacePanel.tsx` |
| **Architectural Impact** | SSOT violation; business metrics authority in presentation layer; reporting inconsistency risk |

---

### GAP-02 — No Owner Order Read Model (Critical)

| Field | Value |
|-------|-------|
| **Description** | `order.list`, `order.getById`, `order.activeCount` read directly from `db.ts` bypassing application layer and read models. |
| **Evidence** | `server/routers.ts` lines 1886–1930; ORDER-1 exit TD-08; `ADR-ARCH-009.md` |
| **Impacted Files** | `server/routers.ts`, `server/db.ts` |
| **Architectural Impact** | Orders Workspace cannot scale; no projection optimization; query path uncertified |

---

### GAP-03 — Orders Workspace Not Modularized (High)

| Field | Value |
|-------|-------|
| **Description** | Orders UI embedded as inline `OrdersTab` in 4,400+ line `Dashboard.tsx` with no module boundary, code splitting, or component extraction. |
| **Evidence** | `Dashboard.tsx` lines 3842–4108; INV-01, INV-10 |
| **Impacted Files** | `client/src/pages/Dashboard.tsx` |
| **Architectural Impact** | Implementation changes carry high regression risk; violates separation of concerns for workspace program |

---

### GAP-04 — Client Settlement State Derivation (High)

| Field | Value |
|-------|-------|
| **Description** | `deriveSettlementSummary` computes settlement state from session events in client. |
| **Evidence** | `client/src/lib/diningSessionWorkspaceView.ts`; `DiningSessionWorkspaceSheet.tsx` lines 104–113 |
| **Impacted Files** | `client/src/lib/diningSessionWorkspaceView.ts`, `client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx` |
| **Architectural Impact** | Business rule duplication; session/order boundary blurred in UI |

---

### GAP-05 — Dual Pending Order Count Sources (High)

| Field | Value |
|-------|-------|
| **Description** | Home snapshot uses both `ops.getRestaurantOverview.pendingOrders` (server) and client `buildOrderStatistics` (pending+preparing) with different definitions. |
| **Evidence** | `OperationalSnapshotSection` lines 934–982; INV-08 duplicated domain state |
| **Impacted Files** | `client/src/pages/Dashboard.tsx` |
| **Architectural Impact** | Operator sees inconsistent metrics across dashboard tabs |

---

### GAP-06 — UI Cancel Incomplete vs Domain (Medium)

| Field | Value |
|-------|-------|
| **Description** | Domain allows cancel from `preparing` and `ready`; UI only offers Cancel on `pending`. |
| **Evidence** | `OrderLifecyclePolicy.ts` lines 4–7; `OrdersTab` lines 4033–4051 |
| **Impacted Files** | `client/src/pages/Dashboard.tsx` |
| **Architectural Impact** | Operational capability gap; not architecture violation but lifecycle mismatch |

---

### GAP-07 — Poll-Only Freshness for Owner Orders (Medium)

| Field | Value |
|-------|-------|
| **Description** | No event-driven UI refresh; 10s polling for `order.list` and notifications. |
| **Evidence** | `queryRuntime.ts` lines 4, 22; INV-07 ME-03 |
| **Impacted Files** | `client/src/lib/queryRuntime.ts`, all `order.list` consumers |
| **Architectural Impact** | Operational latency; unnecessary load at scale |

---

### GAP-08 — `order.list` Server Filter Unused (Medium)

| Field | Value |
|-------|-------|
| **Description** | Router accepts optional `status` filter; UI fetches all orders and filters client-side. |
| **Evidence** | `routers.ts` line 1889; `OrdersTab` lines 3864–3868 |
| **Impacted Files** | `server/routers.ts`, `client/src/pages/Dashboard.tsx` |
| **Architectural Impact** | Performance/scalability; full history loaded for operational view |

---

### GAP-09 — Router Business Gates on `order.create` (Medium)

| Field | Value |
|-------|-------|
| **Description** | Commercial, hours, closure, table validation remain in router not application service. |
| **Evidence** | `routers.ts` lines 1786–1820 |
| **Impacted Files** | `server/routers.ts` |
| **Architectural Impact** | Split orchestration; affects guest order path into workspace |

---

### GAP-10 — Orphan Component `DiningSessionOrdersList` (Low)

| Field | Value |
|-------|-------|
| **Description** | Component exists with no consumers. |
| **Evidence** | `client/src/components/dashboard/DiningSessionOrdersList.tsx` — no imports |
| **Impacted Files** | `DiningSessionOrdersList.tsx` |
| **Architectural Impact** | Dead code; confusion for implementers |

---

### GAP-11 — Duplicate Status Label Definitions (Low)

| Field | Value |
|-------|-------|
| **Description** | `orderStatusDisplay.ts` not used by owner Orders tab; inline duplicates in Dashboard. |
| **Evidence** | `OrdersTab` lines 3883–3889 vs `orderStatusDisplay.ts` |
| **Impacted Files** | `client/src/pages/Dashboard.tsx`, `client/src/lib/orderStatusDisplay.ts` |
| **Architectural Impact** | i18n/copy drift between customer and owner surfaces |

---

### GAP-12 — Unused tRPC Procedures (Low)

| Field | Value |
|-------|-------|
| **Description** | `order.getById`, `order.activeCount` defined but not used by client UI. |
| **Evidence** | Grep client for `order.getById` — no matches; `order.activeCount` — no matches |
| **Impacted Files** | `server/routers.ts` |
| **Architectural Impact** | API surface drift; missed optimization opportunity for detail view |

---

### GAP-13 — No Order Detail View (Medium)

| Field | Value |
|-------|-------|
| **Description** | No dedicated order detail route/page; all detail inline in list card. |
| **Evidence** | INV-01, INV-02 — no order detail route |
| **Impacted Files** | `client/src/pages/Dashboard.tsx` |
| **Architectural Impact** | Workspace program lacks clear detail boundary for future features (print, audit) |

---

## Gap Count Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 3 |
| Medium | 5 |
| Low | 3 |
| **Total** | **13** |
