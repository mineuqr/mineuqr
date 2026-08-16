# POS FINAL AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

No POS-specific Commercial system. Cap = `checkLimit({ limitKey: "posTerminals" })`. Occupancy = provisioned COUNT. Serialization = shared helper.

| Path | Occupancy | Result |
|------|-----------|--------|
| provision / register | delta 1 | Helper + `checkLimit` |
| replace provisioned | delta 0 | Slot-neutral; allowed at over-cap (G-11) |
| deactivate | COUNT drops | No helper wrap |
| reactivate (deactivated→active) | delta 1 | Helper; blocked at cap |
| hard-delete API | none | Cascade only |
| admin / owner provision | same `PosTerminalService` | Restaurant access, not extra slots |
| failed provision | rollback | No slot |
| concurrent provision | G-07 P8 | occupancy ≤ cap |
| concurrent replace | G-07 P9 / G-08 P6 | occupancy 1 |
| replace ∥ delete | TOCTOU | orphans 0 |
| provision ∥ delete | TOCTOU | orphans 0 |

`PosEntitlementService.resolve` is a **read** of included vs provisioned. It is not a second create limiter.

`assertProvisioningAllowed` is unused on the mutation path. If called, it would map `checkLimit` deny to `PosEntitlementDeniedError` (authorization-shaped). **NON-BLOCKING / SAFE TO DEFER** cleanup. Register does not use it.

Error mapping on `posRouter`: exceeded / unavailable go through `throwCommercialOccupancyTrpcError` before `PosEntitlementDeniedError`.
