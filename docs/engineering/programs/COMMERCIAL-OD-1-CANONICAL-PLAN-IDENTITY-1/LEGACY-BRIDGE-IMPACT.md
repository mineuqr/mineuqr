# LEGACY-BRIDGE-IMPACT

## What they are

| Artifact | Kind |
|----------|------|
| `LEGACY_PLAN_BRIDGE` | Temporary **identity bridge** (integer ↔ code). Not commercial authority. |
| `PLAN_ID_TO_CATALOG_PLAN` | Duplicate **identity bridge** (integer ↔ BASIC/PROFESSIONAL/ENTERPRISE). |

They are not price maps. They are not entitlement maps. They are not permanent architecture.

## Why they still exist

Integer APIs and `user_subscriptions.planId` still need a path to a Live Plan.

## What must happen before removal

1. OD-2: subscription column stores UUID.
2. OD-3: checkout/admin/public integer `planId` retired or dual-read ended.
3. Trial writes UUID.
4. Webhook metadata uses UUID (or no longer needs plan identity).
5. Bootstrap seeds by `code` list, not by bridge integers.
6. OD-4: delete `PLAN_ID_TO_CATALOG_PLAN` with the bridge (one retirement, not a new map).
7. Guards prove no runtime integer plan identity remains.

Until then the bridges stay. Do not move them into a new mapping table.
