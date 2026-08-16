# CHECK INTAKE ARCHITECTURE

```
Authenticated cashier
  → verifiedProcedure
  → PosCheckIntakeService
       → assertRestaurantPosScope
       → resolvePosTerminalAccess(CHECK_INTAKE)
       → require POS_ACCESS + CHECK_INTAKE
       → load canonical Order
       → require same restaurant + cashier_pos + not cancelled
       → idempotency exclusive key
       → ensureCheckForOrder (existing Check Domain)
  → open sessionless Check
```

POS Sale already places a canonical Order. IdentityPlaceOrder may have enrolled that Order already. Intake is the explicit POS command that consumes the Order and returns the Check identity.

`ensureCheckForOrder` is idempotent: an existing open blocking membership is reused. A second active Check is not created.
