# TEST PLAN

## 1. Domain / unlocked (Vitest, no Docker)

| File | Proof |
|------|--------|
| `server/pos/__tests__/posTerminal.domain.test.ts` | Net-zero slot; sequential second replace `already_replaced`; restaurant isolation |
| `server/subscription-runtime/__tests__/commercialLimitOccupancy.test.ts` | Helper `occupancyDelta: 0` does not increase occupancy |

## 2. Architecture guards

| File | Proof |
|------|--------|
| `server/pos/__tests__/pos.architecture.guards.test.ts` | Provisioned replace uses helper + delta 0; no `performReplace(null)`; no POS occupancy service |
| `server/subscription-runtime/__tests__/commercialLimitOccupancy.guards.test.ts` | POS consumer still has no `performReplace(null)` |

## 3. Real database concurrency (isolated MySQL 8)

| File | Proof |
|------|--------|
| `server/subscription-runtime/__tests__/commercialLimitOccupancy.concurrency.test.ts` | Five replace cases under `withCommercialLimitOccupancy` + injected Docker `db` |

Required program cases mapped:

1. Same terminal concurrent → occupancy 1, one winner  
2. Same restaurant concurrent different terminals → occupancy stays 2  
3. At commercial cap → cap 1 concurrent same-terminal + domain register-after-replace denied  
4. Cross-tenant concurrent replace  
5. Rollback when create throws  
6. Repeated replace → `already_replaced` (lifecycle, not a new idempotency table)  
7. No net occupancy increase  
8. No occupancy corruption after concurrent ops  

## 4. Regression (do not edit unrelated tests)

- POS architecture + persistence + terminal + order/check/settlement  
- Commercial occupancy + plan limits + gating  
- Combined predecessor occupancy suite plus this program’s +8 tests  

## 5. Build / check

- `pnpm run build`  
- `pnpm run check` — compare `error TS*` count to 188 baseline  

## Out of scope

Production TiDB concurrency. Production mutation. New migration.
