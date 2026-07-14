# ORDERING-READ-ITEM-NOTES-PERSISTENCE-1 — Item Notes Read Persistence
## Phase C — Certification Report

**Program:** ORDERING-READ-ITEM-NOTES-PERSISTENCE-1  
**Type:** Ordering Read Model Persistence  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Item Notes are now a permanent projected property of the Ordering Read Model. Migration `0064_order_read_item_notes` adds `order_read_order_line_items.itemNotes`. Persist/read mappers round-trip notes from Domain → Projection → Read Store → DTO. Projection schema version bumped to **4**. No UI or PlaceOrder changes.

---

## 2. Root Cause

Builders already set `itemNotes` from `order_items.notes`, but the read table lacked a column and mappers dropped the value on durable write/read (`itemNotes: null`).

---

## 3. Files Changed

| File | Change |
|------|--------|
| `drizzle/schema.ts` | `itemNotes: text()` on `orderReadOrderLineItems` |
| `drizzle/0064_order_read_item_notes.sql` | **New** additive migration |
| `drizzle/meta/_journal.json` | Journal idx 64 |
| `scripts/lib/migration-governance-lib.cjs` | Tail → `0064` / count 65 |
| `scripts/migration-governance-guard.cjs` | Message update |
| `scripts/verify-schema-deployment.cjs` | Require `itemNotes` |
| `scripts/__tests__/migrationGovernance.test.ts` | Tail assertions |
| `docs/DB_MIGRATION_GOVERNANCE.md` | Lineage terminus |
| `mapStoredOrderReadLineItem.ts` | Persist + read `itemNotes` |
| `DrizzleOrderReadProjectionStore.ts` | Insert `itemNotes` |
| `projectionIds.ts` | Schema version **4** |
| Persistence + architecture tests | **New/updated** |
| Program docs | This folder |

---

## 4. Migration Summary

```sql
ALTER TABLE `order_read_order_line_items` ADD COLUMN `itemNotes` text NULL;
```

Additive, nullable, backward compatible. Apply with governed `pnpm db:migrate` after preflight.

---

## 5. Projection Flow Summary

Domain write `notes` → builders → DTO `itemNotes` → read store column → mapper → operational DTOs.

Events rematerialize from write context; no event payload expansion.

---

## 6. Backfill

Use existing order-read rematerialize backfill after migration apply:

`pnpm db:order-read:backfill` (confirm env required).

---

## 7. Validation Report

| Check | Result |
|-------|--------|
| Migration governance guard | **OK** (tail `0064_order_read_item_notes`) |
| `server/order/read` + governance tests | **114/114 Pass** |
| `npm run build` | **Pass** |

---

ORDERING-READ-ITEM-NOTES-PERSISTENCE-1 closes the Ordering Notes read-model gap.
