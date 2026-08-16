# POS PRODUCTION READINESS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Deploy from this program:** NONE

## Production POS census

| Lifecycle | Count |
|-----------|-------|
| all `pos_terminals` | 0 |
| registered + active (occupy) | 0 |
| deactivated | 0 |
| replaced | 0 |

`pos_terminals` exists (0091). There is no live Production POS occupancy to migrate or repair.

## Application wiring (deployment candidate)

`server/pos/services/PosTerminalService.ts` uses `withCommercialLimitOccupancy` for:

- register (default `occupancyDelta = 1`)
- reactivate from `deactivated` (`occupancyDelta = 1`)
- replace: `occupancyDelta = 0` when previous lifecycle is provisioned; `1` otherwise
- locked-delta vs planned-delta mismatch → `lifecycle_conflict`

Deactivate does **not** go through the occupancy helper (G-10 release by COUNT).

tRPC mapping in `posRouter.ts` uses `throwCommercialOccupancyTrpcError` (G-06), not generic POS entitlement denial.

## Commercial limit gap

All sellable Live Plans are missing `posTerminals`.

Classification: **NON-BLOCKING / REQUIRED BEFORE POS COMMERCIAL USE**

After occupancy deploy, POS provision fail-closes until the catalog publishes the key. That is safer than an undefined cap. It does not block deploying occupancy for restaurants / categories / items.

## Result

PASS for occupancy application deployment. POS commercial use remains a later catalog + post-deploy concern.
