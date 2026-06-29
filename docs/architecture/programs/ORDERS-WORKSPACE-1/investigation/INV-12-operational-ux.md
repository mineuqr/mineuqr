# INV-12 — Operational UX

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26  
**Scope:** Architecture review of operator experience. No redesign.

---

## Operator Workflow

### Primary Flow: New Order → Served

```
1. Guest places order (CheckoutPage → order.create)
2. Owner receives alert (OrderAlertSystem poll, up to 10s delay)
3. Owner navigates to Orders tab (sidebar click or alert link)
4. Owner finds order in list (default: all orders, no sort control)
5. Owner clicks "Prepare" (pending → preparing)     [1 click]
6. Owner clicks "Ready" (preparing → ready)            [1 click]
7. Owner clicks "Served" (ready → served)              [1 click]
```

**Minimum clicks from alert to served:** 4 (navigate + 3 status buttons), excluding alert dismiss.

**Evidence:** `OrdersTab` action buttons lines 4033–4071; `OrderAlertSystem` navigation.

---

### Secondary Flow: Order with Session Context

```
1–4. Same as above
5. Owner clicks session label on order card
6. DiningSessionWorkspaceSheet opens (overlay)
7. Owner views timeline, settlement, session actions
8. Owner closes sheet → returns to order list
```

**Evidence:** Lines 3960–3984, 4097–4106.

---

## Click Count Analysis

| Task | Clicks / Actions | Evidence |
|------|------------------|----------|
| Open Orders tab from Home | 1 (sidebar) | `RestaurantDashboardSidebar` line 98 |
| Advance single order to served | 3 (Prepare → Ready → Served) | Status buttons |
| Cancel pending order | 1 (Cancel button) | Line 4047 |
| Cancel preparing/ready order | **Not possible in UI** | No cancel button — domain allows |
| Filter to pending only | 1 (filter chip) | Line 3914 |
| Open session from order | 1 | Line 3963 |
| Mark session paid (from sheet) | 2+ (action + confirm dialog) | `DiningSessionActionBar` |
| Respond to new order alert | 1–2 (view orders + optional dismiss) | `OrderAlertSystem` |

---

## Information Density

| Element | Density | Notes |
|---------|---------|-------|
| Order card | **High** | Order #, status badge, table, customer, phone, notes, all line items with prices, total, timestamp, actions |
| Filter bar | **Medium** | 6 chips (all + 5 statuses) |
| List layout | **Vertical stack** | One card per order, no grouping by table/status |
| Session context | **Low on card** | Session label only when `sessionId` present |
| Kitchen queue view | **None** | No KDS-style condensed view |

**Evidence:** Card JSX lines 3941–4090.

---

## Scalability Assessment

| Dimension | Current Behavior | Scale Risk |
|-----------|------------------|------------|
| Order volume | Full list render, no pagination | **High** — INV-10 H-01 |
| Polling | 10s fixed interval all orders | **Medium** — load grows with order count |
| Multi-restaurant | One restaurant per dashboard view | Low |
| Concurrent operators | No locking indicator | **Medium** — last write wins (optimistic concurrency server-side) |
| Historical orders | All orders in list (no date filter in Orders tab) | **High** — served/cancelled mixed with active |

**Evidence:** No pagination in `order.list` call; client-side filter only.

---

## Tablet Usability

| Aspect | Finding | Evidence |
|--------|---------|----------|
| Touch targets | Filter chips `px-4 py-2.5`; action buttons `size="sm" h-7` | Lines 3916, 4036 — action buttons small for tablet ops |
| Responsive layout | Cards stack vertically; spacing `space-y-4 sm:space-y-5` | Line 3939 |
| Session sheet | Bottom sheet on mobile (`max-width: 639px`) | `DiningSessionWorkspaceSheet` lines 115–119 |
| Sidebar | Collapsible via `RestaurantSidebarProvider` | Layout |
| RTL support | `useLanguage` + inline AR/EN strings | OrdersTab |
| Sound alerts | `OrderAlertSystem` with audio + browser notification | `notificationSound.ts` |

---

## Multi-Order Operation

| Capability | Supported? | Evidence |
|------------|------------|----------|
| Bulk status update | **No** | Single-order mutation only |
| Select multiple orders | **No** | No checkbox/selection |
| Group by table | **No** | Flat list |
| Group by session | **No** | Session label only, no grouping |
| Priority / urgency sort | **No** | Default list order from server |
| Quick filter active only | **Partial** | Manual filter to pending/preparing/ready |
| Parallel order processing | **Yes** | Independent cards, independent buttons |

---

## Alert Latency

| Stage | Latency | Evidence |
|-------|---------|----------|
| Order created → notification row | Sync in request (consumer) | INV-07 |
| Notification → UI alert | Up to 10s poll | `DASHBOARD_NOTIFICATION_POLL_MS` |
| Status change → UI update | Mutation refetch (immediate) or 10s poll | Line 3892 |

**Gap:** New order alert not event-driven to UI.

---

## Operator Pain Points (Architecture-Level)

| ID | Pain Point | Root Cause |
|----|------------|------------|
| UX-01 | Cannot cancel in-progress orders from UI | UI incomplete vs domain policy |
| UX-02 | Active orders buried in full history | No server-side active filter on Orders tab |
| UX-03 | Alert delay up to 10s | Poll-based notification read |
| UX-04 | Three clicks per order lifecycle | Linear status model (domain-intended) |
| UX-05 | No kitchen-optimized view | Kitchen consumer telemetry-only; no KDS UI |
| UX-06 | Small action buttons on dense cards | Inline button sizing |
| UX-07 | Dual navigation to orders (Home KPIs vs Orders tab) | Split across tabs with different data sources |

---

## Workflow Diagram

```
                    ┌──────────────┐
                    │  Guest Order │
                    └──────┬───────┘
                           ▼
              ┌────────────────────────┐
              │ OrderAlertSystem (10s) │
              └────────────┬───────────┘
                           ▼
              ┌────────────────────────┐
         ┌───►│     Orders Tab         │◄─── Sidebar
         │    │  (poll order.list 10s) │
         │    └────────────┬───────────┘
         │                 │
         │    ┌────────────┼────────────┐
         │    ▼            ▼            ▼
         │  Filter    Status Actions  Session Link
         │                              │
         │                              ▼
         │                    ┌─────────────────┐
         └────────────────────│ Session Sheet   │
                              └─────────────────┘
```

---

## Summary

The Orders Workspace supports basic single-order lifecycle management for restaurant owners. Architecture limits operational UX: poll-based freshness, no list virtualization, no bulk operations, incomplete cancel affordances, and no dedicated kitchen/operations view. Information density per card is high but list management does not scale architecturally without read model filters and pagination.
