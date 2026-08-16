# TEST RESULTS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  
**Date:** 2026-08-17  

## Targeted

| Suite | Result |
|-------|--------|
| `commercialInactiveOccupancy.tidb.test.ts` | **9 passed** |
| `commercialInactiveOccupancy.guards.test.ts` | **3 passed** |

## Regression

| Suite | Result |
|-------|--------|
| G-07 P8 | PASS `finalOccupancy: 2` |
| G-08 P12 | PASS `orphanCategories: 0` |
| TOCTOU delete ∥ category | PASS categories 0 |
| G-09 owner ∥ admin | PASS occupancy 2 (re-run serial; parallel G-08 cleanup collided on shared `G08-cat` / slug harness) |

## Build / check

`pnpm build` PASS. `pnpm check` **188**.
