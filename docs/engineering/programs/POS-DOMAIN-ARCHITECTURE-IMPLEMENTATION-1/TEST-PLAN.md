# TEST PLAN

## Domain

- Terminal identity (UUID, code, not device/cashier/register)
- Restaurant isolation
- Lifecycle + replacement preserves historical id/code
- Idempotent same-code registration
- Replace of provisioned terminal does not consume an extra slot

## Entitlement

- Missing quantity fail-closed
- limit 0 deny; limit 1 allow then deny; N vs N+1
- Client cannot override entitlement
- `readLimitValue("posTerminals")` vs `devices`
- Optional Live Plan key validation
- Real `checkLimit` integration

## Authorization

- Owner without grant denied
- Inactive terminal denied
- Cross-restaurant terminal denied
- `settlePaid` is not POS auth (guard)

## Channel / guards

- `cashier_pos` registered
- Table/QR preserved on settle
- POS ≠ Device / Order / Check / Settlement / Register / Reporting
- POS quantity ≠ devices
