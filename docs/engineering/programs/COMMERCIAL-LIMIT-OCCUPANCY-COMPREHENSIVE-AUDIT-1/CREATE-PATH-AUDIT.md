# CREATE-PATH AUDIT

For each occupancy-increasing path: helper / checkLimit / COUNT / lock / same tx / `create(tx)` / extra connection / bypass / concurrent exceed / retry exceed.

## restaurants

| Path | Helper | checkLimit | COUNT | Lock | Same tx create | Bypass | Concurrent exceed? |
|------|--------|------------|-------|------|----------------|--------|-------------------|
| A `restaurant.create` owner | yes | yes | yes | yes (when not test-unlocked) | `tx.insert(restaurants)` | no | no (helper) |
| C `restaurant.create` admin-for-owner | yes (owner’s cap) | yes | yes | yes | yes | no | no |
| D PLATFORM_OWNER as user | same as A; cap from owner entitlements | yes | yes | yes | yes | no | no |
| G `registerOwnerTransactional` | **no** | **no** | **no** | **no** | own register tx | **yes** | unique email; 0→1 |
| P `db.createRestaurant` | only unlocked test / helper fallback | n/a | n/a | no | other `getDb()` | callable | if called directly, **yes** |
| I–K import/clone/bulk | **none found** | — | — | — | — | — | — |

`assertRestaurantCreateAllowed` is **test-only**; live router does not pre-check then insert.

## categories / items

| Path | Helper | Bypass |
|------|--------|--------|
| A owner `category.create` / `menuItem.create` | yes | no |
| C `ctx.user.role === "admin"` | **no** — `createCategory` / `createMenuItem` | **yes — unlimited vs owner cap** |
| G onboarding | no category/item insert | — |

Admin still passes `assertRestaurantAccess` + `requireRestaurantPlanFeature("menuManagement")`. Quantity occupancy is skipped. Feature gate is **not** skipped.

## posTerminals

| Path | Helper | Notes |
|------|--------|--------|
| `terminal.register` new | yes | `resolveExisting` for same code |
| `activate` from deactivated | yes | consumes slot |
| `activate` registered→active | **no occupancy** | already provisioned |
| `replace` unprovisioned previous | yes | consumes slot |
| `replace` provisioned previous | **no helper** (`performReplace(null)`) | **concurrent double-replace can exceed cap** |
| `PosEntitlementService.assertProvisioningAllowed` | checkLimit only | **not used** on live create (tests only) |

## staff / branches / devices

No quantity occupancy-increasing path. Device create: `requireFeature("devices")` after restaurant access.

## Direct repository

`server/db.ts` `createRestaurant` / `createCategory` / `createMenuItem` remain public and open a **new** `getDb()` connection. Live routers for owner restaurant/category/item no longer call them except admin category/item and the occupancy unlocked fallback.
