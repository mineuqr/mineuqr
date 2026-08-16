# API DESIGN

Canonical name (CRMP nest, Shift-owned cash):

`crmp.financialShift.recordDrawerMovement`

Not `crmp.register.drawerMovement` — cash is not a Register aggregate.

## Input

- `restaurantId` — asserted via `assertRestaurantAccess`
- `registerId` — server-loaded in restaurant scope
- `financialShiftId` — optional hint; server resolves active shift
- `movementType` — `paid_in | paid_out | safe_drop | manual_adjustment`
- `amount` — opaque decimal string
- `currencyCode` — optional; must match shift currency when present
- `reason` — required
- `idempotencyKey` — required
- `expectedVersion` / `at` — optional concurrency/time hints

Not accepted: `actorUserId`, `operatorUserId`, `userId`, `cashierId`, `movementId`.

Actor: `ctx.user.id`.

## Output

- `shift` — existing `FinancialShiftViewDto` (includes `expectedCashAmount`)
- `movement` — identity + type + amount + currency + reason + actor + recordedAt
- `alreadyApplied`

Full `drawer` graph remains hidden from existing shift DTOs.

POS must not call this from `posRouter` in this program.
