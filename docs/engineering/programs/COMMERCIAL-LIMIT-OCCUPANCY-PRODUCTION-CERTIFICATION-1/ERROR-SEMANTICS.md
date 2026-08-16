# ERROR SEMANTICS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**G-06 file:** `server/subscription-runtime/commercialOccupancyTrpc.ts`

## Live tRPC (G-06)

| Error | tRPC code | Semantics |
|-------|-----------|-----------|
| `CommercialLimitExceededError` | `FORBIDDEN` | Quota / `checkLimit` denial |
| `CommercialOccupancyUnavailableError` | `INTERNAL_SERVER_ERROR` | Capacity verification / DB unavailable |

Wired from:

- `createRestaurantWithCommercialLimit` / category / item (`subscriptionPlanLimits.ts`)
- POS router `mapPosError` (before generic POS entitlement)

Not mapped to unauthorized / generic auth.

## Onboarding HTTP (G-04)

Register keeps distinct 403 bodies and codes. Unavailable is not 401 and not the generic auth string. See `ONBOARDING-PRODUCTION-READINESS.md`.

## Regression

G-07 P15, G-09, and G-11 error-semantics cases re-passed this program (`FORBIDDEN` vs `INTERNAL_SERVER_ERROR`).

## Result

PASS — G-06 preserved on the deployment candidate.
