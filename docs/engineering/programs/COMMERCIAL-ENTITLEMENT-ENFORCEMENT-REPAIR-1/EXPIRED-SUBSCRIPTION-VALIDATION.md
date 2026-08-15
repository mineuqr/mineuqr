# EXPIRED-SUBSCRIPTION-VALIDATION.md

No subscription rows were modified.

Existing hub semantics:

- Lifecycle that disables entitlements → plan `NONE` → `deniedFeatures()` → `devices = false`
- `requireDevicesFeature` then denies

Covered in `deviceCapabilityEnforcement.matrix.test.ts` (`expired / NONE → devices denied`).

This does **not** globally lock authenticated pages. Only operations that require `devices` (and other already-gated capabilities such as `ordering`) are denied.
