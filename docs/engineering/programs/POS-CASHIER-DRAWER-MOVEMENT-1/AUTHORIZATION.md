# AUTHORIZATION

| Operation | Gate |
|-----------|------|
| CRMP owner UI (`crmp.financialShift.recordDrawerMovement`) | `assertRestaurantAccess` (unchanged) |
| POS drawer movement | `POS_ACCESS` + `REGISTER_ADJUST` + terminal + restaurant scope |

`POS_ACCESS ≠ SHIFT_OPEN ≠ SHIFT_CLOSE ≠ REGISTER_ADJUST`.

`REGISTER_ADJUST` is now enforced for this POS command. It is not granted by owner, admin, or `PLATFORM_OWNER`.

CRMP router authorization is not weakened. A POS cashier still cannot call `crmp.*` unless they independently pass `assertRestaurantAccess`.
