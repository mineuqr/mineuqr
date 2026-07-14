# ORDERING-READ-ITEM-NOTES-PERSISTENCE-1 — Item Notes Read Persistence
## Binding Architecture Document

**Program:** ORDERING-READ-ITEM-NOTES-PERSISTENCE-1  
**Type:** Ordering Read Model Persistence  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-14  
**Depends on:** ORDERING-NOTES-ARCHITECTURE-1

---

## 1. Architecture Audit

| Layer | Finding |
|-------|---------|
| Write model | `order_items.notes` exists |
| Domain | `OrderLine.notes` preserved |
| Projection builders | Already map `item.notes → itemNotes` |
| Read table | **Gap:** no `itemNotes` column |
| Persist mapper | **Gap:** `toPersistedLineItemColumns` omitted notes |
| Read mapper | **Gap:** hardcoded `itemNotes: null` |
| Events | `OrderCreated` does not carry line notes; notes loaded from write context at rematerialization |

**Root cause:** Item Notes were projected in-memory then dropped on durable write.

---

## 2. Ownership

| Concern | Owner |
|---------|-------|
| Item Notes validation / contracts | Ordering Platform (`orderingNotesContract`) |
| Write persistence | Order Domain (`order_items.notes`) |
| Projection (deterministic mapping) | Order Read builders |
| Durable read storage | `order_read_order_line_items.itemNotes` |
| Operational consumption | Kitchen / Expo / Pickup via `ActiveOrderLineItemDto.itemNotes` |

No business rules in projections — mapping only.

---

## 3. Projection Flow

```
order_items.notes
        ↓
OrderReadContextLoader (SelectOrderItem[])
        ↓
OrderCategoryProjectionBuilder / OrderReadLineItemProjectionBuilder
        ↓  itemNotes: item.notes ?? null
ActiveOrderLineItemDto
        ↓
toPersistedLineItemColumns
        ↓
order_read_order_line_items.itemNotes
        ↓
mapStoredOrderReadLineItem
        ↓
Operational / Kitchen / Print DTOs
```

---

## 4. Migration

| Item | Value |
|------|-------|
| Tag | `0064_order_read_item_notes` |
| SQL | `ALTER TABLE order_read_order_line_items ADD COLUMN itemNotes text NULL` |
| Projection schema version | `4` |

---

## 5. Backfill

Historical rows: rematerialize via existing `OrderReadProjectionBackfillService`  
(`pnpm db:order-read:backfill` with `ORDER_READ_BACKFILL_CONFIRM=YES`).

No specialized backfill service — write-model notes already exist.

---

## 6. Out of Scope

Kitchen/Expo/QR/Kiosk UI, PlaceOrder validation, runtime capabilities, presentation layer.

---

This document is binding for ORDERING-READ-ITEM-NOTES-PERSISTENCE-1.
