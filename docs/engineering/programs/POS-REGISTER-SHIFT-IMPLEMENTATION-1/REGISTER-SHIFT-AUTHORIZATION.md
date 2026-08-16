# REGISTER / SHIFT AUTHORIZATION

| Surface | Gate |
|---------|------|
| CRMP mutations | `assertRestaurantAccess` (owner/admin) |
| POS enter / sale / intake / settle | `PosAccessContext` + explicit POS permission |
| POS Register/Shift **read** | `POS_ACCESS` + restaurant/terminal scope |
| POS settlement **consume** | `POS_ACCESS` + `SETTLEMENT_INITIATE` + resolved CRMP context |

`POS_ACCESS ≠ SHIFT_OPEN ≠ SHIFT_CLOSE ≠ REGISTER_ADJUST`.

`SHIFT_OPEN`, `SHIFT_CLOSE`, and `REGISTER_ADJUST` remain **catalog-only**. This program does not attach them to CRMP mutations (that would either duplicate CRMP APIs or change who may open a Register). Existing CRMP authorization is not weakened.

Owner / admin / PLATFORM_OWNER are not POS cashiers without POS grants.
