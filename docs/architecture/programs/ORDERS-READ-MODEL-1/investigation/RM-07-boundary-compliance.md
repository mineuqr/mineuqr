# RM-07 — Boundary Compliance

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Expected Read Layer Boundaries

```
Read API (tRPC)
    ↓
Read Service / Query Handler
    ↓
Read Repository / Projection Store
    ↓
Database (projection or authorized write-table read)
```

**Rules under investigation:**
- No business logic inside projections (beyond shaping/aggregation for read)
- No write logic inside read services
- No UI logic inside repositories

---

## Compliance Matrix

| Boundary check | Compliant? | Evidence |
|----------------|------------|----------|
| Order reads go through read service | **No** | `orderRouter.list` → `db.ts` directly |
| Order reads use `server/order/` module | **No** | Only `DrizzleOrderRepository.findById` for writes |
| Ops reads isolated in `server/ops/` | **Yes** | Dedicated modules with typed DTOs |
| Settlement reads in `server/analytics/` | **Yes** | `settlementMetrics.ts` |
| No write logic in read services | **Mostly** | `db.ts` also contains `createOrder`, `updateOrderStatus` |
| No business logic in client projections | **No** | `buildOrderStatistics`, `deriveSettlementSummary` |
| No UI logic in repositories | **Yes** | `db.ts` has no React; pure SQL |
| Public mapper separate from domain | **Partial** | `toPublicOrderStatus` in `orderPublicStatus.ts` |

---

## Violations

### BV-R01: Read Path Bypasses Application Layer (Critical)

**Rule:** Read Layer → Application → Repository

**Actual:** `orderRouter` → `db.ts`

**Evidence:** `routers.ts` lines 1886–1893

**ADRs:** ADR-ARCH-001 (partial), ADR-ARCH-009

---

### BV-R02: Business Logic in Client Projections (Critical)

**Rule:** No business logic in projections / UI computes no KPIs

**Actual:** `buildOrderStatistics` encodes today/month rules, completed = served, pending = pending+preparing

**Evidence:** `Dashboard.tsx` 3450–3480; ADR-ARCH-006

---

### BV-R03: Shared `db.ts` Read/Write Module (High)

**Rule:** Read/Write evolve independently

**Actual:** Single `db.ts` exports both `getOrdersByRestaurant` and `createOrder`/`updateOrderStatus`

**Evidence:** `db.ts` lines 1020–1187

---

### BV-R04: Settlement Derivation in Client (High)

**Rule:** No business logic in presentation

**Actual:** `deriveSettlementSummary` implements settlement state machine from events

**Evidence:** `diningSessionWorkspaceView.ts`; used in `DiningSessionWorkspaceSheet.tsx`

---

### BV-R05: Router Presentation Mapping (Medium)

**Rule:** Read service owns shaping

**Actual:** `getPublicStatus` assembles DTO in router via `toPublicOrderStatus`

**Evidence:** `routers.ts` 1957–1979

**Assessment:** Acceptable thin mapping if no business rules — `toPublicOrderStatus` includes `isTrackingExpired` logic (domain policy in mapper).

---

### BV-R06: Activity Feed Business Rules in Read Module (Low)

**Actual:** `activityFeed.ts` documents authoritative source mapping and merge policy — read-model business rules for feed composition.

**Assessment:** Compliant for ops context; not in order bounded context module.

---

### BV-R07: Consumer Reads via Legacy DB (Medium)

**Actual:** Event consumers call `getOrderById` from `db.ts` for enrichment

**Evidence:** `OrderNotificationConsumer.ts`, `OrderPrintingConsumer.ts`

**Assessment:** Integration read-back, not UI read layer — but couples consumers to legacy queries.

---

## Projection Purity Check

| Projection | Business logic in read module? |
|------------|-------------------------------|
| `getRestaurantOverview` | Minimal — COUNT aggregations only |
| `getActiveTablesBoard` | Status mapping `available/occupied` — presentation |
| `getActivityFeed` | Feed merge, copy generation — read concerns |
| `getSettlementSummary` | Revenue rules documented — settlement domain |
| `getOrdersWithItemsByRestaurant` | **None** — pure data dump |
| `buildOrderStatistics` (client) | **Full KPI business rules** — violation |

---

## Write Logic Inside Read Paths

| Function in read flow | Write capability? |
|-----------------------|-------------------|
| `getOrdersWithItemsByRestaurant` | No |
| `getOrderById` | No |
| `db.updateOrderStatus` | **Yes** — legacy write still in same module (used by repository fallback) |
| `DrizzleOrderRepository.save` | Write only — not exposed via read API |

**Risk:** Legacy `updateOrderStatus` in `db.ts` coexists with certified aggregate path.

---

## UI Logic in Repositories

**Finding:** None detected. All UI filtering (`statusFilter`) is in React components.

---

## Summary Scorecard

| Principle | Status |
|-----------|--------|
| 1. Order Aggregate SSOT | Write: ✓ Read: partial |
| 2. Read models = projections | Ops/settlement: ✓ Orders: ✗ |
| 3. Projections ≠ SSOT | ✓ (no materialized order projections) |
| 4. UI consumes server projections | ✗ for order KPIs |
| 5. No React operational KPIs | ✗ |
| 6. Business logic in Domain | ✗ analytics in client |
| 7. Read-optimized queries | ✗ N+1 full list |
| 8. Independent read/write evolution | ✗ shared db.ts |
