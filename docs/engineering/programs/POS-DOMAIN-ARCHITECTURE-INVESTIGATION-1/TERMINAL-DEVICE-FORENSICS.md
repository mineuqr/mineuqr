# TERMINAL / DEVICE FORENSICS

## Existing device identity

| Field | Evidence |
|-------|----------|
| Table | `operational_devices` (`drizzle/schema.ts`) |
| PK | `deviceId` varchar(64) |
| Tenant | `restaurantId` (indexed with status) |
| Role | Enum: kitchen/expo/pickup/customer/print_monitor/self_ordering_kiosk/waiter_display |
| Lifecycle | `status` = `active` \| `disabled` |
| Hardware-ish | Pairing tokens (`operational_device_tokens`), heartbeat `lastSeenAt`, `screenConfig` + revision |
| Auth | Device session + `assertDeviceManagementAccess` = restaurant access then `requireFeature("devices")` |

Roles: `server/operational-device/domain/deviceRoles.ts`.
No `pos`, `cashier`, or `terminal` role.

## Screen vs device

The operational-device model is a **logical screen record bound to pairing credentials**. It is both: a durable row (logical) and a paired physical/browser instance (credential/heartbeat). Identity is `deviceId`, not a POS-001 business code.

## Provisioning / activation

Device create + token issue + pairing (`OperationalDeviceRegistryService`, `ScreenPairingService`). Disable via `status=disabled`. Replacement rotates tokens; `deviceId` is the screen identity.

## Suitable for POS Terminal?

**No.** Approved POS Terminal is:

- Logical authorized point of sale
- Counted against **POS quantity entitlement**
- Distinct from hardware, cashier, and register
- Codes like POS-001 with replacement that **preserves historical identity**

Operational Device is:

- Counted (commercially) only via boolean `devices` (and an unused `devices` limit key)
- Role-typed as kitchen/waiter/kiosk screens
- Pairing/heartbeat oriented
- Not a sales-execution identity for Check/Reporting cashier/terminal dimensions

Reusing it as POS Terminal would **violate** I-POS-15 (terminal ≠ hardware) and conflate screen fleet with POS slots.

## Conclusion

**NEW POS TERMINAL DOMAIN REQUIRED.**

Optional later: **REFERENCE** `operational_devices.deviceId` as a non-canonical association (which screen is parked at POS-001). Do not use `deviceId` as POS Terminal ID.

**REUSE** tenant + `devices` capability only for the existing screen fleet — not for POS provisioning.
