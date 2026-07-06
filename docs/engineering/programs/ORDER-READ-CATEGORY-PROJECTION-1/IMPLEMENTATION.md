# ORDER-READ-CATEGORY-PROJECTION-1 — Canonical Category Read Projection Architecture
## Phase C — Certification Report

**Program:** ORDER-READ-CATEGORY-PROJECTION-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

ORDER-READ-CATEGORY-PROJECTION-1 closes the architectural gap between Kitchen runtime category filtering and the Order Read Model. Category metadata is now a **first-class canonical projection** (`OrderCategoryProjection`) built once during order read projection materialization. Every projected line item exposes a required `category` field — not optional `categoryId`. Runtime no longer compensates for incomplete projections: `missingCategoryData` fallbacks, `queueHasCategoryData` detection, and `missing_category_data` health warnings are removed. Kitchen runtime consumes `category.categoryId` exclusively from the read API.

---

## 2. Root Cause Analysis

KITCHEN-CATEGORY-FILTER-1 introduced runtime category filtering with an intentional fallback: when `categoryId` was absent on API line items, the filter was bypassed and all orders were shown, with health reporting `missingCategoryData`. This was correct interim behavior because `ActiveOrderLineItemDto` and `order_read_order_line_items` stored no category metadata — category lived only on `menu_items.categoryId` and was never projected into the order read store.

**Root cause:** Category resolution was deferred to runtime instead of occurring in the Order Read Projection pipeline.

---

## 3. Architecture Decision

**Decision:** Introduce `OrderCategoryProjection` and `OrderCategoryProjectionBuilder` as the single category authority. Category resolution occurs during projection build via `DrizzleCategoryResolutionPort`. Projection generation **fails** when category cannot be resolved. Runtime assumes canonical projections.

**Rationale:**
- Exactly one source of category truth (read model, not runtime)
- Category resolved once at projection build — never during runtime or presentation
- Projection integrity is mandatory; silent omission is forbidden
- Kitchen (P-07) composes from enriched P-02 line items without re-deriving categories

---

## 4. Category Projection Architecture

```
Order Aggregate (order_items + menu_items)
        │
        ▼
OrderReadContextLoader
        │
        ▼
OrderCategoryProjectionBuilder  ← DrizzleCategoryResolutionPort
        │
        ▼
order_read_order_line_items.categoryProjection (JSON)
        │
        ▼
Kitchen Read (P-07) / Q-01 / Print Workspace
        │
        ▼
Runtime (category.categoryId only)
```

---

## 5. OrderCategoryProjection Contract

Immutable projection (`server/order/read/domain/contracts/categoryProjectionContracts.ts`):

| Field | Type | Source |
|-------|------|--------|
| `categoryId` | `number` | `categories.id` |
| `categoryCode` | `string` | `cat-{id}` stable code |
| `categoryName` | `string` | `nameEn` or `nameAr` |
| `displayOrder` | `number` | `categories.sortOrder` |
| `parentCategoryId` | `number \| null` | `null` (schema has no parent) |
| `version` | `number` | `Date.parse(category.updatedAt)` |
| `updatedAt` | `string` | `categories.updatedAt` |

`ActiveOrderLineItemDto.category: OrderCategoryProjection` — required, not nullable.

---

## 6. Projection Builder

`OrderCategoryProjectionBuilder` (`server/order/read/projections/builders/OrderCategoryProjectionBuilder.ts`):

| Responsibility | Implementation |
|----------------|----------------|
| Resolve category | `CategoryResolutionPort.batchResolveMenuItemCategories` |
| Normalize | `normalizeCategoryProjection()` — frozen object |
| Version | `versionFromUpdatedAt()` |
| Populate | `buildLineItems()` / `buildLineItemsFromSource()` |
| Validate | `CategoryProjectionValidationError` on unresolved menu item |

Exactly one builder class. No duplicate category lookups elsewhere in the read path.

---

## 7. Projection Pipeline

| Stage | Component |
|-------|-----------|
| Load source | `DrizzleOrderReadContextLoader` |
| Build categories | `OrderCategoryProjectionBuilder` |
| Materialize | `OrderReadProjectionMaterializer.syncOrderProjections` |
| Persist | `DrizzleOrderReadProjectionStore.persistFromSource` |
| Kitchen compose | `KitchenTicketComposer` (pass-through `category`) |
| Runtime normalize | `normalizeKitchenReadModel` (`category.categoryId`) |
| Runtime filter | `applyKitchenCategoryFilter` |

---

## 8. Projection Validation

- `CategoryProjectionValidationError` thrown when menu item → category cannot be resolved
- `parseStoredCategoryProjection()` throws on missing/invalid stored JSON at read time
- No silent omission of category on line items
- `ORDER_READ_PROJECTION_SCHEMA_VERSION` incremented to **2**

---

## 9. Runtime Simplification

**Removed:**
- `missingCategoryData` from `useKitchenRuntimeStream`, `applyKitchenCategoryFilter`, `CategoryFilterHealth`, `RuntimeCategoryFilterManager.buildHealth`
- `queueHasCategoryData()` and `extractLineItemCategoryId()` from `kitchenRuntimeReadModel.ts`
- `missing_category_data` warning from `OperationalScreenStateAggregator`
- Optional `categoryId?` on client `KitchenTicketDto` line items

**Retained:**
- `RuntimeCategoryFilterManager` predicate compilation on `orderCategoryIds` derived from `category.categoryId`
- Empty category selection = show all orders (configuration semantics unchanged)

---

## 10. Health Architecture

`CategoryFilterHealth` no longer includes `missingCategoryData`. Health `validationStatus` reflects filter configuration validation only (`validationErrors`, `ignoredCategories`). Projection integrity guarantees category completeness — health does not warn about missing category data.

---

## 11. Diagnostics

`useKitchenRuntimeStream` exposes `projectionDiagnostics`:

- `projectionSchemaVersion`
- `categoryProjectionVersion`
- `projectionBuildDurationMs`
- `projectionIntegrity`

Kitchen API `buildKitchenReadMeta()` populates these from composed line items. No runtime category warnings.

---

## 12. Observability

`OrderCategoryProjectionMetrics` (`server/order/read/infrastructure/monitoring/OrderCategoryProjectionMetrics.ts`):

- `projectionCount`
- `validationFailures`
- `totalCategoryResolutionDurationMs`

Builder records metrics on each successful build and on validation failure. Future monitoring can consume `orderCategoryProjectionMetrics.snapshot()`.

---

## 13. Files Added

| File | Purpose |
|------|---------|
| `server/order/read/domain/contracts/categoryProjectionContracts.ts` | `OrderCategoryProjection` contract |
| `server/order/read/projections/builders/CategoryResolutionPort.ts` | Resolution port interface |
| `server/order/read/projections/builders/OrderCategoryProjectionBuilder.ts` | Single projection builder |
| `server/order/read/infrastructure/persistence/DrizzleCategoryResolutionPort.ts` | Menu item → category resolver |
| `server/order/read/infrastructure/persistence/parseStoredCategoryProjection.ts` | Read-time projection parser |
| `server/order/read/infrastructure/monitoring/OrderCategoryProjectionMetrics.ts` | Builder observability |
| `server/order/read/__tests__/fixtures/categoryProjectionFixtures.ts` | Test fixtures |
| `server/order/read/projections/builders/__tests__/OrderCategoryProjectionBuilder.test.ts` | Builder unit tests |
| `server/order/read/__tests__/orderReadCategoryProjection.architecture.guards.test.ts` | Architecture guards |
| `client/src/lib/kitchen/categoryProjection.ts` | Client projection mirror |
| `client/src/lib/operational-screen/__tests__/fixtures/categoryProjectionFixtures.ts` | Client test fixtures |
| `drizzle/0056_order_read_category_projection.sql` | `categoryProjection` JSON column |
| `docs/engineering/programs/ORDER-READ-CATEGORY-PROJECTION-1/IMPLEMENTATION.md` | This report |

---

## 14. Files Modified

| File | Change |
|------|--------|
| `drizzle/schema.ts` | `categoryProjection` JSON on line items |
| `server/order/read/domain/contracts/queryContracts.ts` | `category` on line items; `ReadResultMeta` integrity fields |
| `server/order/read/domain/contracts/projectionIds.ts` | Schema version 2 |
| `server/order/read/infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore.ts` | Requires resolved line items |
| `server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts` | Builder integration + persist JSON |
| `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts` | Builder integration |
| `server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts` | Parse category on read |
| `server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts` | Parse category on read |
| `server/kitchen/read/services/KitchenTicketComposer.ts` | Pass-through `category` |
| `server/kitchen/read/contracts/kitchenQueryContracts.ts` | Category meta in `buildKitchenReadMeta` |
| `server/kitchen/read/services/KitchenReadService.ts` | Build duration + category version |
| `server/print-workspace/read/infrastructure/DrizzlePrintWorkspaceReadStore.ts` | Parse category on read |
| `client/src/lib/kitchen/types.ts` | Required `category` on line items |
| `client/src/lib/kitchen/viewModels.ts` | Remove optional `categoryId` extension |
| `client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts` | Canonical `category.categoryId` |
| `client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts` | Remove fallback |
| `client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts` | Remove fallback; add diagnostics |
| `client/src/lib/operational-screen/category-filter/runtimeCategoryFilterContract.ts` | Remove `missingCategoryData` |
| `client/src/lib/operational-screen/category-filter/runtimeCategoryFilterManager.ts` | Remove `missingCategoryData` |
| `client/src/lib/operational-screen/state/operationalScreenStateAggregator.ts` | Remove `missing_category_data` warning |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | ORDER-READ-CATEGORY-PROJECTION-1 guard |
| Multiple test files | Category fixtures |

---

## 15. Validation

| Check | Result |
|-------|--------|
| `OrderCategoryProjection` contract | ✓ |
| `OrderCategoryProjectionBuilder` | ✓ |
| Canonical category on line items | ✓ |
| Kitchen projection complete | ✓ |
| Runtime fallback removed | ✓ |
| Projection integrity enforced | ✓ |
| Health updated | ✓ |
| Diagnostics updated | ✓ |
| Observability added | ✓ |
| No runtime category derivation | ✓ |
| Architecture guards | ✓ |
| `tsc --noEmit` | ✓ clean |

---

## 16. Test Results

**Program-scoped suites (143 tests):** all passed

```
server/order/read/**           — passed (incl. builder + guards)
server/kitchen/read/**         — passed
client/src/lib/operational-screen/** — passed
client/src/lib/kitchen/**      — passed
```

**Full repository suite:** 1551 passed, 3 failed (pre-existing unrelated connector-product manifest version tests — not introduced by this program).

---

## 17. Performance Validation

- Category resolution: **once** per order during `OrderCategoryProjectionBuilder.buildLineItems()` (batched `batchResolveMenuItemCategories`)
- Kitchen queue: `projectionBuildDurationMs` tracked in `KitchenReadService.getQueue()`
- Runtime: O(n) filter unchanged; no per-line-item category lookups
- No runtime or presentation category enrichment

---

## 18. Production Risks

| Risk | Mitigation |
|------|------------|
| Existing `order_read_order_line_items` rows lack `categoryProjection` | Run order read backfill after migration `0056`; reads throw on invalid/missing JSON |
| Menu item deleted or category orphaned | `CategoryProjectionValidationError` blocks projection — order events need resolution path |
| Schema version bump to 2 | Consumers read `projectionSchemaVersion`; runtime diagnostics expose version |
| Migration adds NOT NULL JSON column | Deploy migration + backfill before enabling kitchen category filter in production |

---

## 19. Architecture Compliance Review

| Rule | Status |
|------|--------|
| Do not derive category IDs in Runtime | ✓ Compliant |
| Do not infer from menu names | ✓ Compliant |
| Do not compare localized strings | ✓ Compliant |
| Do not rebuild category mappings in Runtime | ✓ Compliant |
| Do not duplicate category lookups in Runtime | ✓ Compliant |
| No Runtime fallbacks | ✓ Compliant |
| Category belongs to Read Models | ✓ Compliant |
| Authentication unchanged | ✓ |
| Bootstrap unchanged | ✓ |
| Capability negotiation unchanged | ✓ |
| Fleet / provisioning unchanged | ✓ |
| No category management UI | ✓ Out of scope |

---

## 20. Evidence

**Server builder validation failure:**
```typescript
// OrderCategoryProjectionBuilder — throws on unresolved category
throw new CategoryProjectionValidationError(restaurantId, item.menuItemId, item.id);
```

**Canonical line item contract:**
```typescript
// queryContracts.ts
category: OrderCategoryProjection; // required
```

**Runtime reads canonical projection only:**
```typescript
// kitchenRuntimeReadModel.ts
ids.add(item.category.categoryId);
```

**Fallback removed:**
```typescript
// applyKitchenCategoryFilter.ts — no missingCategoryData branch
```

**Architecture guards:**
- `server/order/read/__tests__/orderReadCategoryProjection.architecture.guards.test.ts` (5 tests)
- `client/.../architectureGuards.test.ts` ORDER-READ-CATEGORY-PROJECTION-1 guard

---

## 21. Final Certification Decision

**CERTIFIED**

ORDER-READ-CATEGORY-PROJECTION-1 completes the Order Read Model category architecture. Category information is a canonical immutable projection built by exactly one builder, persisted in order read line items, composed into kitchen tickets without enrichment, and consumed by runtime category filtering via `category.categoryId` only. Projection integrity is enforced at build and read time. Runtime fallbacks for missing category data are eliminated. All program-scoped tests pass, TypeScript compiles clean, and architecture guards confirm compliance.
