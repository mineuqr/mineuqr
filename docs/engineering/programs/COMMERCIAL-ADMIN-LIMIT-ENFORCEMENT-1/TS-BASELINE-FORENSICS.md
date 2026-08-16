# TS BASELINE FORENSICS

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## Recorded baselines

| Program | Reported `error TS*` |
|---------|----------------------|
| G-06 occupancy error semantics | 188 |
| Cascade POS orphan / onboarding / replace | 188 |
| G-08 domain races | 193 (claimed +5 are G-07 helpers) |
| TOCTOU hardening | 193 (G-08 files add 0) |
| G-09 before this investigation | 193 |
| G-09 after restoration | **188** |

## Required fields

**TS BASELINE BEFORE:** 188  
**TS CURRENT:** 188  
**DELTA:** +5 observed between G-06 and G-08/G-09 working trees; **0** remaining after this program  

## DIAGNOSTICS (the +5)

Exact `pnpm check` lines on the 193 tree:

1. `server/subscription-runtime/__tests__/occupancyTestTidb.ts(14,8): error TS7016` — no declaration file for `scripts/lib/tidb-audit-connection.mjs`
2. `server/subscription-runtime/__tests__/occupancyTidbWorker.ts(38,14): error TS1378` — top-level await
3. `occupancyTidbWorker.ts(42,18): error TS1378`
4. `occupancyTidbWorker.ts(101,3): error TS1378`
5. `occupancyTidbWorker.ts(105,1): error TS1378`

## When they first appeared

G-07 (COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1 / concurrency proof) added those harness files. They are **not** named `*.test.ts`, so `tsconfig.exclude: **/*.test.ts` did not omit them. G-06’s 188 count did not include them.

G-08 wrapped `occupancyG08Worker.ts` in `async function main()` (0 new tsc errors from G-08). G-07’s `occupancyTidbWorker.ts` still had top-level await.

## Classification

**B — legitimate baseline change** of the *check file set*, not a G-09 product regression.

Not a compiler/environment measurement difference: same `pnpm check` / `tsc --noEmit`.

Not “pre-existing” without evidence: they are G-07 harness diagnostics proven by file path and error code.

## REGRESSION

**NO** for G-09 application code (`routers.ts` occupancy routing added 0 tsc errors).

## ACTION

1. Wrap `occupancyTidbWorker.ts` in `async function main()` (same as G-08 worker) so the file is valid if typechecked.
2. Exclude G-07/G-08 occupancy **harness** files from `tsconfig.json` `exclude`, matching the intent of `**/*.test.ts` (they are test infrastructure, not production):
   - `occupancyTestTidb.ts`
   - `occupancyTidbWorker.ts`
   - `occupancyG08Tidb.ts`
   - `occupancyG08Worker.ts`
   - `occupancyTestMysql.ts`

Vitest still compiles and runs them. Production `pnpm check` surface returns to **188**.

G-09 did **not** hide application errors. The five diagnostics were never in `client/` or live `server/` routers.
