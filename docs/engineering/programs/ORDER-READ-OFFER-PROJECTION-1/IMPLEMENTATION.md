# ORDER-READ-OFFER-PROJECTION-1 — Implementation

**Classification:** Product Readiness  
**Priority:** High  
**Status:** COMPLETE (awaiting certification — no production execution)

---

## Executive Summary

ORDER-READ previously assumed every order line maps `menuItemId → menu item → category`. Historical offer lines (`menuItemId = 0`, 24 production rows per ORDER-READ-DATA-FORENSICS-1) are legitimate business data, not corruption.

This program completes the ORDER-READ architecture by introducing **first-class Offer projections** alongside existing Menu Item projections. Offer lines never receive fake categories or menu items. `projectionType` is always explicit (`MenuItem` | `Offer`).

`ORDER_READ_PROJECTION_SCHEMA_VERSION` bumped **2 → 3**. Migration `0059_order_read_offer_projection` is designed but **not executed** on production.

---

## Architecture Decision

| Decision | Rationale |
|----------|-----------|
| Discriminated union `ActiveOrderLineItemDto` | Eliminates nullable-category ambiguity |
| `menuItemId = 0` sentinel preserved | Historical write-model contract (PR-CUX-1B-POLISH-3) |
| `OrderOfferProjection` from line snapshot only | No `offerId` on `order_items`; titles come from persisted names |
| `categoryProjection = null` for offer lines | Offer lines must not pretend to belong to menu categories |
| `OrderReadLineItemProjectionBuilder` routes lines | Single integration point for materializer + persistence |
| Category backfill skips `menuItemId = 0` | Prevents category resolution failures on offer rows |
| Separate offer backfill service | Upgrades legacy offer rows to canonical `offerProjection` |

---

## Historical Data Analysis

| Finding | Implication |
|---------|-------------|
| 24 production rows with `menuItemId = 0` | Intentional offer lines, not migration failures |
| `offerId` not stored on `order_items` | Offer projection uses `offerId: null` + snapshot titles |
| Pre-0059 rows may have invalid `categoryProjection` | Read mapper infers offer from `menuItemId`; backfill writes canonical JSON |
| No menu item or category fabrication required | Projection integrity achieved without data repair |

---

## Canonical Projection Specification

### Menu Item Line (`projectionType: "MenuItem"`)

```typescript
{
  projectionType: "MenuItem",
  lineItemId, menuItemId, nameAr, nameEn, quantity, price,
  category: OrderCategoryProjection  // required
}
```

### Offer Line (`projectionType: "Offer"`)

```typescript
{
  projectionType: "Offer",
  lineItemId, menuItemId: 0, nameAr, nameEn, quantity, price,
  offer: {
    lineKind: "offer",
    offerId: null,           // intentionally absent historically
    titleAr, titleEn,
    source: "order_line_snapshot",
    version, updatedAt
  }
}
```

**Intentionally absent on offer lines:** `category`, `categoryId`, `categoryName`, any menu-item resolution fields.

---

## Projection Contract

| Symbol | Location |
|--------|----------|
| `ORDER_LINE_PROJECTION_TYPE_MENU_ITEM` / `OFFER` | `lineProjectionContracts.ts` |
| `OFFER_ORDER_LINE_MENU_ITEM_ID = 0` | `lineProjectionContracts.ts` |
| `MenuItemOrderLineItemDto` / `OfferOrderLineItemDto` | `queryContracts.ts` |
| `isMenuItemOrderLine` / `isOfferOrderLine` | `queryContracts.ts` |
| `ORDER_OFFER_PROJECTION_SCHEMA_VERSION = 1` | `offerProjectionContracts.ts` |

---

## Read Model Integration

| Component | Change |
|-----------|--------|
| `OrderReadLineItemProjectionBuilder` | Routes menu vs offer lines |
| `OrderOfferProjectionBuilder` | Builds offer projection from order line snapshot |
| `OrderReadProjectionMaterializer` | Uses line item builder |
| `DrizzleOrderReadProjectionStore` | Persists `lineProjectionType`, `offerProjection`, nullable `categoryProjection` |
| `mapStoredOrderReadLineItem` | Canonical DB → DTO mapper with legacy inference |
| `toPersistedLineItemColumns` | Canonical DTO → DB columns |

---

## Category Projection Compatibility

- Category backfill (`DrizzleCategoryBackfillLineItemStore`) filters `menuItemId > 0`
- `OrderReadCategoryBackfillService` skips offer lines early
- Kitchen `collectOrderCategoryIds` skips non-menu lines (`isMenuItemKitchenLine`)
- `buildKitchenReadMeta` computes category version from menu lines only
- Category filter: offer-only orders have empty `orderCategoryIds` and are excluded when categories are active — correct behavior (offers are not kitchen-category scoped)

---

## Backfill Compatibility

| Service | Purpose | Production execution |
|---------|---------|---------------------|
| `OrderReadCategoryBackfillService` | Menu item category upgrade | Existing — unchanged scope |
| `OrderReadOfferBackfillService` | Offer projection upgrade | **Designed only** — `scripts/order-read-offer-backfill-execute.ts` |
| `OrderReadProjectionBackfillService` | Full order re-materialization | Rebuilds offer lines via `OrderReadLineItemProjectionBuilder` |

**100% projection integrity path (post-certification):**

1. Apply migration `0059_order_read_offer_projection`
2. Run offer backfill: `ORDER_READ_OFFER_BACKFILL_CONFIRM=YES npx tsx scripts/order-read-offer-backfill-execute.ts --scope full`
3. Verify: `--verify-only`

No historical business meaning is altered.

---

## Consumer Impact Assessment

| Consumer | Change required | Notes |
|----------|-----------------|-------|
| Kitchen read (`OrderReadQueryAdapter`, `KitchenTicketComposer`) | Yes | Uses `mapStoredOrderReadLineItem`; passes discriminated line items through |
| Kitchen runtime (`kitchenRuntimeReadModel`) | Yes | Skips offer lines for category ID collection |
| Operational read store | Yes | Uses `mapStoredOrderReadLineItem` |
| Print workspace read store | Yes | Uses `mapStoredOrderReadLineItem` |
| Dashboard / analytics KPIs | No | Order-level aggregates; line type irrelevant |
| Reporting / statistics | No | No line-level category assumption |
| Public order status | No | Item count only |
| APIs (tRPC read) | Compatible | Line items expose `projectionType`; clients use type guards |
| `KitchenExecutionCard` | No | Uses name/quantity only |
| `PrintWorkspacePanel` | No | Uses name/quantity only |

---

## Migration Assessment

**Schema changes required** — migration `0059_order_read_offer_projection`:

```sql
ALTER TABLE order_read_order_line_items ADD COLUMN lineProjectionType varchar(16) NOT NULL DEFAULT 'MenuItem';
ALTER TABLE order_read_order_line_items ADD COLUMN offerProjection JSON NULL;
ALTER TABLE order_read_order_line_items MODIFY COLUMN categoryProjection JSON NULL;
```

- **Not executed** on production in this program
- Governance guard updated to canonical tail `0059`
- Existing menu item rows retain `lineProjectionType = 'MenuItem'` default

---

## Validation Results

| Check | Result |
|-------|--------|
| Historical offer lines → canonical offer projection | ✓ `mapStoredOrderReadLineItem` + builder tests |
| Menu item projections unchanged | ✓ `OrderCategoryProjectionBuilder` tests pass |
| Category filtering correct | ✓ `kitchenCategoryFilterPipeline` tests pass |
| `projectionType` always explicit | ✓ discriminated union + architecture guards |
| No fake categories / menu items | ✓ offer builder has no category resolution |
| APIs compatible | ✓ additive `projectionType` field |
| TypeScript clean | ✓ `tsc --noEmit` |
| Regression tests | ✓ 110 tests in order-read + kitchen scope |

---

## Regression Protection

Architecture guard tests in:

- `orderReadOfferProjection.architecture.guards.test.ts`
- `orderReadCategoryProjection.architecture.guards.test.ts` (updated adapter assertion)

Guards prevent:

- `menuItemId === 0` being treated as invalid menu item in category backfill
- Fake category assignment to offer lines
- Category resolution inside offer builder
- Blind `.category` access in kitchen category meta

---

## Production Readiness Assessment

| Gate | Status |
|------|--------|
| Code complete | ✓ |
| Tests passing | ✓ |
| Migration designed | ✓ `0059` |
| Production DDL | ⏸ Awaiting certification |
| Offer backfill execution | ⏸ Awaiting certification + `0059` |
| Category backfill on offer rows | ✓ Excluded by design |

**Certification required before:** migration execution, offer backfill execution, production deploy of schema version 3.

---

## Key Files

| File | Role |
|------|------|
| `server/order/read/domain/contracts/lineProjectionContracts.ts` | Projection type constants |
| `server/order/read/domain/contracts/offerProjectionContracts.ts` | Offer projection shape |
| `server/order/read/domain/contracts/queryContracts.ts` | Discriminated union DTOs |
| `server/order/read/projections/builders/OrderReadLineItemProjectionBuilder.ts` | Line routing |
| `server/order/read/projections/builders/OrderOfferProjectionBuilder.ts` | Offer authority |
| `server/order/read/infrastructure/persistence/mapStoredOrderReadLineItem.ts` | Persistence mapper |
| `server/order/read/infrastructure/backfill/OrderReadOfferBackfillService.ts` | Offer backfill |
| `drizzle/0059_order_read_offer_projection.sql` | Schema migration (not executed) |
| `client/src/lib/kitchen/lineProjection.ts` | Client mirror types |
| `scripts/order-read-offer-backfill-execute.ts` | Backfill executor (gated) |

---

## Phase Completion

| Phase | Status |
|-------|--------|
| 1 — Domain Investigation | ✓ Dependency map in guards + integration points |
| 2 — Canonical Offer Projection | ✓ `OrderOfferProjection` spec |
| 3 — Projection Contract | ✓ `MenuItem` \| `Offer` discriminated union |
| 4 — Read Model Integration | ✓ Materializer + persistence wired |
| 5 — Category Compatibility | ✓ Backfill + kitchen skip offer lines |
| 6 — Backfill Compatibility | ✓ Offer backfill designed, documented |
| 7 — Consumers | ✓ Kitchen, print, operational updated |
| 8 — Migration Impact | ✓ `0059` designed, not executed |
| 9 — Runtime Compatibility | ✓ Tests green, menu behavior preserved |
