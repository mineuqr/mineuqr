# OCCUPANCY MAP

Only resources that exist **and** are quantity-gated in code. Vocabulary-only keys are listed as N/A.

| Resource | Limit key | Occupancy source | Limit read | Create path | Delete/release | Tx boundary | Unique constraints | Concurrency protection | Tenant isolation | Plan change | Subscription | Race risk |
|----------|-----------|------------------|------------|-------------|----------------|-------------|--------------------|------------------------|------------------|-------------|--------------|-----------|
| Restaurant | `restaurants` | `getRestaurantsByUser` all rows | `checkLimit(ownerId)` | `restaurant.create` → `createRestaurant` | `deleteRestaurantCascade` | Count and insert are **separate** statements/connections | `restaurants.slug` is an **index**, not unique | none vs cap | `userId` owner | current cap; rows kept | expired → `checkLimit` deny | **YES** |
| Category | `categories` | `COUNT(*)` per restaurant | `checkLimit(actor userId)` after `menuManagement` | `category.create` → `createCategory` | `deleteCategory` (items too) | separate | none on count | none vs cap; **admin skips check** | `restaurantId` | current cap | feature + limit | **YES** |
| Menu item | `items` | `COUNT(*)` per restaurant | same pattern | `menuItem.create` | `deleteMenuItem` | separate | none on count | none vs cap; **admin skips check** | `restaurantId` | current cap | feature + limit | **YES** |
| POS terminal (provisioned) | `posTerminals` | `registered`+`active` | `checkLimit(restaurant.userId)` | `PosTerminalService.register` / activate-from-deactivated / replace-non-provisioned | deactivate, replace | count then insert | unique `(restaurantId, code)` — identity only | none vs cap | `restaurantId` | current cap; excess operate if cap>0 | `available` false when cap 0 | **YES** |
| Operational device | `devices` **feature** | N/A quantity | `requireFeature("devices")` | device registry | disable/delete | N/A occupancy | device identity uniques | capability only | restaurant | N/A quantity | feature off | **N/A quantity** |
| Staff accounts | `staffAccounts` | not implemented | not `readLimitValue` | no gated create | — | — | — | — | — | — | — | **N/A** |
| Branches | `branches` | not implemented | not enforced | — | — | — | — | — | — | — | — | **N/A** |

## Race (all YES rows)

Request A and B both read occupancy `N`, cap `N+1`, both insert → occupancy `N+2`.

Unique `(restaurantId, code)` does not prevent two **different** POS codes. Restaurant slug index does not serialize two creates.
