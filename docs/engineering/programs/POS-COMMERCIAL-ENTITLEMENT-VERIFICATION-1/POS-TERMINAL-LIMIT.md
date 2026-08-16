# POS TERMINAL LIMIT

## Authoritative path

```
Live Plan
    → commercial_limit_values.limitKey = posTerminals
    → resolveOwnerEntitlements
    → readLimitValue("posTerminals")
    → checkLimit({ ownerId, limitKey: "posTerminals", proposedTotal })
    → PosEntitlementService
    → POS Terminal provisioning
```

`ownerId` is always `restaurant.userId` (the commercial owner of the restaurant), never the cashier id.

## `readLimitValue` semantics (actual)

- Key present → that value (`null` = unlimited).  
- Key absent + plan ADMIN or `commercial.isAdmin` → unlimited (`null`).  
- Key absent + customer plan → **0** (fail-closed).  
- `devices` → `undefined` → `checkLimit` `limit_key_unsupported` (denied).  

Missing does **not** mean unlimited for restaurants.

## Provisioning occupancy

Provisioned = lifecycle `registered` **or** `active` (`isProvisionedLifecycle`).

| Mutation | Slot check |
|----------|------------|
| `register` (new code) | `proposedTotal = provisioned + 1` |
| `register` (existing non-replaced code) | idempotent return; no extra slot |
| `activate` from `deactivated` | `provisioned + 1` |
| `activate` from `registered` | no extra slot (already provisioned) |
| `deactivate` | none (releases occupancy on next resolve) |
| `replace` of provisioned | no extra slot |
| `replace` of non-provisioned | `provisioned + 1` |

## Forbidden (verified absent)

- `pos_terminal_limits`  
- `pos_plan_limits`  
- `pos_subscription_limits`  
- `pos_entitlement_limits`  
- client-supplied quantity bypass  
- `devices` as POS count  

## Production seed

Live Plan rows for `posTerminals` are **optional**. Until Commercial seeds them on plans that sell POS, non-admin quantity is 0. That is approved fail-closed behavior, not a POS resolver bug. Seeding is a Commercial apply concern, not this program.
