# AUTHORIZATION

| Operation | Gate |
|-----------|------|
| CRMP owner UI (`crmp.*`) | `assertRestaurantAccess` (unchanged) |
| POS register open | `POS_ACCESS` + `SHIFT_OPEN` + terminal + restaurant scope |
| POS shift open | `POS_ACCESS` + `SHIFT_OPEN` + terminal + restaurant scope |
| POS shift close | `POS_ACCESS` + `SHIFT_CLOSE` + terminal + restaurant scope |
| POS register close | `POS_ACCESS` + `SHIFT_CLOSE` + terminal + restaurant scope |
| Cash movements | Not exposed. `REGISTER_ADJUST` remains catalog-only |

`POS_ACCESS ≠ SHIFT_OPEN ≠ SHIFT_CLOSE ≠ REGISTER_ADJUST`.

Owner / admin / PLATFORM_OWNER are not cashiers without explicit POS grants.

CRMP router authorization is not weakened.
