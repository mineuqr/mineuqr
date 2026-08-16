# RESOURCE ADOPTION

Audit of quantity-limited resources vs live `checkLimit` usage.

| Resource | Limit key | Adopted? | Why |
|----------|-----------|----------|-----|
| restaurants | `restaurants` | **YES** | `createRestaurantWithCommercialLimit` on `restaurant.create` |
| categories | `categories` | **YES** | `createCategoryWithCommercialLimit` for non-admin `category.create` |
| items | `items` | **YES** | `createMenuItemWithCommercialLimit` for non-admin `menuItem.create` |
| posTerminals | `posTerminals` | **YES** | `PosTerminalService.consumeProvisionedSlot` |
| staffAccounts | vocabulary | **NO** | no quantity occupancy in code |
| branches | vocabulary | **NO** | no quantity occupancy in code |
| devices | feature `devices` | **NO** | `requireFeature` only; not a quantity create path |

## Restaurant

Lock: `(owner, ownerUserId, restaurants)`.  
Count: `restaurants` where `userId = owner`.  
Cap: `checkLimit({ ownerId: ownerUserId, limitKey: "restaurants" })`.

`assertRestaurantCreateAllowed` remains for unit tests of the cap oracle. The live create path no longer pre-checks then inserts (that was the race).

## Category / item

Lock: `(restaurant, restaurantId, categories|items)`.  
Count: `COUNT(*)` on `categories` / `menu_items` for that restaurant.  
Cap: `checkLimit` with **`restaurant.userId`** (owner entitlements).

**Preserved policy:** platform `admin` still skips category/item quantity occupancy (support exceed). Authorization (`assertRestaurantAccess`) still runs first.

## Authorization vs commercial

Routers still: authenticated user → restaurant/RBAC → then occupancy. Occupancy does not grant access.
