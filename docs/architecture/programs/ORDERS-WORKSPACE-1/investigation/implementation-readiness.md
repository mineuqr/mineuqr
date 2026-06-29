# Implementation Readiness

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26  
**Reviewer:** Architecture Investigation (automated evidence audit)

---

## Verdict

# NOT READY FOR IMPLEMENTATION

The Orders Workspace investigation identifies **2 Critical gaps** and **3 High gaps** that block implementation approval. The backend order command path and event infrastructure are certified (ORDER-1, ORDER-EVENTS-1B), but the **owner Orders Workspace presentation layer** does not comply with ratified ADR-ARCH-006 and ADR-ARCH-009.

---

## What Is Ready

| Area | Status | Evidence |
|------|--------|----------|
| Order aggregate and lifecycle policy | ✓ Certified | `server/order/domain/` |
| `PlaceOrderService` / `AdvanceOrderStatusService` | ✓ Implemented | `server/order/application/` |
| Transactional outbox + relay | ✓ Implemented | ORDER-EVENTS-1A |
| Event consumers (notification, session, kitchen, printing) | ✓ Implemented | ORDER-EVENTS-1B exit PASS |
| Router side-effect decoupling (`updateStatus`) | ✓ Verified | `order-router-cleanup.test.ts` |
| Owner status mutation flow (UI → API → aggregate → events) | ✓ Functional | INV-05 action matrix |
| Basic operational UI (list, filter, status buttons) | ✓ Exists | `OrdersTab` |

---

## Blocking Architecture Issues

### BLOCK-01 — ADR-ARCH-006 Not Implemented (Critical)

**Issue:** UI computes business metrics client-side.

**Evidence:**
- `buildOrderStatistics`, `buildMonthlyReport`, `buildYearlySummary` in `Dashboard.tsx`
- `ADR-ARCH-006.md`: "Implementation status: Not implemented"
- `ADR-Registry.md` line 17

**Required before implementation:** Server projections for all KPIs displayed in Home, Reports, and Sessions tabs. Remove client analytics functions.

---

### BLOCK-02 — ADR-ARCH-009 Not Implemented (Critical)

**Issue:** No server read models for owner order list or dashboard analytics.

**Evidence:**
- `order.list` → `getOrdersWithItemsByRestaurant` direct DB access
- ORDER-1 TD-08: "Query path bypasses read models"
- `ADR-ARCH-009.md`: "Implementation status: Not implemented"

**Required before implementation:** Certified read model endpoints for owner operational list and analytics queries.

---

### BLOCK-03 — No Workspace Module Boundary (High)

**Issue:** Orders Workspace is inline in monolithic `Dashboard.tsx` (~4,481 lines).

**Evidence:** INV-01, INV-03, GAP-03

**Required before implementation:** Architecture decision on workspace module extraction and rendering boundaries (program charter scope).

---

### BLOCK-04 — Client Settlement Derivation (High)

**Issue:** `deriveSettlementSummary` and related helpers duplicate business logic.

**Evidence:** `diningSessionWorkspaceView.ts`; GAP-04

**Required before implementation:** Server-owned session workspace projection or explicit program boundary excluding settlement from Orders Workspace scope.

---

### BLOCK-05 — Inconsistent Operational Metrics (High)

**Issue:** Multiple conflicting sources for pending order counts and revenue.

**Evidence:** GAP-05; `OperationalSnapshotSection` uses ops + client stats

**Required before implementation:** Single authoritative ops/order projection API consumed by all dashboard widgets.

---

## Non-Blocking Issues (Track in Program)

| ID | Issue | Severity |
|----|-------|----------|
| GAP-06 | Cancel UI incomplete vs domain | Medium |
| GAP-07 | Poll-only freshness | Medium |
| GAP-08 | Server status filter unused | Medium |
| GAP-13 | No order detail view | Medium |
| GAP-10–12 | Dead code / duplicates | Low |

---

## Prerequisites for Implementation Approval

The Architecture Authority should require:

1. **Program Charter** for ORDERS-WORKSPACE-1 defining scope relative to ADR-ARCH-006/009
2. **Read model design** — owner active orders list, order detail, today/month analytics
3. **Architecture Traceability Matrix** mapping each UI widget to server projection
4. **Explicit decision** on `Dashboard.tsx` extraction strategy
5. **Migration plan** to remove `buildOrderStatistics` and related client functions
6. **Confirmation** that ORDER-EVENTS-1B certification remains valid (no regression from workspace work)

---

## Investigation Deliverables Checklist

| Deliverable | Status |
|-------------|--------|
| INV-01 Orders UI Inventory | ✓ Complete |
| INV-02 Navigation Map | ✓ Complete |
| INV-03 Component Dependency Graph | ✓ Complete |
| INV-04 Order Lifecycle Matrix | ✓ Complete |
| INV-05 Action Flow Matrix | ✓ Complete |
| INV-06 Router Audit | ✓ Complete |
| INV-07 Event Flow | ✓ Complete |
| INV-08 UI State Classification | ✓ Complete |
| INV-09 Data Source Audit | ✓ Complete |
| INV-10 Rendering Audit | ✓ Complete |
| INV-11 Boundary Compliance | ✓ Complete |
| INV-12 Operational UX | ✓ Complete |
| Architecture Gap Register | ✓ Complete |
| Architecture Risk Register | ✓ Complete |
| Implementation Readiness | ✓ Complete |

---

## Recommended Next Step (Architecture Authority Only)

This investigation phase is **complete**. No source code was modified.

The Architecture Authority should:
1. Review gap and risk registers
2. Approve or amend program scope for read model + presentation layer work
3. Issue implementation gate only after BLOCK-01 through BLOCK-05 have approved remediation designs

**Investigation does not authorize implementation.**
