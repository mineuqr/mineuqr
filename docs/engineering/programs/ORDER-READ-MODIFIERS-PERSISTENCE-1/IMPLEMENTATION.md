# ORDER-READ-MODIFIERS-PERSISTENCE-1 — Engineering Report

**Program:** ORDER-READ-MODIFIERS-PERSISTENCE-1  
**Type:** Ordering Read Model Persistence  
**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## 1. Root Cause

Order Item modifiers were not part of the Order Aggregate or Order Read Model. Waiter Workspace therefore used a temporary `modifiers: []` / `—` placeholder. There was no official projected path for QR/Kiosk/Kitchen to share.

---

## 2. Persistence Implementation

| Layer | Change |
|-------|--------|
| Migration `0068_order_read_modifiers` | `order_items.modifiers` + `order_read_order_line_items.modifiers` (JSON) |
| `OrderLine` | Carries `modifiers` (display labels; no pricing rules) |
| PlaceOrder / pricing | Pass-through dual-write only |
| Builders | Project `item.modifiers` → DTO |
| Read mappers / store | Round-trip `modifiers` |
| DTO | `ActiveOrderLineItemDto.modifiers: readonly string[]` |
| Schema version | `ORDER_READ_PROJECTION_SCHEMA_VERSION = 6` |

Normalize helper: `shared/ordering-platform/orderLineModifiers.ts`.

---

## 3. Runtime / Presentation Forwarding

| Consumer | Behavior |
|----------|----------|
| Waiter Table Workspace | Forwards `item.modifiers` from Order Read; removed `—` placeholder |
| Kitchen ticket lines | Types + card render projected modifiers |
| QR / Kiosk place path | `modifiers` accepted on cart/place inputs and dual-written |

No presentation reconstruction or aggregate queries.

---

## 4. Migration

```sql
ALTER TABLE `order_items` ADD COLUMN `modifiers` json NULL;
ALTER TABLE `order_read_order_line_items` ADD COLUMN `modifiers` json NULL;
```

Canonical journal terminus: `0068_order_read_modifiers` (69 entries).  
Apply with governed `pnpm db:migrate`. Rematerialize existing orders via order-read backfill after migrate if historical rows need projected modifiers.

---

## 5. Test Results

```
orderReadModifiersPersistence.architecture.guards.test.ts  7 passed
mapStoredOrderReadLineItem.test.ts  4 passed
OrderReadLineItemProjectionBuilder.test.ts  1 passed
orderReadItemNotesPersistence.architecture.guards.test.ts  5 passed
migrationGovernance.test.ts  10 passed
waiterTableWorkspace.architecture.guards.test.ts  6 passed
kitchenPresentation.test.ts  10 passed
```

---

## 6. Build Validation

`pnpm build` — **PASS** (vite + server + vercel bundles).

---

## 7. Pre-commit migration certification

Governed workflow completed successfully. See `MIGRATION-CERTIFICATION.md`.

| Gate | Result |
|------|--------|
| `pnpm db:migrate` → `0068_order_read_modifiers` | **Applied** |
| Pending migrations | **None** |
| `pnpm db:verify-schema` | **OK** |
| Order Read full backfill | **completed** (280 rows) |
| Architecture guards | **37 passed** |
| App start + `system.health` | **ok: true** |

---

## 8. Certification

| Acceptance criterion | Status |
|----------------------|--------|
| Modifiers persisted in Order Read Model | **PASS** |
| Waiter Workspace displays projected modifiers | **PASS** |
| Runtime/DTO forwards projected modifiers only | **PASS** |
| QR/Kiosk can submit/consume same projected path | **PASS** |
| Architecture guards pass | **PASS** |
| Production build passes | **PASS** |
| Governed migrate + rematerialize certified | **PASS** |
| No Order Domain pricing / Session / Runtime Provider redesign | **PASS** |

**ORDER-READ-MODIFIERS-PERSISTENCE-1 — PRODUCTION CERTIFIED**  
Repository is ready for git commit (no commit created by this workflow).
