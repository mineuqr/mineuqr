# INV-02 — Navigation Map

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Primary Navigation Flow

```
Dashboard (Home)
    ↓  [Sidebar: Orders]
Orders Tab (live order list)
    ↓  [Click session link on order card]
DiningSessionWorkspaceSheet (session detail)
    ↓  [Session actions: mark paid, close, etc.]
Operational Actions (session router mutations)
    ↓  [Poll 10s / mutation refetch / cache invalidation]
Refresh Flow (order.list + ops queries)
```

---

## Entry Points

| Entry | URL / Trigger | Evidence | Destination |
|-------|---------------|----------|-------------|
| Sidebar "Orders" | `onRestaurantTabChange("orders")` → `?restaurant={id}&section=orders` | `RestaurantDashboardSidebar.tsx` lines 94–98; `dashboardUrl.ts` lines 79–82 | `OrdersTab` |
| Home snapshot link | Operational sections may link to Sessions | `RestaurantHomePanel` `onTabChange("sessions")` line 1090 | Sessions tab (not Orders directly) |
| Order alert popup | `OrderAlertSystem` "View Orders" button | `OrderAlertSystem.tsx` — navigates via `spaNavigate("/dashboard?section=orders")` | Orders tab (restaurant ID from sessionStorage) |
| Direct deep link | `/dashboard?restaurant={id}&section=orders` | `readDashboardUrlState` in `dashboardUrl.ts` | `OrdersTab` |
| Legacy restaurant path | `/dashboard/{restaurantId}?section=orders` | `dashboardUrl.ts` lines 40–43 | `OrdersTab` |
| Email verification gate | Any orders query returns verification error | `VerificationRequiredPanel variant="orders"` in `OrdersTab` line 3906 | Blocked state (no order data) |

---

## Exit Points

| From | Action | Destination |
|------|--------|-------------|
| Orders tab | Sidebar: Home / Sessions / Reports / Menu sections | Other dashboard tabs |
| Orders tab | Breadcrumb / restaurant switcher | Restaurant list or another restaurant |
| Session sheet | Close sheet (`onOpenChange(false)`) | Returns to Orders list (sheet overlay dismissed) |
| Order alert | Dismiss alert | Stays on current page |
| Order alert | Navigate to orders | Orders tab |
| Orders tab | Logout / leave dashboard | `/` or auth flow |

---

## Hidden Navigation

| Mechanism | Description | Evidence |
|-----------|-------------|----------|
| Session drill-down | Not a route change; opens `DiningSessionWorkspaceSheet` overlay | `OrdersTab` lines 3960–3984, 4097–4106 |
| Status filter | Client-side filter only; no URL param | `statusFilter` state lines 3849, 3864–3868 |
| `sessionStorage` restaurant | `dashboard:lastRestaurantId` resolves restaurant when URL lacks `restaurant=` | Referenced in subagent exploration of `Dashboard.tsx` |
| Legacy sessions redirect | `?section=sessions` → `/dashboard/sessions?restaurant={id}` | `dashboardUrl.ts` `redirectLegacySessionsUrl` lines 93–107 |
| Order alert deep link | May land on orders without `restaurant=` query param | `OrderAlertSystem` uses `/dashboard?section=orders` only |

**No dedicated order detail route exists.** Order "detail" is the inline card in the list.

---

## Deep Links

| Deep Link | Resolves To | Notes |
|-----------|-------------|-------|
| `/dashboard?restaurant=42&section=orders` | Restaurant 42, Orders tab | Canonical |
| `/dashboard/42?section=orders` | Same (path-based restaurant ID) | `dashboardUrl.ts` line 40–43 |
| `/dashboard?section=orders` | Orders tab, restaurant from sessionStorage or resolve prompt | `needsRestaurantResolve` flag line 57 |
| `/dashboard/sessions?restaurant=42` | Sessions tab (order-adjacent) | Path-route tab per `PATH_ROUTE_TABS` |
| Customer: `/menu/{slug}/order/{trackingToken}` | Guest order tracking | Not owner workspace |

---

## Tab Routing Architecture

```
App.tsx
  Route /dashboard → Dashboard.tsx
  Route /dashboard/:section → Dashboard.tsx

Dashboard.tsx
  readDashboardUrlState() → restaurantId, tabFromSection
  restaurantTab state → activeTab switch
    "home"    → RestaurantHomePanel (includes OperationalSnapshotSection)
    "sessions"→ SessionsWorkspacePanel
    "orders"  → OrdersTab  ★
    "reports" → ReportsTab (order analytics)
```

**Evidence:** `Dashboard.tsx` lines 1203–1228; `App.tsx` lines 60–62.

---

## Operational Action Navigation (within Orders flow)

| User Action | UI Location | Navigation Effect |
|-------------|-------------|-------------------|
| Filter by status | Filter chips | In-place list filter (no navigation) |
| Prepare / Ready / Served / Cancel | Order card buttons | In-place mutation + `refetch()` |
| View session timeline | Session label link | Opens sheet (modal navigation) |
| Refresh | Implicit via 10s poll | No user action required |
| Post-mutation refresh | `updateStatusMutation.onSuccess → refetch()` | `OrdersTab` line 3892 |

---

## Refresh Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Refresh Triggers                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Polling: orderListQueryOptions → refetchInterval 10s     │
│ 2. Mutation success: updateStatusMutation → refetch()         │
│ 3. Session action: utils.order.list.invalidate({restaurantId})│
│ 4. Home snapshot: staleTime 120s, no poll (one-shot)          │
└─────────────────────────────────────────────────────────────┘
                              ↓
              trpc.order.list.useQuery({ restaurantId })
                              ↓
              getOrdersWithItemsByRestaurant (server db.ts)
                              ↓
              React Query cache update → UI re-render
```

**Evidence:**
- Poll: `queryRuntime.ts` lines 66–70 (`DASHBOARD_ORDER_LIST_POLL_MS = 10_000`)
- Mutation refetch: `OrdersTab` line 3892
- Invalidation: `DiningSessionActionBar.tsx` line 42, `SessionRowQuickActions.tsx` line 51
- Home one-shot: `homeSnapshotOrderQueryOptions` lines 74–79

---

## Cross-Tab Order Data Sharing

Multiple dashboard tabs independently poll `order.list` when active:

| Tab / Component | Query | Poll |
|-----------------|-------|------|
| `OrdersTab` | `order.list` | 10s |
| `ReportsTab` | `order.list` | 10s |
| `OperationalSnapshotSection` (home) | `order.list` | No (staleTime 120s) |
| `SessionsWorkspacePanel` | `order.list` | 10s |
| `ActiveSessionsTableSection` | `order.list` | 10s |
| `DiningSessionWorkspaceSheet` (open) | `order.list` | 10s (via shared options) |

**Architectural note:** No shared orders query provider; each mount owns its own React Query subscription.
