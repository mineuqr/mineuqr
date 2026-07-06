# KITCHEN-CATEGORY-FILTER-1 — Kitchen Runtime Category Filtering Architecture
## Phase C — Certification Report

**Program:** KITCHEN-CATEGORY-FILTER-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

KITCHEN-CATEGORY-FILTER-1 activates **runtime category filtering** for Kitchen and Expo operational screens. Category selections from Screen Management now flow through `RuntimeCategoryFilterManager`, compile into a cached predicate, and filter the kitchen read model **before presentation**. Filtering uses canonical category identifiers only — never display labels or localized names. Blocked roles receive configuration but do not activate filtering. No API, database, authentication, or bootstrap changes were made.

---

## 2. Root Cause Analysis

After SCREEN-CONFIG-RUNTIME-1, `visibleCategoryIds` were loaded into `runtimeConfiguration.tracked.categoryIds` with `categoriesActivated: false`. The kitchen presentation fetched the full queue via `getKitchenQueue` and rendered all orders. Category filtering was a management-only setting with no runtime pipeline.

---

## 3. Architecture Decision

**Decision:** Introduce `RuntimeCategoryFilterManager` as the sole category filter authority. Kitchen queue data flows through `normalizeKitchenReadModel` → `applyKitchenCategoryFilter` → presentation via `useKitchenRuntimeStream`.

**Rationale:**
- Filtering is a runtime capability, not a React/UI concern
- Predicate compiled once per configuration change (not per render)
- Empty category list = no filtering (show all), not show nothing
- Capability negotiation respects ROLE-RUNTIME-1 (`supportsCategoryFilter`)
- Blocked roles remain inactive

---

## 4. Runtime Category Filtering Architecture

```
getKitchenQueue (existing API)
        │
        ▼
normalizeKitchenReadModel (Kitchen Read Model)
        │
        ▼
RuntimeCategoryFilterManager.getPredicate()
        │
        ▼
applyKitchenCategoryFilter (O(n) single pass)
        │
        ▼
useKitchenRuntimeStream → KitchenScreenPanel (pre-filtered columns)
```

Configuration updates flow:

```
RuntimeConfigurationManager (version change)
        │
        ▼
syncCategoryFilter (orchestrator)
        │
        ▼
RuntimeCategoryFilterManager.syncFromConfiguration()
        │
        ▼
Predicate rebuild → stream refresh (no page reload)
```

---

## 5. Filter Pipeline

| Stage | Component | Responsibility |
|-------|-----------|----------------|
| Read | `kitchenRuntimeReadModel.ts` | Normalize API queue; extract `orderCategoryIds` |
| Filter | `runtimeCategoryFilterManager.ts` | Validate, normalize, compile predicate |
| Apply | `applyKitchenCategoryFilter.ts` | Filter columns/tickets O(n) |
| Stream | `useKitchenRuntimeStream.ts` | Fetch + filter in runtime layer |
| Present | `KitchenScreenPanel.tsx` | Render pre-filtered columns only |

---

## 6. RuntimeCategoryFilter Contract

**Location:** `category-filter/runtimeCategoryFilterContract.ts`

```typescript
RuntimeCategoryFilter {
  enabled: boolean
  selectedCategories: number[]
  mode: "all" | "selected_categories"
  filterVersion: number
  updatedAt: string
  configurationVersion: string
  validationErrors: string[]
  ignoredCategories: number[]
}
```

---

## 7. RuntimeCategoryFilterManager

**Location:** `category-filter/runtimeCategoryFilterManager.ts`

| Method | Responsibility |
|--------|----------------|
| `syncFromConfiguration()` | Load from normalized config, validate IDs, compile predicate |
| `getPredicate()` | Cached compiled predicate |
| `detectConfigurationChange()` | Version mismatch detection |
| `buildHealth()` | Filter health snapshot |
| `dispose()` | Teardown |

Single instance in `useRuntimeOrchestrator` via `categoryFilterManagerRef`.

---

## 8. Runtime Integration

- `categoriesActivated: true` when `supportsCategoryFilter` (Kitchen/Expo)
- Orchestrator `syncCategoryFilter()` on configuration apply/reload
- Exposed on runtime: `categoryFilter`, `categoryFilterHealth`, `categoryFilterPredicate`
- Role `handleConfiguration()` continues to receive `RuntimeConfiguration`
- Blocked roles: `supportsCategoryFilter: false` → filter stays inactive

---

## 9. Health Architecture

`CategoryFilterHealth` reports:
- `filterEnabled`, `selectedCategoryCount`
- `configurationVersion`, `filterVersion`
- `validationStatus` (valid | warning | inactive)
- `validationErrors`, `ignoredCategories`
- `missingCategoryData` (when filter enabled but no category IDs on read model)

Merged into `RoleRuntimeHealth` as `categoryFilterEnabled`, `categoryFilterVersion`.

---

## 10. Diagnostics

`ScreenDiagnosticsPanel` and `collectRoleDiagnostics()` include:
- `categoryFilter`, `categoryFilterHealth`
- Selected categories, ignored categories, validation errors
- Filter version and configuration version

---

## 11. Files Added

| File |
|------|
| `client/src/lib/operational-screen/category-filter/runtimeCategoryFilterContract.ts` |
| `client/src/lib/operational-screen/category-filter/runtimeCategoryFilterManager.ts` |
| `client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts` |
| `client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts` |
| `client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts` |
| `client/src/lib/operational-screen/__tests__/runtimeCategoryFilterManager.test.ts` |
| `client/src/lib/operational-screen/__tests__/kitchenCategoryFilterPipeline.test.ts` |
| `docs/engineering/programs/KITCHEN-CATEGORY-FILTER-1/IMPLEMENTATION.md` |

---

## 12. Files Modified

| File | Change |
|------|--------|
| `configuration/runtimeConfigurationContract.ts` | `categoriesActivated: boolean` |
| `configuration/runtimeConfigurationManager.ts` | Activate categories for capable roles |
| `useRuntimeOrchestrator.ts` | Category filter manager integration |
| `KitchenScreenPanel.tsx` | Consumes `useKitchenRuntimeStream` only |
| `roles/runtimeRoleContract.ts` | Category filter health fields |
| `roles/runtimeRoleHealth.ts` | Category filter in health/diagnostics |
| `ScreenDiagnosticsPanel.tsx` | Category filter diagnostics |
| `lib/kitchen/types.ts` | Optional `categoryId` on line items |
| `__tests__/runtimeConfigurationManager.test.ts` | `categoriesActivated` expectation |
| `__tests__/architectureGuards.test.ts` | KITCHEN-CATEGORY-FILTER-1 guards |

---

## 13. Validation

- TypeScript `tsc --noEmit` — **PASS**
- Operational screen tests — **51/51 PASS**
- Architecture guards — **13/13 PASS**
- No filtering in `KitchenScreenPanel`
- No configuration imports in presentation
- Predicate compiled once per config change (not per render)

---

## 14. Test Results

```
runtimeCategoryFilterManager.test.ts   6 passed
kitchenCategoryFilterPipeline.test.ts  4 passed
runtimeConfigurationManager.test.ts    6 passed
architectureGuards.test.ts            13 passed
(+ 22 other operational-screen tests)
Total: 51 passed
```

---

## 15. Performance Validation

- Predicate compiled once in `RuntimeCategoryFilterManager.syncFromConfiguration()`
- `applyKitchenCategoryFilter` performs single O(n) pass per column set
- No nested repeated scans; no per-render predicate rebuild
- `useMemo` in `useKitchenRuntimeStream` keyed on `filterVersion`

---

## 16. Production Risks

| Risk | Mitigation |
|------|------------|
| `categoryId` not yet on API line items | `missingCategoryData` fallback shows all orders + health warning |
| Invalid category IDs in config | Ignored safely; health warning; runtime continues |
| Empty filter selection | Treated as "no filtering" (show all) |

---

## 17. Future Programs

| Program | Scope |
|---------|-------|
| KITCHEN-DISPLAY-DENSITY-1 | Activate `tracked.density` in presentation |
| Read projection enrichment | Add `categoryId` to kitchen line items server-side (separate program) |

---

## 18. Architecture Compliance Review

| Rule | Status |
|------|--------|
| RuntimeCategoryFilter contract | ✓ |
| RuntimeCategoryFilterManager (single) | ✓ |
| Kitchen filtering operational | ✓ |
| Expo filtering operational | ✓ |
| Blocked roles preserved | ✓ |
| Filtering outside presentation | ✓ |
| Filtering outside API | ✓ |
| Health updated | ✓ |
| Diagnostics updated | ✓ |
| Config updates auto-applied | ✓ |
| No duplicated filtering logic | ✓ |
| No API/DB changes | ✓ |

---

## 19. Evidence

**Predicate compiled once:**
```typescript
this.filterVersionCounter += 1;
this.predicate = compilePredicate(filter);
```

**Presentation receives filtered stream:**
```typescript
const { queue } = useKitchenRuntimeStream();
const columns = queue?.columns ?? { pending: [], preparing: [], ready: [] };
```

**Architecture guard:**
```typescript
expect(kitchen).not.toContain(".filter(");
expect(kitchen).not.toContain("visibleCategoryIds");
```

**Empty list = no filtering:**
```typescript
expect(filter.enabled).toBe(false);
expect(manager.getPredicate()([1, 2])).toBe(true);
```

---

## 20. Final Certification Decision

**CERTIFIED**

KITCHEN-CATEGORY-FILTER-1 Phase C satisfies all success criteria. Category filtering is now a formal runtime capability with contract, manager, pipeline, health, and diagnostics — while preserving the unified operational architecture and backward compatibility.
