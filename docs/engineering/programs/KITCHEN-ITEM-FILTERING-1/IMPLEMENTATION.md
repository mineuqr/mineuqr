# KITCHEN-ITEM-FILTERING-1 — Kitchen Item Runtime Projection
## Phase C — Certification Report

**Program:** KITCHEN-ITEM-FILTERING-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KITCHEN-ITEM-FILTERING-1 extends the Operational Runtime Projection so each Kitchen Screen receives **only the order line items** belonging to its configured categories. The Order remains a single aggregate — no split orders, no duplicated orders, no per-screen order models. Filtering occurs in the runtime read projection layer (`applyKitchenCategoryFilter`) before presentation. Mixed-category orders appear on multiple kitchen screens with **subset line items** while preserving order identity (order ID, status, timeline, customer fields). No API, database schema, authentication, pairing, or lifecycle changes were made.

---

## 2. Problem Statement

KITCHEN-CATEGORY-FILTER-1 filtered at **order granularity**: if any line item matched a screen's categories, the entire order (all line items) was shown. Kitchen stations operating on a single category still saw unrelated items from the same order.

KITCHEN-ITEM-FILTERING-1 closes this gap by projecting line items per screen while keeping the Order Read Model as the single source of truth.

---

## 3. Architecture Decision

**Decision:** Evolve `applyKitchenCategoryFilter` from order-level inclusion to **line-item-level projection**. Change the compiled predicate from `(orderCategoryIds) => boolean` to `(categoryId) => boolean` for per-item evaluation.

**Invariants preserved:**
- Order ID, business identity, timeline, status, customer information unchanged
- Only visible `lineItems`, `lineCount`, `linesSummary`, and derived `orderCategoryIds` change
- Empty category selection = no filtering (show all items)
- Offers (no category) visible when filter inactive; excluded when filter active
- Frontend (`KitchenScreenPanel`) consumes pre-filtered stream only

---

## 4. Runtime Projection Flow

```
Order (aggregate — unchanged)
        │
        ▼
getKitchenQueue (existing API)
        │
        ▼
normalizeKitchenReadModel (unfiltered read model)
        │
        ▼
RuntimeCategoryFilterManager.getPredicate()  →  (categoryId) => boolean
        │
        ▼
applyKitchenCategoryFilter(filterEnabled)
   ├─ filterTicketLineItems (per line item)
   ├─ drop ticket if zero matching items
   └─ projectKitchenTicketWithLineItems (rebuild line metadata)
        │
        ▼
useKitchenRuntimeStream → KitchenScreenPanel
```

**Mixed-category order example:**

```
Order #1001
  ├─ Burger  (category 1)  → Kitchen A (categories: [1])
  └─ Pizza   (category 2)  → Kitchen B (categories: [2])
```

Both screens reference order `#1001` with identical order identity; each sees only its items.

---

## 5. Filter Pipeline Changes

| Stage | Component | Change |
|-------|-----------|--------|
| Predicate | `runtimeCategoryFilterManager.ts` | Per-`categoryId` predicate instead of order-OR |
| Project | `kitchenRuntimeReadModel.ts` | `projectKitchenTicketWithLineItems()` rebuilds line metadata |
| Apply | `applyKitchenCategoryFilter.ts` | Line-item filter; drop empty tickets; preserve order identity |
| Stream | `buildKitchenRuntimeStream.ts` | Passes `categoryFilterEnabled` to apply layer |
| Present | `KitchenScreenPanel.tsx` | **No change** — no UI filtering |

---

## 6. Category Matching Rules

| Rule | Behavior |
|------|----------|
| Menu items | Include when `predicate(category.categoryId)` is true |
| Offers | Include only when filter inactive (no category to match) |
| Empty selection | Filter disabled — all items visible |
| Zero matching items | Order omitted from that screen's queue |
| Category source | Canonical `category.categoryId` from Order Read Category Projection only |

---

## 7. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/category-filter/runtimeCategoryFilterManager.ts` | Per-category predicate |
| `client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts` | `projectKitchenTicketWithLineItems` |
| `client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts` | Item-level projection |
| `client/src/lib/operational-screen/kitchen/buildKitchenRuntimeStream.ts` | Pass `categoryFilterEnabled` |
| `client/src/lib/screen-management/screenSettingsRuntimeMessaging.ts` | Operator copy: items not orders |
| `client/src/lib/operational-screen/__tests__/kitchenCategoryFilterPipeline.test.ts` | Item projection regression tests |
| `client/src/lib/operational-screen/__tests__/runtimeCategoryFilterManager.test.ts` | Predicate signature tests |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | KITCHEN-ITEM-FILTERING-1 guard |
| `docs/engineering/programs/KITCHEN-ITEM-FILTERING-1/IMPLEMENTATION.md` | This report |

**Not modified:** Server APIs, database schema, order lifecycle, pairing, auth, `KitchenScreenPanel.tsx`.

---

## 8. Regression Test Summary

| Suite | Tests | Result |
|-------|-------|--------|
| `kitchenCategoryFilterPipeline.test.ts` | 7 | Pass |
| `runtimeCategoryFilterManager.test.ts` | 6 | Pass |
| `architectureGuards.test.ts` (incl. KITCHEN-ITEM-FILTERING-1) | 37 | Pass |
| `screenSettingsRuntimeMessaging.test.ts` | 4 | Pass |

**New coverage:**
- Mixed-category order projects matching subset only
- Order hidden when zero matching line items
- Offer lines excluded under active category filter
- `buildKitchenRuntimeStream` end-to-end item projection
- Architecture guard: filtering logic absent from presentation layer

---

## 9. Build Results

```
npm run build — SUCCESS (vite + esbuild server bundle)
```

---

## 10. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Every Kitchen Screen displays only assigned category items | ✓ |
| Orders remain a single aggregate | ✓ |
| No duplicated orders | ✓ |
| No duplicated business logic in UI | ✓ |
| Runtime remains authoritative source | ✓ |
| Existing architecture preserved | ✓ |
| No API regressions | ✓ |
| No schema changes | ✓ |
| No scope creep | ✓ |

---

## 11. Relationship to Prior Programs

| Program | Relationship |
|---------|--------------|
| ORDER-READ-CATEGORY-PROJECTION-1 | Supplies canonical `category.categoryId` on line items |
| KITCHEN-CATEGORY-FILTER-1 | Filter manager, stream wiring, health — extended not replaced |
| SCREEN-MANAGEMENT-UX-ARCHITECTURE-1 §10 | Operator-facing category semantics aligned (items not orders) |

---

KITCHEN-ITEM-FILTERING-1 Phase C satisfies all success criteria. Kitchen screens now consume item-level runtime projections derived from the unified Order Read Model without introducing a new order model or moving filtering to the frontend.
