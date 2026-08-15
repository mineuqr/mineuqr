# PUBLIC-QR-FROZEN-BEHAVIOR.md

## Rule

Persistent QR identity survives expiration.

Do **not** delete, regenerate, or replace the QR or public slug.

## Resolution

```
QR scan
  → Public menu resolution (same slug)
  → Owner commercial account state
  → FROZEN → Frozen / Subscription Required
```

`loadQrOrderingRuntimeSources`:

- Resolves `resolveOwnerEntitlements(restaurant.userId)`
- If FROZEN: empty menu projection, `canBrowse` / `canPlaceOrder` false, `featureFlags.commercial_frozen`, reason `commercial_account_frozen`
- Slug and restaurant id are unchanged

Client:

- `deriveOrderingRuntimeGates.commercialFrozen`
- `FrozenPublicMenuExperience` on MenuView and QR checkout

## What is not this program

Kiosk / waiter operational device channels keep their own loaders. Already-issued device runtime is not revoked by Frozen. Public QR is the approved customer-facing freeze surface.
