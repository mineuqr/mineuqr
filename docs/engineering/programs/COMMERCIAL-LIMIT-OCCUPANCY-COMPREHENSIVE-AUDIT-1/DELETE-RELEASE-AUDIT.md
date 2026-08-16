# DELETE / RELEASE AUDIT

Actual semantics. No new occupancy policy invented.

## restaurants

| Action | Occupancy effect |
|--------|------------------|
| Hard delete `deleteRestaurantCascade` | Row removed → COUNT drops. Frees a restaurant slot. Also deletes categories and items for that restaurant. |
| `isActive=false` | **Still counted.** Slot not freed. |
| Restore `isActive=true` | No occupancy change (already counted). |

Cascade **does not** delete `pos_terminals`. Orphan terminals can remain for a deleted `restaurantId`. Autoincrement IDs are not reused in normal operation, so this is leftover data, not a cross-tenant occupancy steal. Still a cascade completeness gap.

## categories / items

| Action | Occupancy effect |
|--------|------------------|
| `deleteCategory` | Deletes items in category, then category. Both COUNTs drop. |
| `deleteMenuItem` | Item COUNT drops. |
| `isActive` / `isAvailable` false | **Still counted.** |

No archive/soft-delete tables.

## POS terminals

| Action | Occupancy |
|--------|-----------|
| deactivate | **releases** provisioned slot |
| replace (provisioned) | previous `replaced` (not counted) + new `registered` (counted) — net 0 if single-threaded |
| replace (deactivated) | consumes a slot (helper) |
| activate from deactivated | consumes a slot (helper) |
| activate registered→active | net 0 |
| hard delete terminal | **no API found** |

## Restore exceeding capacity

POS reactivate-from-deactivated goes through occupancy; at cap it **fails**. Restaurant/category/item “restore” via flags does not increase COUNT.

## Undefined product policy

Whether inactive restaurants/categories/items **should** occupy is **POLICY DECISION REQUIRED**. Current code: they occupy.
