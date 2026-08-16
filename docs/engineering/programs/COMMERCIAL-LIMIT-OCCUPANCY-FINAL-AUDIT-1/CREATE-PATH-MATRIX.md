# CREATE PATH MATRIX

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Searched actual INSERTs, not only helper call sites.

| INSERT | Consumes capacity? | Protected? | Class |
|--------|--------------------|------------|-------|
| `subscriptionPlanLimits` `tx.insert(restaurants)` | Yes | Inside `withCommercialLimitOccupancy` | A |
| `routers` restaurant.create | Yes | `createRestaurantWithCommercialLimit` | A |
| `registerOwner.ts` `tx.insert(restaurants)` | Yes (0→1) | `assertOnboardingFirstRestaurantPermitted` before txn (G-04) | A |
| Test `insertRestaurantRow` / G-08 helpers | Yes | Test occupancy wrap | E |
| `db.createRestaurant` | Yes if called | Unlocked fallback inside helper only. `routers` import is unused. | A / D |
| `subscriptionPlanLimits` `tx.insert(categories)` | Yes | Occupancy helper + restaurant row lock | A |
| `routers` category.create | Yes | `createCategoryWithCommercialLimit` (owner and admin) | A |
| `db.createCategory` | Yes if called | Residual; has restaurant row lock; not used by router | A / D |
| Test category SQL | Yes | Test wrap | E |
| `subscriptionPlanLimits` `tx.insert(menuItems)` | Yes | Occupancy helper + restaurant row lock | A |
| `routers` item.create | Yes | `createMenuItemWithCommercialLimit` | A |
| `db.createMenuItem` | Yes if called | Residual fallback | A / D |
| `DrizzlePosTerminalStore.insert` | Yes if provisioned | Only via `insertRegistered` → `consumeProvisionedSlot` | A |
| POS register / replace insert | Yes / delta 0 | Shared helper | A |
| Test `occupancy_g07_terminals` | Yes | Test wrap | E |
| No bulk import / clone / menu seed create | — | None found | C/none |

## Unclassified

**None.**

## Not a bypass

- `assertRestaurantCreateAllowed` / category / item: leftover TOCTOU-unsafe asserts; **not** called from `routers`.
- `PosEntitlementService.assertProvisioningAllowed`: **not** on register path; register uses occupancy helper.
- `createRestaurant` import in `routers.ts`: unused (D).
