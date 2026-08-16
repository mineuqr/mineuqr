# LIMIT RESOURCE INVENTORY

Quantity keys in `LimitEntitlementKey` / capability matrix vs **live occupancy**.

| Limit key | In catalog / matrix | Occupancy enforced? | Authoritative table | COUNT | Counted states | Helper | Lock |
|-----------|---------------------|---------------------|---------------------|-------|----------------|--------|------|
| `restaurants` | yes (required Live Plan key) | **YES** on `restaurant.create` | `restaurants` | all rows for `userId` | all, including `isActive=false` | yes | `(owner, ownerUserId, restaurants)` |
| `categories` | yes (required) | **YES** non-admin create; **NO** admin create | `categories` | `COUNT(*)` per `restaurantId` | all rows (incl. inactive) | non-admin only | `(restaurant, restaurantId, categories)` |
| `items` | yes (required) | **YES** non-admin; **NO** admin | `menu_items` | `COUNT(*)` per `restaurantId` | all rows (incl. unavailable) | non-admin only | `(restaurant, restaurantId, items)` |
| `posTerminals` | recognized Live Plan key (optional on plan) | **YES** slot-consuming provision | `pos_terminals` | provisioned lifecycles | `registered` + `active` | yes | `(restaurant, restaurantId, posTerminals)` |
| `staffAccounts` | vocabulary only | **NO** — no quantity create path | n/a | n/a | n/a | no | no |
| `branches` | vocabulary only | **NO** — no branch entity occupancy | `operational_devices.branchId` is a field, not a limited resource | n/a | n/a | no | no |
| `devices` | **feature** `devices` | **NO quantity** — `requireFeature("devices")` | `operational_devices` | n/a occupancy | n/a | no | no |
| `ordersPerMonth` | matrix only | **NO occupancy** | orders | not gated by occupancy helper | n/a | no | no |
| `qrCodes` | matrix only | **NO occupancy** | n/a | n/a | n/a | no | no |
| `storage` / `images` | matrix only | **NO occupancy** | n/a | n/a | n/a | no | no |

## Cap source

`readLimitValue` only understands `restaurants | categories | items | posTerminals`. Other keys → `checkLimit` `limit_key_unsupported` (deny). Missing `posTerminals` on a non-admin plan → **0** (fail closed). Admin/isAdmin missing `posTerminals` → **unlimited**.

## Additional quantity-limited resources

None found beyond the table. No clone/import/bulk menu APIs. No staff-account quantity create.

## Occupancy definitions (actual)

- **Restaurants:** every row for the owner, active or not. Deactivate does **not** free a slot.  
- **Categories / items:** every row. `isActive` / `isAvailable` do **not** free a slot.  
- **POS:** `isProvisionedLifecycle` = registered ∪ active. Deactivated and replaced do **not** count. Reactivate-from-deactivated **does** consume a slot.
