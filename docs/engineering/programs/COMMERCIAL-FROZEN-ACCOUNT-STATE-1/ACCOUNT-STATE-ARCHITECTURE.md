# ACCOUNT-STATE-ARCHITECTURE.md

## Authority

Commercial account state is **derived** on every `resolveOwnerEntitlements` call.

Owner: `server/subscription-runtime/commercialAccountState.ts`  
Stamp: `withAccountState` in `subscriptionRuntimeService.ts`  
Capability authority remains: `getCommercialEntitlements` / `resolveOwnerEntitlements`

No new table. No migration. No second entitlement resolver.

## Layers (must stay separate)

```
Authentication
    ↓
Commercial Account State   ACTIVE | FROZEN | NONE
    ↓
Commercial Entitlement     getCommercialEntitlements
    ↓
Operation Authorization
```

## Derivation

| Condition | State | Reason |
|-----------|-------|--------|
| Platform Owner (`ownerExempt`) | `ACTIVE` | `platform_owner_exempt` |
| `entitlementsEnabled` | `ACTIVE` | `commercial_entitlements_enabled` |
| Canonical customer subscription exists and entitlements are disabled | `FROZEN` | `commercial_access_expired` |
| No canonical customer subscription | `NONE` | `no_customer_subscription` |

`NONE` is **not** FROZEN. Never-subscribed accounts are not frozen.

Grace (`entitlementsEnabled: true`) stays `ACTIVE`.

Cancelled / expired / suspended with a canonical user-level row (`restaurantId === 0`) → `FROZEN`.

## Persistence

State is **not** stored on `users`, UI, or `localStorage`.

It is stamped onto entitlement `meta.commercialAccountState` and `meta.commercialAccountStateReason` so clients can present the Frozen experience. Server enforcement re-derives from the hub.

## Why not a persisted FROZEN column

Existing lifecycle already encodes expiry:

- DB status + `trialEndsAt` / `currentPeriodEnd`
- `syncCommercialLifecycle` → `entitlementsEnabled`
- Canonical user-level subscription pick

A second stored account-state would compete with that authority. Schema change was not required; no migration was applied.
