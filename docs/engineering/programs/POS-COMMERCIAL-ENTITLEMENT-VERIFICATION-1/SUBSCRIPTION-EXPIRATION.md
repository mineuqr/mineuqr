# SUBSCRIPTION EXPIRATION

## Commercial runtime (actual)

`syncCommercialLifecycle` + `lifecycleEnablesEntitlements`:

| Lifecycle | Entitlements enabled |
|-----------|----------------------|
| trial, active, grace | yes |
| expired, cancelled, suspended, archived, draft | no |

When disabled, `resolveEntitlementsFromLivePlan` sets `plan = NONE` and limits `{ restaurants: 0, categories: 0, items: 0 }` **without** `posTerminals`. `readLimitValue("posTerminals")` then returns **0** for non-admin.

`denyEntitlementsFailClosed` (unreadable live plan, invalid owner mode, integer plan id) also omits `posTerminals` → 0.

`checkLimit` on `plan === "NONE"` returns `allowed: false`, `cap: 0`, `policy: "denied"`.

## Effect on POS (no second freeze system)

| Surface | Expired / cancelled / suspended |
|---------|----------------------------------|
| Terminal access (`resolvePosTerminalAccess`) | `entitlement_unavailable` |
| POS Sale | denied (same gate) |
| Check Intake | denied |
| Settlement Initiation | denied |
| Register open/close | denied |
| Shift open/close | denied |
| Drawer Movement | denied |
| Terminal register / activate-from-deactivated / replace-non-provisioned | `PosEntitlementDeniedError` |
| Terminal deactivate | still allowed (tenant + owner/admin); reduces occupancy |
| Permission grant/revoke | still allowed (restaurant owner/admin RBAC). Grants cannot operate until entitlements return. |
| Entitlement read | returns `available: false` |

Commands are **not** identical at the admin vs cashier boundary: cashier operations stop; owner may still deactivate terminals and manage grants. That matches “capabilities disabled; account directed toward subscription handling” without a POS-owned freeze table.

## Trial

Valid trial → entitlements enabled → POS follows `posTerminals` on the trial Live Plan. Trial ended without grace → expired → POS unavailable.

## Missing subscription

No canonical subscription → legacy bridge or NONE. Customer without `posTerminals` → 0. Fail-closed.

## Do not invent

A POS-specific freeze, lockout table, or “POS subscription status” column.
