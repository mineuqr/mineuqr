# TEST RESULTS

**Program:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1

## pnpm check

Certified via `tsc --noEmit --incremental false` (no arbitrary cache delete), then `pnpm check`. Both: 28 / TS2802 0.

| | Before (ES5 incremental false) | After (ES2020 incremental false) | After `pnpm check` |
|--|--------|------------------------|----------------|
| TOTAL | 148 | 28 | 28 |
| TS2802 | 118 | **0** | **0** |
| Exit | 2 | 2 | 1 (tsc non-zero while 28 remain) |

## pnpm build

**PASS** (Vite + esbuild server + vercel handler). Chunk hash unchanged.

## Focused tests

| File | Result |
|------|--------|
| `shared/operational-session/__tests__/checkSettlementMethods.architecture.guards.test.ts` | 6/6 PASS |

`versionCompare.ts` is not a test file; no extra vitest cases there.

Vitest uses Vite, not `tsc --noEmit`. Settlement catalog guards still require selectable `cash` \| `card`.

## Isolation

| Field | Value |
|-------|--------|
| Commercial Occupancy | unchanged |
| Database | 0 |
| Production | 0 |
| Deployment | 0 |
