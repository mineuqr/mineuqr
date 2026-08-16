# TRANSACTION AUDIT

## Helper contract (locked path)

One `db.transaction`:

1. INSERT lock row `ON DUPLICATE KEY UPDATE`  
2. `SELECT … FOR UPDATE`  
3. optional `resolveExisting(tx)`  
4. `countOccupancy(tx)`  
5. `decide(proposedTotal)` → `checkLimit` (entitlements on **other** connection)  
6. `create(tx)`  
7. COMMIT / ROLLBACK  

## Adopter verification

| Adopter | COUNT uses `tx`? | INSERT uses `tx`? | Verdict |
|---------|------------------|-------------------|---------|
| `createRestaurantWithCommercialLimit` | `tx.select` from `restaurants` | `tx.insert(restaurants)` | **PASS** |
| `createCategoryWithCommercialLimit` | `tx` COUNT categories | `tx.insert(categories)` | **PASS** |
| `createMenuItemWithCommercialLimit` | `tx` COUNT menu_items | `tx.insert(menuItems)` | **PASS** |
| POS `consumeProvisionedSlot` | `store.listByRestaurant(..., tx)` | `store.insert(..., tx)` / `updateLifecycle(..., tx)` | **PASS** when helper used |
| POS provisioned `replace` | n/a | `performReplace(null)` → `requireDb()` without tx | **FAIL — no occupancy tx** |
| Admin category/item | n/a | `createCategory`/`createMenuItem` → `getDb()` | **FAIL — no occupancy tx** |
| Onboarding | n/a | register tx `insert(restaurants)` | **FAIL vs occupancy helper** (own tx) |

Unlocked Vitest path (`NODE_ENV==="test"` and no injected `db`) passes `tx=null` and uses `getDb()` helpers. **Not** production locking.

## `checkLimit` inside the lock

`resolveOwnerEntitlements` uses the normal DB pool, not the occupancy `tx`. Cap read is not occupancy. COUNT+INSERT stay on `tx`. **Not** the forbidden “domain create on another connection” pattern for adopted paths.

## `createRestaurant(data)` when `!tx`

Only the unlocked test path. Production locked path does not call it.

## Drizzle POS `requireDb(tx)`

If `tx` is passed, it is used. If `tx` is null/undefined, a new `getDb()` connection is opened. Slot-neutral replace uses the latter.
