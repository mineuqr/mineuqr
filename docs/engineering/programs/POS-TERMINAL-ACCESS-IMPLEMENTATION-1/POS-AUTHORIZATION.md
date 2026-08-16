# POS AUTHORIZATION

Reuse the Phase 1 catalog. No second permission system.

| Layer | Meaning |
|-------|---------|
| Restaurant scope | May enter the POS domain for this restaurant |
| Terminal access | May use this terminal (owned, active, entitled) |
| POS permission | May perform the requested operation |

`POS_ACCESS` is the Phase 2 enter/use permission.

Future keys (`SALE_CREATE`, `REFUND_*`, `SHIFT_*`, `REGISTER_ADJUST`) remain catalog-only.

Owner ≠ cashier. Admin ≠ cashier. PLATFORM_OWNER ≠ cashier.

Grants are restaurant-scoped `(restaurantId, userId, permission)`. Client-supplied permission is the **required** check, never a grant.
