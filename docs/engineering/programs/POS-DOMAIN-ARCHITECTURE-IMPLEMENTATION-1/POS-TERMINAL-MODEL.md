# POS TERMINAL MODEL

A POS Terminal is a **logical authorized point of sale**.

It is not:

- an Operational Device / screen
- a cashier user
- a CRMP Register
- a Financial Shift
- a hardware / device id

## Identity

Stable UUID `id`. Restaurant-scoped unique `code` (`POS-001`, or an explicit code). Hardware id is never canonical.

## Lifecycle

`registered` → `active` → `deactivated`
`registered` | `active` | `deactivated` → `replaced`

Provisioned (counts toward quantity): `registered`, `active`.
Not provisioned: `deactivated`, `replaced`.

Replacement creates a **new** terminal id/code and marks the previous row `replaced` with `replacedByTerminalId`. Historical identity is never rewritten or deleted.

## Device association

`optionalDeviceId` is nullable. Provisioning does not require `operational_devices`. Device may be associated later without becoming identity.

## Register / Shift boundary

```
POS Terminal
  └── future association → CRMP Register / Shift
```

POS Terminal ≠ Register ≠ Shift. Wiring belongs to `POS-REGISTER-SHIFT-IMPLEMENTATION-1`.
