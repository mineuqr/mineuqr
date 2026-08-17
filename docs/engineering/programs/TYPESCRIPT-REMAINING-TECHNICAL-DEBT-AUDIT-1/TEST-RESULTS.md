# TEST RESULTS

**Program:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1

## Typecheck

| Command | Before source edit | After TDA-013 |
|---------|-------------------:|--------------:|
| `pnpm check` | 28 / TS2802 0 / App.tsx 0 | **27** / TS2802 0 / App.tsx 0 |
| `tsc --noEmit --incremental false --pretty false` | 28 / TS2802 0 | **27** / TS2802 0 |

The pair matched in both states.

## Build

`pnpm build` **PASS** (Vite + esbuild server + vercel handler).

Client main chunk hash changed because the FIX_NOW edited a client hook (`index-BelSBqmR.js`). Expected.

## Focused tests

| File | Result |
|------|--------|
| `architectureGuards.test.ts` | 43 pass |
| `runtimePublicApiConsolidation.test.ts` | 14 pass |
| `RuntimeContextFactory.test.ts` | 6 pass |
| **Total** | **63 / 63** |

No test weakening. No unrelated test edits.

## Isolation

| Field | Value |
|-------|--------|
| Occupancy / 0094 / checkLimit | not modified |
| Database | 0 |
| Production | 0 |
| Migration | 0 |
| Deployment | 0 |
| Commit / push | not performed |
