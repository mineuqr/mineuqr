# BUILD AND CHECK

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Working tree:** current deployment candidate. No application edits.

## Build

`pnpm build` — **PASS**

Vite client + esbuild `server/_core/index.ts` + `scripts/vercel-handler.ts` completed. Known chunk-size / `node:fs` browser-external warnings are pre-existing reporter noise, not occupancy defects.

## TypeScript

| | |
|--|--|
| TS BASELINE | **188** `error TS*` |
| TS CURRENT | **188** `error TS*` |
| TS DELTA | **0** |
| Command | `pnpm check` (`tsc --noEmit`) |
| Exit | non-zero because the 188 baseline errors exist |

No new occupancy, schema, or helper diagnostics. The previous 193 count remains explained as G-07 harness-only and is not present now.

## Result

PASS — build passes. TS baseline holds at 188.
