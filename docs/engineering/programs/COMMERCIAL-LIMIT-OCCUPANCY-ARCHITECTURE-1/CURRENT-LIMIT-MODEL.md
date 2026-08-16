# CURRENT LIMIT MODEL

## Authority

```
Live Plan limit profile
  → commercial_limit_values (cap)
  → resolveOwnerEntitlements
  → readLimitValue / checkLimit(proposedTotal)
  → domain create (separate)
```

`checkLimit` is a **cap oracle**. It is not an occupancy manager.

## Keys that are Live Plan inventory (enforced quantity)

`LIVE_PLAN_LIMIT_KEYS`: `restaurants`, `categories`, `items`  
Optional recognized: `posTerminals`

Unlimited = `null`. Missing customer `posTerminals` → 0. Missing core keys fail-closed via resolver defaults (0).

## Keys that are vocabulary only

`staffAccounts`, `branches`, `devices` (as **limit**), `ordersPerMonth`, `qrCodes`, `storage`, `images`

Do not invent occupancy for them in this program.

## Occupancy vs cap

| | Cap | Occupancy |
|---|-----|-----------|
| Stored in | `commercial_limit_values` on the Live Plan | Domain tables (`restaurants`, `categories`, `menu_items`, `pos_terminals`) |
| Updated on plan save | yes | no |
| Updated on resource create | no | yes (row appears) |
| Atomic with create | n/a | **no** |

Occupancy is **COUNT of current domain rows** (POS: provisioned lifecycle subset). There is no explicit occupancy state.

## Scope of count vs scope of cap

| Limit | Cap source | Occupancy scope |
|-------|------------|-----------------|
| `restaurants` | owner Live Plan | all restaurants with `userId = owner` |
| `categories` | owner Live Plan | `COUNT(*)` for **that restaurant** (not all restaurants of the owner) |
| `items` | owner Live Plan | `COUNT(*)` for **that restaurant** |
| `posTerminals` | owner Live Plan (`restaurant.userId`) | provisioned terminals for **that restaurant** |

An owner with five restaurants and `categories = 25` may have 25 categories **per restaurant**. That is existing semantics.

## Release

Delete restaurant cascade / delete category (also deletes items) / delete item / POS deactivate or replace (provisioned set shrinks). Inactive restaurant/category/item rows still count today (`COUNT(*)` / `getRestaurantsByUser` have no `isActive` filter). POS deactivated/replaced do **not** count.
