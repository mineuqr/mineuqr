# IMPLEMENTATION

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## Change

`server/routers.ts` `category.create` and `menuItem.create` always call:

- `createCategoryWithCommercialLimit(input)`
- `createMenuItemWithCommercialLimit(input)`

Removed `if (ctx.user.role !== "admin")` occupancy skip and the admin-only `createCategory` / `createMenuItem` persist.

Authorization (`assertRestaurantAccess`) and `requireRestaurantPlanFeature("menuManagement")` remain **before** Commercial capacity.

## Unchanged

- `withCommercialLimitOccupancy`
- `checkLimit`
- 0094
- restaurant-row lock inside `countOccupancy`
- POS terminal paths
- onboarding
- admin restaurant create (already occupied)

## Tests

- `commercialAdminLimitEnforcement.guards.test.ts`
- `commercialAdminLimitEnforcement.tidb.test.ts`
- G-08 domain-race guard updated to expect the helper for admin
- `routers.test.ts` admin category create

## Not created

`AdminCommercialLimitService`, `AdminOccupancyService`, admin quota tables, 0095.
