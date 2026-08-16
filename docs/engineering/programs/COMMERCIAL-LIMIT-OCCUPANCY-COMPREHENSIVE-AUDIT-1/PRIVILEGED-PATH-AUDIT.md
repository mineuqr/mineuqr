# PRIVILEGED PATH AUDIT

RBAC/admin/owner role is **not** supposed to grant commercial capabilities (CE constitution). Quantity occupancy was audited against that letter.

## Owner

`restaurant.create` / non-admin category/item / POS terminal: occupancy + `checkLimit` on **that owner’s** Live Plan. Correct.

## Admin (`ctx.user.role === "admin"`)

| Resource | Quantity occupancy | Feature gate | Tenant |
|----------|-------------------|--------------|--------|
| Restaurant create | **Honored** — `createRestaurantWithCommercialLimit` for **target owner** | n/a | ownerUserId from admin resolver |
| Category create | **Bypassed** | `menuManagement` still required | restaurant access |
| Item create | **Bypassed** | `menuManagement` still required | restaurant access |
| POS terminal | **Honored** if they pass restaurant access — same helper | POS access asserts | restaurant |

Admin restaurant create **does not** grant unlimited restaurants. Admin category/item create **does** grant unlimited menu quantity for that restaurant.

This is **inconsistent privileged policy**, and it **can** make `COUNT > cap`.

Constitution: admin role must not grant commercial capacity.  
Product history: “support exceed” for menu.

**Classification:** POLICY DECISION REQUIRED (do not silently treat as a bug **or** as safe). If policy is “never exceed,” it becomes REQUIRED NOW to route admin category/item through the helper.

## PLATFORM_OWNER

No separate restaurant/category/item create API. They use the same routers. Caps come from `resolveOwnerEntitlements` (FULL_PLATFORM / SIMULATED_PLAN). Occupancy uses that owner id. **Not** a role shortcut around `checkLimit` on adopted paths.

POS grants: PLATFORM_OWNER is **not** a cashier shortcut (existing POS tests).

## Internal services

`registerOwnerTransactional` — bootstrap (see ONBOARDING).  
`db.createRestaurant` — residual helper; live owner path does not call it.  
No background job found that inserts restaurants/categories/items/POS terminals.

## Abuse

An admin who can open a customer restaurant can insert unlimited categories/items. That is the support-exceed power. It is **not** tenant-hopping if `assertRestaurantAccess` holds.
