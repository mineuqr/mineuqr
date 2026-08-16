# AUTHORIZATION

```
verifiedProcedure
  → assertRestaurantPosScope
  → resolvePosTerminalAccess({ requiredPermission: "SETTLEMENT_INITIATE" })
  → require POS_ACCESS and SETTLEMENT_INITIATE
```

`POS_ACCESS ≠ SALE_CREATE ≠ CHECK_INTAKE ≠ SETTLEMENT_INITIATE`.

Entering POS, creating a POS sale, and initiating settlement are distinct permissions.

Owner / admin / PLATFORM_OWNER are not cashiers unless they hold the explicit POS grants.

Do not infer settlement authority from:

- owner
- admin
- PLATFORM_OWNER
- POS_ACCESS alone

Existing POS entitlement (`posTerminals` / `checkLimit`) remains the quantity gate. No new POS settlement commercial feature was created.
