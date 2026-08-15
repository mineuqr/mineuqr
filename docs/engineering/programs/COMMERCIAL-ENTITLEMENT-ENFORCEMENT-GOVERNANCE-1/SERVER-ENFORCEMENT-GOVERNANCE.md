# SERVER-ENFORCEMENT-GOVERNANCE.md

## Mandatory order (CE-04)

```
Authentication
  → Tenant / Restaurant Access / RBAC
  → getCommercialEntitlements
  → requireFeature(userId, "<canonical-key>")
  → operation authorization
  → persistence
```

Certified example: `assertDeviceManagementAccess` → `requireDevicesFeature` → `requireFeature(..., "devices")`.

## RBAC boundary (CE-05)

Restaurant ownership and `role=admin` authorize **tenant access only**.

They MUST NOT grant `devices` or any other commercial capability.

## Fail closed (CE-13)

Resolver failure, missing data, invalid owner mode, or unavailable simulation → deny.

## Static enforcement

Practical: architecture guards on the certified `devices` path and forbidden matrix names in the device-authorization layer.

Manual Architecture Authority gate: every new commercial mutation (CE-06 / CE-29). Repo-wide “every mutation has requireFeature” is not automated — it would be brittle and would mis-classify non-commercial operations.
