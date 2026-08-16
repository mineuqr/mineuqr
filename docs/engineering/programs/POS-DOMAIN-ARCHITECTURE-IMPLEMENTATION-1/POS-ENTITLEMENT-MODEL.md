# POS ENTITLEMENT MODEL

## Authority

```
Live Plan
  → commercial_limit_values.limitKey = posTerminals
  → readLimitValue
  → checkLimit(ownerId, "posTerminals", proposedTotal)
  → Effective POS Entitlement
```

There is no second entitlement system, no POS subscription, no devices-based quantity, and no client-side quantity enforcement.

## Key

`posTerminals` — a **limit**, not a capability flag.

`devices` remains the Operational Device capability/limit and is not POS quantity.

## Fail-closed

If a Live Plan has no `posTerminals` row:

- non-admin → quantity `0`
- do not assume `1`
- do not grant unlimited
- do not use device count

ADMIN / `commercial.isAdmin` → unlimited (`null`) unless `posTerminals` is explicitly set.

## Effective entitlement

`resolveEffectivePosEntitlement(restaurantId)` derives:

- included quantity (`null` = unlimited)
- provisioned count (`registered` + `active`)
- remaining slots
- whether another terminal is allowed

Future add-ons may sum into the same resolver. Add-on billing is **not** implemented.

## Downgrade

New provisioning fail-closes when the current Live Plan quantity is exhausted. Excess existing terminals are not auto-deleted. Deactivate/replace policy for downgrade is a later program.
