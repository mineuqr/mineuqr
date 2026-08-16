# IMPLEMENTATION

| File | Change |
|------|--------|
| `server/subscription-runtime/commercialOccupancyTrpc.ts` | Shared mapper + client-safe constants |
| `server/subscription-runtime/index.ts` | Export |
| `server/subscriptionPlanLimits.ts` | `mapOccupancyError` delegates to mapper |
| `server/pos/services/PosTerminalService.ts` | Stop wrapping Commercial occupancy errors as POS entitlement denial |
| `server/pos/api/posRouter.ts` | `mapPosError` uses mapper first |

Not changed: occupancy helper, `checkLimit`, 0094, G-04 HTTP mapping, global errorFormatter.
