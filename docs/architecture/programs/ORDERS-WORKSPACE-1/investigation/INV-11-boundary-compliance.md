# INV-11 — Boundary Compliance

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Expected Dependency Direction

```
UI (Presentation)
    ↓ tRPC only
Application Layer (services, facades)
    ↓
Domain (aggregate, policies, events)
    ↓
Infrastructure (repository, outbox, consumers)
```

**Authority:** Architecture Constitution §11, §14; ADR-ARCH-006; Order-Centric Blueprint.

---

## Compliance Matrix

| Boundary | Expected | Actual | Compliant? |
|----------|----------|--------|------------|
| UI → Domain | No direct access | No direct access | ✓ |
| UI → Application | Via query/command APIs | Via tRPC | ✓ (transport) |
| UI computes KPIs | **Forbidden** | `buildOrderStatistics` in UI | **✗** |
| UI owns lifecycle FSM | **Forbidden** | UI mirrors domain transitions (buttons only) | ✓ (display only) |
| Router → Application (commands) | Delegate | `create`/`updateStatus` delegate | Partial |
| Router → db (reads) | Via read models | Direct `db.ts` | **✗** |
| Application → Domain | Yes | `PlaceOrderService`, `AdvanceOrderStatusService` | ✓ |
| Domain → Infrastructure | No upward deps | Clean | ✓ |
| Events → Consumers | Async integration | In-process sync dispatch | ✓ (1B certified) |
| Consumers → external | Integration only | Notification DB, push, session DB | ✓ |

---

## Violations

### BV-01: Client-Side Business KPI Computation (Critical)

**Rule:** ADR-ARCH-006 — "UI renders server projections only. No KPI computation."

**Evidence:**
- `buildOrderStatistics` — `Dashboard.tsx` lines 3450–3480
- Used by `OperationalSnapshotSection` (951–954), `ReportsTab` (3581–3583)
- ADR-ARCH-006 notes: "Dashboard computes statistics client-side"

**Impact:** Duplicated business rules; SSOT violation (ADR-ARCH-002).

---

### BV-02: No Server Read Model for Owner Order List (High)

**Rule:** ADR-ARCH-009 — analytics and operational reads from server read models.

**Evidence:**
- `order.list` → `getOrdersWithItemsByRestaurant` (`routers.ts` line 1893)
- ORDER-1 exit report TD-08: "Query path bypasses read models"

**Impact:** Full aggregate table scan exposed to UI; no projection optimization.

---

### BV-03: Client Settlement Derivation (High)

**Rule:** ADR-ARCH-006 — no business rule duplication in client.

**Evidence:**
- `deriveSettlementSummary` — `diningSessionWorkspaceView.ts`
- Used in `DiningSessionWorkspaceSheet.tsx` lines 104–113

**Impact:** Settlement state machine logic in presentation layer.

---

### BV-04: Client Operational Board Derivations (Medium)

**Evidence:**
- `sessionWorkspaceOps.ts` — joins `order.list` with ops board client-side
- Used by `ActiveSessionsTableSection`, `SessionsWorkspacePanel`

**Impact:** Operational projection logic split between server (`ops.*`) and client.

---

### BV-05: Business Gates in Router `order.create` (Medium)

**Rule:** Routers orchestration only.

**Evidence:** `routers.ts` lines 1786–1820 — closure, hours, commercial, table validation.

**Impact:** Application/domain boundary blurred for guest order placement.

---

### BV-06: Duplicate Status Vocabulary (Low)

**Evidence:**
- Domain: `OrderStatus.ts`
- Shared: `orderStatusDisplay.ts`
- Inline: `OrdersTab` lines 3883–3889, `ReportsTab` lines 3594–3600

**Impact:** Presentation drift risk, not domain authority violation.

---

### BV-07: Notification Path Outside Order Read Model (Low)

**Evidence:** `OrderAlertSystem` polls `notification.getUnread`, not order events.

**Impact:** Architecturally acceptable (notification is separate context); indirect coupling to `OrderCreated` consumer.

---

## Compliant Areas (Post ORDER-EVENTS-1B)

| Area | Evidence |
|------|----------|
| Status mutations through application service | `advanceOrderStatusService.execute` |
| Domain lifecycle enforced server-side | `OrderLifecyclePolicy`, `Order.advanceStatus` |
| No router inline notification/session/printing | `order-router-cleanup.test.ts` |
| Event consumer isolation | Separate consumer classes with idempotency |
| Publisher transport-only | `InProcessEventPublisher` → registry |

---

## Dependency Direction Diagram (Actual)

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT UI                           │
│  OrdersTab ──buildOrderStatistics──► INVALID KPI PATH   │
│       │                                                  │
│       └──trpc.order.list ─────────────────────────────┐ │
└───────────────────────────────────────────────────────│─┘
                                                        ▼
┌─────────────────────────────────────────────────────────┐
│                   orderRouter                            │
│  list ──────────────► db.ts (BYPASS application)       │
│  updateStatus ──────► AdvanceOrderStatusService ✓      │
│  create ──gates──► PlaceOrderService ✓                 │
└─────────────────────────────────────────────────────────┘
                                                        ▼
┌─────────────────────────────────────────────────────────┐
│              server/order/ (Domain + App)                │
│  Order aggregate → Outbox → Relay → Consumers ✓          │
└─────────────────────────────────────────────────────────┘
```

---

## ADR Implementation Status (Orders Workspace Relevant)

| ADR | Status | Orders Workspace Impact |
|-----|--------|-------------------------|
| ADR-ARCH-002 SSOT | Partial | Client KPIs violate |
| ADR-ARCH-006 UI Presentation Only | **Not implemented** | Primary blocker |
| ADR-ARCH-008 Event-Driven Integration | **Implemented** | Backend compliant |
| ADR-ARCH-009 Read Models Own Analytics | **Not implemented** | Primary blocker |
| ADR-ARCH-012 Kitchen/Print via Events | **Implemented** | No UI yet |

**Source:** `docs/architecture/constitution/ADR-Registry.md` lines 17–20.
