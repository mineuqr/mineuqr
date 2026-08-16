# COMMERCIAL CONSUMERS AUDIT

Do not assume the helper exists ⇒ all callers use it.

## Uses shared occupancy primitive

| Caller | File |
|--------|------|
| Restaurant create | `routers.ts` → `createRestaurantWithCommercialLimit` |
| Category create (non-admin) | `createCategoryWithCommercialLimit` |
| Item create (non-admin) | `createMenuItemWithCommercialLimit` |
| POS slot-consuming | `PosTerminalService.consumeProvisionedSlot` |

## Still checkLimit-then-act or insert without serialization

| Caller | Pattern |
|--------|---------|
| Admin category/item | insert only |
| Onboarding first restaurant | insert in register tx |
| POS provisioned replace | insert+update without occupancy tx |
| `assert*CreateAllowed` | checkLimit + COUNT, **no insert** (tests) |
| `PosEntitlementService.assertProvisioningAllowed` | checkLimit + COUNT, **no insert** (tests) |
| Deployed Production app | predecessor check-then-act (until deploy) |

## Residual `createRestaurant` / `createCategory` / `createMenuItem` in `db.ts`

Still exported. Occupancy unlocked path and admin category/item call them. A future caller that inserts via `db.ts` **bypasses** occupancy. Architecture guards cover known routers; they do not forbid new `db.createRestaurant` call sites.

## Feature-only commercial (not occupancy)

`requireFeature` / `requireRestaurantPlanFeature` for menuManagement, devices, etc. Unrelated to quantity occupancy except admin category/item still requires `menuManagement`.
