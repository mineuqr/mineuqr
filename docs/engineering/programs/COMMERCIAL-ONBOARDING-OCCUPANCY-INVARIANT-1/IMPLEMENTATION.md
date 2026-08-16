# IMPLEMENTATION

## Decision

**A.** Explicit Commercial validation that the onboarding/trial plan permits first-restaurant proposedTotal = 1.

Not B (occupancy helper) — transaction boundary cannot host it without rewriting Commercial or splitting connections.  
Not a second limiter, counter, or restaurant table.

## Files

| File | Change |
|------|--------|
| `server/subscription-runtime/onboardingRestaurantCapacity.ts` | Commercial decide/resolve/assert |
| `server/subscription-runtime/index.ts` | Export |
| `server/auth-local/registerOwner.ts` | Assert before onboarding transaction; do not swallow Commercial errors |
| `server/auth-local.ts` | HTTP 403 capacity vs 400 validation vs 409 duplicate vs 500 onboarding |

## Not changed

Occupancy helper · 0094 · POS · `createRestaurantWithCommercialLimit` · restaurant schema · trial bind after commit · Live Plan editor allowing cap 0.
