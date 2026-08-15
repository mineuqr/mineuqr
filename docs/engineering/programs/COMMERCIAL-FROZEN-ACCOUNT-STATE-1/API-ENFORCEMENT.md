# API-ENFORCEMENT.md

## Rule

Route protection is insufficient. Direct commercial mutations by a FROZEN customer must fail before persistence.

```
Authentication
  → Restaurant / RBAC
  → Commercial Account State
  → Entitlement
  → Capability
  → Mutation
```

If FROZEN: **DENY**.

## Implementation

`verifiedProcedure` runs `enforceFrozenCommercialMutations`.

Listed prefixes in `FROZEN_BLOCKED_MUTATION_PREFIXES` call `assertCommercialAccountActive`, which re-resolves the hub.

Fail-closed: hub errors become FORBIDDEN.

## Blocked (minimum + commercial operations)

Restaurant / category / menu item / offer / table / holiday mutations, including template/colors/fonts (via `restaurant.update*`) and image uploads.

Device **management** and **fleet**. Printer management.

Owner session close / mark paid / complimentary. Order status and waiter/staff settlement mutations.

## Not blocked (renewal and identity)

- `subscription.createCheckoutSession` / `createTapCheckout`
- `commercial.getEntitlements`
- invoice / payment reads
- auth / profile
- `ownerAccess.*`

## Device runtime

`deviceProcedure` (already-issued screens) is not this denylist. Fleet management is blocked. Public QR guest order is denied because Frozen disables the `ordering` entitlement (`hasFeature("ordering")` is false).
