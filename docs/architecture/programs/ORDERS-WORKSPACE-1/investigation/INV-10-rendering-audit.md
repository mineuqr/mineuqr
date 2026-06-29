# INV-10 — Rendering Audit

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26  
**Note:** Documentation only. No optimization recommendations.

---

## Component Responsibility Analysis

### `Dashboard.tsx` (Monolith)

| Metric | Value | Evidence |
|--------|-------|----------|
| File size | ~4,481 lines | Full file |
| Orders-related inline components | `OrdersTab`, `ReportsTab`, `OperationalSnapshotSection`, 6+ helper functions | Lines 901+, 3450+, 3842+ |
| Responsibilities mixed | Orders ops + reports analytics + menu CRUD + settings + tables + QR | Tab switch lines 1203–1280+ |

**Finding:** No rendering boundary between Orders Workspace and unrelated dashboard features.

---

### `OrdersTab` Responsibilities

| Responsibility | In Component? | Should Be (per ADR) |
|----------------|---------------|---------------------|
| Fetch orders | ✓ `useQuery` | ✓ |
| Filter by status | ✓ `useMemo` | ✓ (view) |
| Render order cards | ✓ inline JSX | ✓ |
| Status action buttons | ✓ inline | ✓ |
| Status badge styling | ✓ inline `statusColors` | ✓ |
| Status label i18n | ✓ inline (not shared lib) | ✓ |
| Line item total calculation | ✓ `parseFloat(line.price) * line.quantity` | Presentation OK |
| Session count labels | ✓ via `buildVisibleSessionOrderCounts` | Borderline |
| Session sheet hosting | ✓ `DiningSessionWorkspaceSheet` | ✓ |

**Evidence:** Lines 3842–4108.

---

## Rendering Boundaries

| Boundary | Exists? | Evidence |
|----------|---------|----------|
| OrdersTab as separate file | **No** | Inline function in Dashboard.tsx |
| OrderCard as component | **No** | Inline `orders.map` JSX lines 3940–4091 |
| OrderList as component | **No** | Inline |
| OrderStatusActions as component | **No** | Inline conditional buttons |
| OrderFilters as component | **No** | Inline chip row |
| Shared status display for owner | **Partial** | `orderStatusDisplay.ts` exists but unused by OrdersTab |

---

## Derived Computations (Render-Time)

| Computation | Location | Runs When | Cost Driver |
|-------------|----------|-----------|-------------|
| `orders` filter | `useMemo` | `allOrders` or `statusFilter` change | O(n) per filter |
| `sessionOrderCounts` | `useMemo` | filtered orders change | O(n) |
| Line item subtotals | Inline in map | Every render of each card | O(items × orders) |
| `buildOrderStatistics` | `useMemo` (home/reports) | `allOrders` change | O(n) full scan |
| `buildMonthlyReport` | `useMemo` (reports) | orders + month change | O(n × days) |
| `buildYearlySummary` | `useMemo` (reports) | orders + year change | O(n × 12) |

---

## Rendering Hotspots

### H-01: Full List Re-render on Poll

**Description:** Every 10s `order.list` refetch re-renders entire `OrdersTab` and all order cards.

**Evidence:** `orderListQueryOptions` + `orders.map` lines 3940–4091.

**Scale concern:** No virtualization; all orders rendered regardless of count.

---

### H-02: Duplicate `order.list` Subscriptions

**Description:** Multiple dashboard sections mount independent queries; React Query deduplicates network but each subscriber re-renders on cache update.

**Evidence:** INV-09 widget matrix.

---

### H-03: Reports Tab Heavy Derivation

**Description:** `buildMonthlyReport` iterates all orders per day of month on every orders refresh.

**Evidence:** Lines 3494–3509, 3585–3587.

---

### H-04: Dashboard.tsx Bundle Size

**Description:** Orders UI code not code-split from unrelated tabs (categories, tables, settings).

**Evidence:** Single page component hosts all tabs.

---

### H-05: Session Sheet Dual Fetch

**Description:** When sheet open, both `session.getOwnerWorkspace` and `order.list` active.

**Evidence:** `DiningSessionWorkspaceSheet.tsx` lines 83–96.

---

## Re-render Triggers

| Trigger | Components Affected |
|---------|---------------------|
| 10s order poll | `OrdersTab`, `ReportsTab`, session components with `order.list` |
| Status mutation success | `OrdersTab` (refetch) |
| `statusFilter` click | `OrdersTab` only |
| Language toggle | All dashboard components via `useLanguage` |
| Sheet open/close | `OrdersTab` + `DiningSessionWorkspaceSheet` |
| Alert notification poll | `OrderAlertSystem` (global overlay) |

---

## Missing Rendering Concerns (Documented)

| Concern | Status |
|---------|--------|
| Loading skeleton for OrdersTab | **None** — shows empty or data directly |
| Mutation pending indicator | **None** — buttons not disabled during `updateStatus` |
| Error boundary per tab | **None** — relies on query error + verification panel |
| Virtualized list | **None** |
| Memoized OrderCard | **None** |

---

## Rendering Boundary Diagram

```
Dashboard.tsx (single render root)
├── RestaurantOperationsShell
│   └── RestaurantDetail
│       └── OrdersTab ──────────────┐
│           ├── filter chips        │ NO child component boundaries
│           ├── orders.map → Card   │
│           │   ├── badge           │
│           │   ├── items.map       │  ← nested map hotspot
│           │   └── action buttons  │
│           └── DiningSessionWorkspaceSheet (only extracted child)
```

**Extracted components used:** `DiningSessionWorkspaceSheet`, `VerificationRequiredPanel`, UI primitives (`Card`, `Badge`, `Button`).
