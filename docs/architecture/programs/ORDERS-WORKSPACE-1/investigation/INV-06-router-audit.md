# INV-06 — Router Audit

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Audit Criteria

Per approved architecture, routers must be **orchestration only**:
- No business logic
- No printing
- No kitchen logic
- No notification logic
- No session side-effects
- No direct integration side effects

Post ORDER-EVENTS-1B, notification/session/kitchen/printing side effects were moved to consumers.

---

## orderRouter Procedures

**Source:** `server/routers.ts` lines 1753–1985

| Procedure | Auth | Orchestration? | Violations |
|-----------|------|----------------|------------|
| `canOrder` | public | ✓ Thin delegate | None — calls `resolveGuestOrderingAllowed` |
| `create` | public | **Partial** | See V-01 through V-05 below |
| `list` | verified | ✓ Access + read | V-06: bypasses read model layer |
| `getById` | verified | ✓ Access + read | V-06 |
| `updateStatus` | verified | **Mostly thin** | V-07: redundant pre-fetch |
| `activeCount` | verified | ✓ Access + read | V-06; unused by client |
| `getPublicStatus` | public | Partial | V-08: presentation mapping in router |
| `trackOrder` | public | ✓ Stub | Deprecated, returns null |

---

## Violations

### V-01: Commercial / Operational Gates in `order.create` (Medium)

**Description:** Router performs restaurant existence, active check, temporary closure, working hours, commercial entitlement, and table validation before delegating to application service.

**Evidence:** `server/routers.ts` lines 1786–1820

**Architectural impact:** Business rules split between router and domain/application. Not printing/kitchen/notification, but violates thin-router principle for command path.

**Classification:** Business logic in router (orchestration boundary exceeded).

---

### V-02: Session Resolution in `order.create` (Medium)

**Description:** `resolveSessionForOrderCreate` called inline in router when `ENV.tableSessionDualWrite`.

**Evidence:** Lines 1824–1850

**Architectural impact:** Session attach is pre-command orchestration retained per ORDER-EVENTS-1B charter. Session **side-effects** moved to consumer; **resolution** remains in router.

**Classification:** Session logic at router boundary (intentional deferral, documented in ORDER-EVENTS-1B).

---

### V-03: Ops Logging in `order.create` (Low)

**Description:** `opsLog` for session created/reused inline in router.

**Evidence:** Lines 1834–1846

**Classification:** Direct side effect (telemetry), not domain-critical.

---

### V-04: Response DTO Assembly in `order.create` (Low)

**Description:** Router shapes response object from `placeResult`.

**Evidence:** Lines 1871–1883

**Classification:** Acceptable orchestration/presentation mapping.

---

### V-05: No Violation — Notification/Session/Printing Removed from `updateStatus` ✓

**Description:** ORDER-EVENTS-1B cleanup verified.

**Evidence:** `server/order-router-cleanup.test.ts`; `updateStatus` lines 1904–1924 delegate only to `advanceOrderStatusService`.

---

### V-06: Read Procedures Bypass Application/Read Model Layer (High)

**Description:** `list`, `getById`, `activeCount` call `db.ts` directly.

**Evidence:**
- `list` line 1893: `getOrdersWithItemsByRestaurant`
- `getById` lines 1898–1902: `getOrderById` + `getOrderItemsByOrderId`
- `activeCount` line 1930: `getActiveOrdersCount`

**Architectural impact:** Violates ORDER-1 deferred read model target (ADR-ARCH-009). Orders Workspace consumes this path.

---

### V-07: Redundant Order Load in `updateStatus` (Low)

**Description:** Router loads order via `getOrderById` for access check; `AdvanceOrderStatusService` loads again via repository.

**Evidence:** Lines 1910–1917

**Classification:** Orchestration inefficiency, not business logic.

---

### V-08: `getPublicStatus` Enrichment in Router (Low)

**Description:** Router joins session data and calls `toPublicOrderStatus`.

**Evidence:** Lines 1945–1979

**Classification:** Presentation mapping at router; acceptable for public read but not a dedicated read model.

---

## Adjacent Routers Used by Orders Workspace

### opsRouter (used for dashboard KPIs)

| Procedure | Used By | Router Content |
|-----------|---------|----------------|
| `getRestaurantOverview` | `OperationalSnapshotSection` | Server-side aggregation (includes `getActiveOrdersCount`) |
| `getActiveTablesBoard` | Sessions board | Operational projection |
| `getActivityFeed` | Activity feed | Event log read |
| `getSettlementSummary` / `getSettlementTrend` | Reports tab | Settlement analytics |

**Finding:** Dashboard uses `ops.getRestaurantOverview.pendingOrders` instead of `order.activeCount` — duplicate count sources possible.

### sessionRouter (session sheet)

| Procedure | Violations |
|-----------|------------|
| `getOwnerWorkspace` | Read orchestration — out of order scope |
| `markPaid`, `markComplimentary`, `close` | Session domain commands — not audited here |

### notificationRouter (alerts)

| Procedure | Violations |
|-----------|------------|
| `getUnread` | Read only — no order business logic |

---

## Summary Verdict

| Category | order.create | order.updateStatus | order.list | order.getById |
|----------|--------------|-------------------|------------|---------------|
| Business logic | **Yes** (gates) | No | No | No |
| Printing | No | No | No | No |
| Kitchen | No | No | No | No |
| Notification | No ✓ | No ✓ | No | No |
| Session side-effects | No ✓ (consumer) | No ✓ | No | No |
| Direct integration side effects | Ops log only | No | No | No |

**ORDER-EVENTS-1B compliance:** `updateStatus` is clean. `create` retains pre-command gates and session resolution.

**Read path:** All query procedures bypass certified application/read-model layer.
