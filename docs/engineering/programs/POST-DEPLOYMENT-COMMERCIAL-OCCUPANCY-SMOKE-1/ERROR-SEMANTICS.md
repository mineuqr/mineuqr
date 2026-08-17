# ERROR SEMANTICS

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** deployed source + safe error-path inspection. Production infrastructure was not broken.

## G-06 (deployed)

`throwCommercialOccupancyTrpcError` in `server/subscription-runtime/commercialOccupancyTrpc.ts`:

| Error | tRPC code | Meaning |
|-------|-----------|---------|
| `CommercialLimitExceededError` | `FORBIDDEN` | quota / `limit_exceeded` |
| `CommercialOccupancyUnavailableError` | `INTERNAL_SERVER_ERROR` | infrastructure / capacity verification |

They are not mapped to generic unauthorized, a successful response, or a generic auth failure.

Restaurant / category / item creates call this mapper. POS uses the same occupancy errors through the shared helper. Onboarding HTTP maps the same two classes (G-04), not a second limiter.

No Production occupancy-unavailable event was synthesized.
