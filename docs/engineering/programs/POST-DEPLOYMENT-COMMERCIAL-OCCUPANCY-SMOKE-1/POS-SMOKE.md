# POS SMOKE

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** no Production POS mutation.

## Production data

POS terminals = 0. Provisioned = 0. Deactivated = 0. Replaced = 0.

## Deployed wiring

`PosTerminalService` provision / reactivate / replace call `withCommercialLimitOccupancy` with `limitKey: posTerminals`.

Provisioned replace: `occupancyDelta = 0` when previous lifecycle is provisioned; otherwise `1`. Locked re-read rejects lifecycle conflict.

COUNT = provisioned lifecycle only. Cap = `checkLimit({ ownerId: restaurant.userId, limitKey: "posTerminals" })`.

Missing Live Plan `posTerminals` fail-closes (`limit_key_unsupported`). Already classified: **REQUIRED BEFORE POS COMMERCIAL USE**. Not seeded.

## Result

**PASS — NO PRODUCTION POS MUTATION**
