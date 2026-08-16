# POS CHECK AUTHORIZATION

```
verifiedProcedure
  → assertRestaurantPosScope
  → resolvePosTerminalAccess({ requiredPermission: "CHECK_INTAKE" })
  → require POS_ACCESS and CHECK_INTAKE
```

`POS_ACCESS ≠ CHECK_INTAKE`.

Owner / admin / PLATFORM_OWNER are not cashiers unless they hold the explicit grants.

Existing POS entitlement (`posTerminals` / `checkLimit`) remains the quantity gate. No per-Check charge. No new Check quantity limit.
