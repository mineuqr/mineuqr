# IMPLEMENTATION-DESIGN.md

## Authority

Forensics: Screen create succeeded after `assertRestaurantAccess` only. The hub already resolved Basic `devices = false`.

## Design

Reuse the existing hub. Do not add a matrix.

```
verifiedProcedure
  → assertRestaurantAccess
  → requireFeature(userId, "devices")
  → persist
```

Adapter:

- `requireDevicesFeature` → `requireFeature(..., "devices")` → TRPC `FORBIDDEN` on deny or resolver failure
- `assertDeviceManagementAccess` → restaurant access, then `requireDevicesFeature`

Actor: authenticated `ctx.user.id` (same owner the hub already uses for Platform Owner simulation and customer subscriptions).

`kitchen` is not used for fleet create.

FULL_PLATFORM remains unrestricted because the hub sets all `FEATURE_KEYS` true.

No Live Plan, owner-mode, subscription, billing, or schema changes.
