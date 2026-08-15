# SERVER-AUTHORIZATION.md

Enforced in:

- `server/operational-device/authorization/requireDevicesFeature.ts`
- `server/operational-device/authorization/assertDeviceManagementAccess.ts`
- `operationalDevice.management.*`
- `operationalDevice.fleet.*`

Order:

1. `verifiedProcedure` (authenticated + email verified)
2. `assertRestaurantAccess` (owner or `role=admin`)
3. `requireFeature(userId, "devices")`
4. mutation / query

Deny → TRPC `FORBIDDEN` (`غير مصرح بالوصول`). Resolver exceptions also deny (fail closed).

No `isOwner` / `userId === 1` / `role === admin` / plan-name bypass.
No `planFeatureMatrix`.
No Legacy Bridge introduced on this path.
