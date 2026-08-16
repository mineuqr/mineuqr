# TEST RESULTS

## TiDB domain races (authoritative)

```
$env:G07_REQUIRE_TIDB='1'
pnpm exec vitest run server/subscription-runtime/__tests__/commercialLimitOccupancy.tidb.domainRaces.test.ts
```

**18/18 passed** on `mineuqr-stagIn` / TiDB v8.5.3-serverless. Duration ~107s.

## Guards

```
pnpm exec vitest run \
  server/subscription-runtime/__tests__/commercialLimitOccupancy.domainRaces.guards.test.ts \
  server/subscription-runtime/__tests__/commercialLimitOccupancy.guards.test.ts \
  server/subscription-runtime/__tests__/onboardingRestaurantCapacity.guards.test.ts \
  server/db/__tests__/cascadeDeletes.posOrphans.guards.test.ts
```

**21/21 passed.**

## Occupancy unit regression

`commercialLimitOccupancy.test.ts` + `commercialOccupancyTrpc.test.ts`: **9/9 passed.**

## Build

`pnpm build` — PASS (vite + esbuild).

## Check

`pnpm check` — **193** `error TS*`.

Prior occupancy programs reported baseline **188**. Delta **+5** is entirely:

- `occupancyTestTidb.ts` TS7016 (G-07 `.mjs` import)
- `occupancyTidbWorker.ts` TS1378 × 4 (G-07 top-level await)

G-08 files (`occupancyG08Tidb.ts`, `occupancyG08Worker.ts`, `*.test.ts`) add **0**. Test files remain excluded by `**/*.test.ts`.

## Database mutation

Synthetic G-08 owners `980801801`–`980801803` and `g08-domain-race-%` slugs on **mineuqr-stagIn only**. Cleaned in `afterAll`. Production: **0**.
