# PLATFORM OWNER BEHAVIOR

## Commercial hub

`resolveOwnerEntitlements` evaluates `isPlatformOwner(user)` **before** customer subscription.

FULL_PLATFORM → `resolveFullPlatformEntitlements`: plan `ADMIN`, all `FEATURE_KEYS` true, limits restaurants/categories/items `null` (unlimited). `posTerminals` omitted → `readLimitValue` returns **unlimited** because `isAdmin`.

SIMULATED_PLAN → Live Plan composition of the simulated code (including that plan’s `posTerminals` or fail-closed 0).

Invalid mode / simulation unavailable → fail-closed.

## Must not apply customer subscription to PLATFORM_OWNER identity

When `checkLimit({ ownerId: platformOwnerUserId })`, FULL_PLATFORM is used. Restaurant subscription is not applied to the platform owner’s own commercial hub.

## Must not treat PLATFORM_OWNER as a cashier

POS cashier operations:

1. `assertRestaurantPosScope` — PLATFORM_OWNER typically enters as `admin` **if** `users.role === "admin"`. That is restaurant **scope**, not POS permission.  
2. `resolvePosTerminalAccess` still requires an **explicit** grant for the command.  
3. Tests deny owner / admin / PLATFORM_OWNER without grants on Sale, Check, Settlement, Register/Shift, Drawer Movement.

PLATFORM_OWNER is **not** a `PosRestaurantScopeKind`. There is no cashier shortcut.

## Acting on a customer restaurant

`PosEntitlementService` always uses `restaurant.userId`. Support actions on a tenant restaurant consume **that restaurant’s** `posTerminals`. FULL_PLATFORM does not inflate a customer’s terminal quota. That is correct SaaS metering, not “applying subscription restrictions to PLATFORM_OWNER.”

To provision terminals on a **platform-owned** restaurant, `restaurant.userId` is the platform owner → unlimited under FULL_PLATFORM.

## Still required for cashiering

Authentication, restaurant scope, explicit `POS_ACCESS` + command permission, active terminal, and (for customer restaurants) that owner’s POS availability.
