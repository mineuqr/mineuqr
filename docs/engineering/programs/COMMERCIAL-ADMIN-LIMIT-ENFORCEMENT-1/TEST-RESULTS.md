# TEST RESULTS

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  
**Date:** 2026-08-17  

## Targeted

| Suite | Result |
|-------|--------|
| `commercialAdminLimitEnforcement.tidb.test.ts` | **10 passed** |
| `commercialAdminLimitEnforcement.guards.test.ts` | **4 passed** |
| G-08 domain-race guards (updated) | **10 passed** |
| `routers.test.ts` category create + admin create | **2 passed** |

## Regression

| Suite | Result |
|-------|--------|
| G-07 P8 POS provision | **1 passed** (`finalOccupancy: 2`) |
| G-08 P12 cascade | **1 passed** (`orphanCategories: 0`) |
| TOCTOU delete ∥ category | **1 passed** (categories 0) |
| occupancy unit | **5 passed** |
| occupancy architecture guards | **6 passed** |
| G-06 occupancy tRPC | **4 + 3 guards passed** |
| POS architecture guards | **7 passed** |
| restaurantRowLock guards | **6 passed** |

## Build / check

- `pnpm build` **PASS**
- `pnpm check` **188** `error TS*`

## Git / deploy

NONE
