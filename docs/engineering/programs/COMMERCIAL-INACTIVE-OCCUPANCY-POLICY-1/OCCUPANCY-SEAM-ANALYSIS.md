# OCCUPANCY SEAM ANALYSIS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

The occupancy seam is the caller `countOccupancy` callback, not the helper.

| Caller | Seam | Filters lifecycle? |
|--------|------|--------------------|
| `createRestaurantWithCommercialLimit` | `restaurants.userId` | no |
| `createCategoryWithCommercialLimit` | `categories.restaurantId` COUNT(*) | no |
| `createMenuItemWithCommercialLimit` | `menuItems.restaurantId` COUNT(*) | no |
| `PosTerminalService.consumeProvisionedSlot` | `isProvisionedLifecycle` | yes: registered/active |

Do **not** push `isActive` into the helper. That would make Commercial own restaurant UX flags.

POS filtering is the definition of `posTerminals` occupancy, analogous to “COUNT domain rows that are this resource.” `replaced` rows are history of a replacement, not a second terminal.
