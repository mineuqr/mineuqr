# TEST RESULTS

**Date:** 2026-08-16  
**Production mutation:** 0  

## Targeted

3 files / **17 passed**

- `server/db/cascadeDeletes.test.ts` (10, including 2 new POS cascade cases)  
- `server/db/__tests__/cascadeDeletes.posOrphans.guards.test.ts` (2)  
- `server/subscription-runtime/__tests__/commercialLimitOccupancy.guards.test.ts` (5)

## Combined regression

POS + occupancy + onboarding + cascade + plan limits + CRMP + Order/Check/Settlement + reporting parity:

**62 files / 417 passed / 0 failed** (G-04 combined was 62 / 415 on a near-identical command).

## Build

PASS (`pnpm run build`)

## Check

**188** `error TS*` — baseline. No new errors from this program.
