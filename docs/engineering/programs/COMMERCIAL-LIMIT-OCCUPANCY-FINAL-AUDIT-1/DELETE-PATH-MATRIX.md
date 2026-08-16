# DELETE PATH MATRIX

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Deletes do not decrement a shadow counter. Occupancy is the next COUNT.

| Path | Mechanism | COUNT after |
|------|-----------|-------------|
| Owner/admin restaurant delete | `deleteRestaurantCascade` / `deleteRestaurantCascadeTx` | Restaurant gone; children deleted including `pos_terminals` |
| Category delete | `deleteCategory` (items of category then category) | Category COUNT −1; item COUNT drops |
| Item delete | `deleteMenuItem` | Item COUNT −1 |
| POS terminal hard-delete API | **None** | N/A |
| POS cascade | cascade deletes `pos_terminals` by `restaurantId` | Provisioned COUNT 0 for that restaurant |
| Soft delete | Catalog uses flags, not row delete | Flags do **not** change COUNT (G-10) |
| Bulk delete | None found | — |
| Internal cleanup | Test owners only on stagIn | Documented |

## Orphans

Cascade + restaurant row `SELECT … FOR UPDATE` (G-05 / TOCTOU). Independent re-run: orphan_count = 0 for category, item, POS provision, POS replace, order.

## Incorrect occupancy after delete

Not observed. No delete writes `commercial_limit_occupancy_locks` as a counter.
