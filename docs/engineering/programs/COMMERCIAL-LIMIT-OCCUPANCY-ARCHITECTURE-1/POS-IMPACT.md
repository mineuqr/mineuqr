# POS IMPACT

## Today

```
posTerminals → checkLimit(restaurant.userId) → insert pos_terminals
```

Same occupancy race as restaurants/categories/items. Unique `(restaurantId, code)` is not a quantity cap.

POS `version` is lifecycle OCC. Not occupancy.

## Required consumption (future)

POS **must** call the shared Commercial occupancy helper for slot-consuming mutations only:

- register (new code)  
- activate from deactivated  
- replace when previous is not provisioned  

Replace of a provisioned terminal stays slot-neutral (no extra lock needed for quantity; still tenant/auth).

Operational commands (sale, check, settlement, register/shift, drawer) **do not** consume `posTerminals`. They keep `entitlement.available` only.

## Forbidden POS artifacts

- POS occupancy service  
- POS locking  
- POS commercial database  
- POS reservation system  
- POS-specific counters  

If the shared helper lands, POS inherits correctness by replacing `assertProvisioningAllowed` + insert with `withCommercialLimitSlot("posTerminals", …)`.

## This program

No POS code changes.
