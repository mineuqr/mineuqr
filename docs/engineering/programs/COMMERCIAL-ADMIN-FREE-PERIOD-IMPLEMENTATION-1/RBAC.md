# RBAC

New procedures:

- `admin.getCommercialConcession`
- `admin.grantCommercialConcession`
- `admin.reviseCommercialConcession`
- `admin.cancelCommercialConcession`

Each calls `assertAdminAccess`. Create with `freePeriod` remains on `admin.createUserSubscriptionByAdmin`, also `assertAdminAccess`.

Staff commercial authority is Admin RBAC. This is **not** a customer `requireFeature` key. Owner/admin restaurant role does not grant this capability through commercial entitlements.

Protected-user and trial subscriptions are rejected in `adminConcessions.ts` after the Admin gate.
