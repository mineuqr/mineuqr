# TEST RESULTS

**Date:** 2026-08-16  
**Production mutation:** 0  
**Migration:** none  

## Targeted

5 files / **27 passed** / 0 failed

- `onboardingRestaurantCapacity.test.ts`  
- `onboardingRestaurantCapacity.guards.test.ts`  
- `onboardingRestaurantCapacity.catalog.test.ts`  
- `auth-local.registerOnboardingCapacity.test.ts`  
- `auth-local.register.test.ts`  

## Combined regression

Predecessor occupancy combined suite **plus** onboarding/register/trial files:

| Metric | Occupancy hardening (G-01) | This program |
|--------|---------------------------:|-------------:|
| Test files | 56 | **62** |
| Tests | 385 | **415** |
| Failed | 0 | **0** |

Includes POS, Commercial occupancy (isolated Docker MySQL 8 concurrency file), plan limits, catalog, CRMP, Order/Check/Settlement, reporting parity.

## Build

`pnpm run build` — Vite production client + esbuild server bundles completed (`dist/index.js`, `dist/vercel-api.mjs`).

## Check

`pnpm run check` — **188** `error TS*` — matches baseline. No new errors attributed to this program.

## Pre-existing

Check 188 is the known baseline, not a new onboarding failure.
