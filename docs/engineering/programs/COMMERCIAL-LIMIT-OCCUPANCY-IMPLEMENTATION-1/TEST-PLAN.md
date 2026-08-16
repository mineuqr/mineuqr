# TEST PLAN

## Occupancy helper (unlocked Vitest)

File: `commercialLimitOccupancy.test.ts`

- below cap → create  
- at cap → deny, no create  
- create throw → no occupancy  
- `resolveExisting` skips COUNT/decide/create  

## Architecture guards

File: `commercialLimitOccupancy.guards.test.ts` + updated POS 0094 guards.

## Real database (required for concurrency certification)

File: `commercialLimitOccupancy.concurrency.test.ts` via `occupancyTestMysql.ts`

1. below limit  
2. at limit  
3. concurrent create (one slot left)  
4. concurrent create at cap (both fail)  
5. cross-tenant concurrent create  
6. domain insert failure / rollback  
7. lock row acquisition  
8. retry after failed transaction  
9. concurrent duplicate `resolveExisting`  
10. `not_entitled` fail closed  

If Docker cannot start: **do not** claim REAL DATABASE CONCURRENCY PASS.

## Resource domains

| Domain | Tests |
|--------|--------|
| restaurants / categories / items | `subscriptionPlanLimits.test.ts`, `commercialLivePlans.limits.repair.test.ts`, `routers.test.ts` |
| POS terminal | `posTerminal.domain.test.ts`, `posEntitlement.test.ts`, `posCommercial.integration.test.ts` |
| staff / branches / devices | not occupancy-adopted; no forced helper tests |

## POS / core regression (predecessor suite)

POS folder, subscription-runtime, plan limits, commercial gating/limits, shared/pos, IdentityPlaceOrder, SettleOrderPaid, StaffCounterPickup, CRMP, Check settlement, reporting parity.

## Build / check

`pnpm build` · `pnpm check` vs baseline **188** `error TS*`.
