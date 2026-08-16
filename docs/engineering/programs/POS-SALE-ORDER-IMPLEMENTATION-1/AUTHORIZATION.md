# AUTHORIZATION

```
verifiedProcedure
  → assertRestaurantPosScope
  → resolvePosTerminalAccess({ requiredPermission: "SALE_CREATE" })
  → require POS_ACCESS and SALE_CREATE on the context
```

`POS_ACCESS ≠ SALE_CREATE`.

Owner / admin / PLATFORM_OWNER are not cashiers unless they hold the explicit grants.

Management APIs remain `assertRestaurantAccess` (owner/admin). Sale uses POS scope + terminal access.

Denied when:

- unauthenticated (`verifiedProcedure`)
- restaurant POS scope missing
- terminal missing / inactive / foreign
- POS entitlement unavailable
- `SALE_CREATE` missing
- `POS_ACCESS` missing

Authorization runs before item validation so an unauthorized empty sale is still `pos_permission_denied`.
