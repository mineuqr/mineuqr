# CURRENT-STATE-FORENSICS.md

Evidence from OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1 (re-verified 2026-08-15). No new writes.

## Owner identity (already canonical)

| Fact | Value |
|------|--------|
| users.id | 1 |
| openId | `j4Ztx2Wi3et3TD5zYNG5fy` |
| Detection | `ENV.ownerOpenId` via `isPlatformAccountUserId` — **not** `userId === 1` |
| role | admin (does **not** grant commercial ADMIN — ADMIN-AUTH-1C) |
| accountClassification | INTERNAL |
| Subscription | `600001`, restaurantId 0, plan 30002, period ended 2026-08-07 |
| Binding | none |
| Entitlement path today | Unbound Legacy Bridge → period check → **NONE** |

## Why a fake subscription is rejected

Using `600001` (renew, extend, bind, or replace) would:

- make the platform operator a customer
- couple access to period / checkout / invoices
- require binding to use Live Plans
- still expire again

The owner last signed in **after** the period ended. Access must come from **PLATFORM_OWNER**, not from that row. Leave `600001` as historical data.

## Existing hooks this decision reuses

- Platform identity: `server/platformAccount.ts` + `ENV.ownerOpenId`
- Single entitlement hub: `getCommercialEntitlements` → `resolveOwnerEntitlements`
- Live Plan consume: `resolveLivePlanCapabilities` / catalog plan **code**
- Presentation: Commercial Catalog presentation (no parallel capability list)
- Entitlement cache today: `ownerId:second` only — **insufficient** once modes exist

## What must not be reused as owner authority

- `user_subscriptions.status` / `currentPeriodEnd`
- `commercial_subscription_bindings`
- `role === "admin"`
- `accountClassification === "INTERNAL"` (KPI population, not access)
- Frozen `planFeatureMatrix.ADMIN` as the long-term Full Platform grant (it is a static row; Full Platform must follow the live Projection vocabulary)
