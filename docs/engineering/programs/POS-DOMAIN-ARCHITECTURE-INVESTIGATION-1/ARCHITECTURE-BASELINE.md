# ARCHITECTURE BASELINE

## Source package

`docs/engineering/programs/POS-PLATFORM-ARCHITECTURE-1/` is **not in this repository**. No `I-POS-*` files, no POS ADRs, no POS constitution docs were found under `docs/`.

This investigation treats the approved principles stated in the investigation brief (and the prior POS-PLATFORM-ARCHITECTURE-1 acceptance) as the baseline. It does **not** invent a replacement architecture.

## Production financial / operational baseline (in-repo, ratified)

| Concern | Authority | Evidence |
|---------|-----------|----------|
| Order | Order Domain / PlaceOrder | `server/order/application/PlaceOrderService.ts`, `IdentityPlaceOrderService.ts`, ADR-ARCH-001/007/019 |
| Session | Operational Session / Dining Session | `server/operational-session/`, `dining_sessions` |
| Check | Sole monetary aggregate | `operational_checks`, ADR-ARCH-020 |
| Settlement | Check-owned settle + Settlement Record | `CheckService.ts`, ADR-ARCH-022/026 |
| Register / Shift | CRMP | `crmp_registers`, `crmp_financial_shifts`, ADR-ARCH-028/030 |
| Reporting | Read / analytics | `server/reporting-platform/`, revenue = paid Check `grandTotal` |
| Commercial | Live Plan + hub | `getCommercialEntitlements`, `requireFeature`, `checkLimit` |
| Devices | Operational screens | `operational_devices`, `devices` capability |
| AuthN/AuthZ | `users.role` = `user` \| `admin` + restaurant ownership | `drizzle/schema.ts`, `assertRestaurantAccess` |

## Approved POS invariants (not to be redesigned)

POS = sales execution / cashier operational surface.
POS ≠ revenue / Check / Order / Settlement / Register / Reporting write-side.
POS Terminal ≠ hardware ≠ cashier ≠ register.
Channel ≠ payment method.
Cloud-authoritative v1. No POS add-on billing in Phase 1.
