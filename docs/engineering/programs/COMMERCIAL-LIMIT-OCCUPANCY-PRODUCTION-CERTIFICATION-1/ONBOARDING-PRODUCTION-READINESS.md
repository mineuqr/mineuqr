# ONBOARDING PRODUCTION READINESS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1

## G-04 retained

`server/auth-local/registerOwner.ts`:

1. `assertOnboardingFirstRestaurantPermitted()` runs **before** the register transaction.
2. The register transaction inserts user + first restaurant + trial subscription together.
3. The helper `withCommercialLimitOccupancy` is **not** used inside register (it cannot join that txn).

This is the certified G-04 0→1 path. Not redesigned.

## HTTP error mapping (`server/auth-local.ts`)

| Error | HTTP | Client code |
|-------|------|-------------|
| `CommercialLimitExceededError` | 403 | `error.reasonCode` + restaurants quota message |
| `CommercialOccupancyUnavailableError` | 403 | `commercial_capacity_unavailable` + capacity-verification message |

Distinct from 401 auth and from generic 500 onboarding failure. Not collapsed into `غير مصرح بالوصول`.

tRPC G-06 (`FORBIDDEN` / `INTERNAL_SERVER_ERROR`) applies to live quantity routers, not this HTTP register contract.

## Result

PASS — onboarding remains G-04 compatible with the Production schema.
