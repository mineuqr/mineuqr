# ARCHITECTURE GUARDS

Guards encode **invariants**, not helper internals.

## POS (`pos.architecture.guards.test.ts`)

Provisioned replace must:

- call `withCommercialLimitOccupancy`
- choose delta from `isProvisionedLifecycle(previous.lifecycle)` (`? 0`)
- **not** call `performReplace(null)`
- **not** invent `PosOccupancyService`
- **not** use `GET_LOCK`
- **not** lock `commercial_limit_values`

## Commercial (`commercialLimitOccupancy.guards.test.ts`)

POS consumer must still contain `withCommercialLimitOccupancy` / `occupancyDelta` and must **not** contain `performReplace(null)`.

0094 lock table and helper `FOR UPDATE` / COUNT-in-caller / `checkLimit` as cap remain the predecessor guards. This program does not rewrite them.

## What guards do not freeze

Exact `performReplace` function name, Drizzle SQL text, or test fixture table names.
