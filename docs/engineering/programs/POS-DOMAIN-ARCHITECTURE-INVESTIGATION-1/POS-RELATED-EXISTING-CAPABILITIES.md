# POS-RELATED EXISTING CAPABILITIES

## First question — answer

**Yes.** Foundations exist for entitlement, tenant access, order entry, sessionless finance, settlement, and register attribution.
**No** existing object is a POS Terminal, Cashier permission set, or Included POS Quantity.

## What exists that looks like POS (and is not)

| Abstraction | Path | Why it is not POS Terminal |
|-------------|------|----------------------------|
| Operational Device | `operational_devices.deviceId` + role enum | Screen/hardware (KDS, expo, kiosk, waiter). Pairing + heartbeat. |
| CRMP `mobile_pos` | `crmp_registers.registerType` | Register catalog type, not a logical POS Terminal. |
| `devices` capability | Projection ID + `requireFeature(..., "devices")` | Boolean screen-fleet entitlement. |
| `devices` limit key | `COMMERCIAL_LIMIT_FILTER_KEYS` | Orphaned; not in `LIVE_PLAN_LIMIT_KEYS`; not `readLimitValue`. |
| Staff counter pickup settle | `StaffCounterPickupSettlementService.ts` | Cashier **collection** of existing Checks; does not create POS Terminals. |
| `order.settlePaid` | `server/routers.ts` public façade | Guest/token settle; not POS access. |
| Kiosk “proceed to cashier” copy | `KioskConfirmationStage.tsx` | Presentation only. |

## Reuse decisions

| Capability | Decision |
|------------|----------|
| Live Plan + `checkLimit` / limit values | **EXTEND** for `posTerminals` quantity (do not create a second entitlement system) |
| `requireFeature` / Projection | **REUSE** for other capabilities; **do not** reuse `devices` as POS |
| `assertRestaurantAccess` | **REUSE** tenant gate |
| Operational Device | **REFERENCE** later (optional hardware association). **NEW** terminal domain required |
| IdentityPlaceOrder + ephemeral session | **REUSE** for future direct sale |
| Check / Settlement / SR | **REUSE** as-is |
| CRMP | **REUSE** as Register boundary; do not build Register |
| `opsLog` | **REUSE** for terminal lifecycle events |
| RBAC platform docs | **EXTEND later** — not implemented |
