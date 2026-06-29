# INV-04 — Order Lifecycle Matrix

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Domain Lifecycle (Authoritative)

**Source:** `server/order/domain/policies/OrderLifecyclePolicy.ts`

| From Status | Allowed Transitions |
|-------------|---------------------|
| `pending` | `preparing`, `cancelled` |
| `preparing` | `ready`, `cancelled` |
| `ready` | `served`, `cancelled` |
| `served` | *(terminal)* |
| `cancelled` | *(terminal)* |

**Domain status enum:** `server/order/domain/value-objects/OrderStatus.ts` — `pending`, `preparing`, `ready`, `served`, `cancelled`.

---

## UI Status Inventory

| Status | Shown In | Classification | Evidence |
|--------|----------|----------------|----------|
| `pending` | Orders tab badge, filter chip, home KPI, reports breakdown | **Domain State** (displayed) | `OrdersTab` lines 3910, 3951–3952, 4033–4050 |
| `preparing` | Same surfaces | **Domain State** (displayed) | Lines 4053–4061 |
| `ready` | Same surfaces | **Domain State** (displayed) | Lines 4063–4071 |
| `served` | Same surfaces; treated as "completed" in KPIs | **Domain State** (displayed) | `isCompletedOrder` line 3446–3448 |
| `cancelled` | Same surfaces | **Domain State** (displayed) | Filter chip line 3910 |
| `all` | Filter chip only | **View State** | `statusFilter` default `"all"` line 3849 |
| Terminal (implicit) | No action buttons on `served` / `cancelled` cards | **View State** (derived from domain) | No buttons when status ∉ `{pending, preparing, ready}` |

---

## Customer UI Status (reference)

| Status | Component | Classification |
|--------|-----------|----------------|
| Same 5 statuses | `OrderStatusStepper` via `orderStatusDisplay.ts` | **Domain State** (from `order.getPublicStatus`) |
| Step visual: `completed` / `current` / `future` | `getOrderStepVisualState()` | **View State** |

---

## Classification Matrix

| Status / State | Domain | Projection | View | Temporary |
|----------------|--------|------------|------|-----------|
| `pending` | ✓ persisted | ✓ via `order.list` | — | — |
| `preparing` | ✓ | ✓ | — | — |
| `ready` | ✓ | ✓ | — | — |
| `served` | ✓ | ✓ | — | — |
| `cancelled` | ✓ | ✓ | — | — |
| Filter `all` | — | — | ✓ | — |
| `statusFilter` selection | — | — | ✓ | — |
| `updateStatusMutation.isPending` | — | — | — | ✓ (mutation loading; no explicit UI indicator found) |
| `ordersBlocked` (email verification) | — | — | ✓ gate state | — |
| `timelineSessionId` (sheet open) | — | — | ✓ | — |

---

## Domain Events per Transition

**Source:** `server/order/domain/aggregate/Order.ts` `advanceStatus()` / `cancel()`

| Transition | Domain Events Emitted |
|------------|----------------------|
| Any non-cancel advance | `OrderStatusChanged` |
| → `ready` | `OrderStatusChanged` + `OrderReady` |
| → `served` | `OrderStatusChanged` + `OrderCompleted` |
| → `cancelled` | `OrderStatusChanged` + `OrderCancelled` |
| Create | `OrderCreated` (via `placeNew`) |

---

## UI Action → Status Mapping

| UI Button | Target Status | Valid Domain Transition | Evidence |
|-----------|---------------|-------------------------|----------|
| Prepare | `preparing` | `pending` → `preparing` | `OrdersTab` line 4039 |
| Cancel | `cancelled` | `pending` → `cancelled` | Line 4047 |
| Ready | `ready` | `preparing` → `ready` | Line 4058 |
| Served | `served` | `ready` → `served` | Line 4068 |

**UI does not expose:**
- `pending` → `cancelled` from `preparing` or `ready` (domain allows cancel from `preparing` and `ready`; UI only shows Cancel on `pending`)
- Skip transitions (e.g. `pending` → `ready`) — aligned with domain policy

---

## Mismatches

| ID | Mismatch | Severity | Evidence |
|----|----------|----------|----------|
| LC-01 | **Cancel only offered on `pending`** — domain allows cancel from `preparing` and `ready` | Medium | `OrdersTab` lines 4033–4051: Cancel button only when `order.status === "pending"`; `OrderLifecyclePolicy` allows `preparing→cancelled`, `ready→cancelled` |
| LC-02 | **Client defines "completed" as `served`** for KPIs — not a separate domain status | Low (aligned) | `isCompletedOrder` line 3446; domain uses `served` as terminal |
| LC-03 | **Duplicate status label definitions** — shared lib exists but Orders tab uses inline copy | Low | `orderStatusDisplay.ts` vs `OrdersTab` lines 3883–3889 |
| LC-04 | **`order.list` accepts optional `status` filter server-side** but UI filters client-side only | Low | Router input `status: z.string().optional()` line 1889; `OrdersTab` filters in `useMemo` lines 3864–3868 |
| LC-05 | **No optimistic UI update** — status changes only visible after refetch | Low | `onSuccess: () => refetch()` line 3892; no optimistic cache patch |

---

## KPI Status Groupings (Client-Derived)

| Grouping | Statuses Included | Classification | Evidence |
|----------|-------------------|----------------|----------|
| `pendingOrders` (today) | `pending` + `preparing` | **Projection State** (client-computed) | `buildOrderStatistics` line 3459 |
| `completedOrders` | `served` only | **Projection State** | Line 3458 |
| `statusBreakdown` | All 5 statuses | **Projection State** | Lines 3460–3465 |

**ADR mismatch:** ADR-ARCH-006/009 require server-owned analytics projections, not client grouping.
