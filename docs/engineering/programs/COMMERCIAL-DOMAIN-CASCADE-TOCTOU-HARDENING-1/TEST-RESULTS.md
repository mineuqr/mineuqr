# TEST RESULTS

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**Date:** 2026-08-17  

## Targeted

| Suite | Result |
|-------|--------|
| `commercialDomainCascadeToctou.tidb.test.ts` | **12 passed** |
| G-08 P12 `commercialLimitOccupancy.tidb.domainRaces.test.ts -t P12` | **1 passed** (17 skipped) |
| `restaurantRowLock.test.ts` | **3 passed** |
| `restaurantRowLock.guards.test.ts` | **6 passed** |
| `cascadeDeletes.posOrphans.guards.test.ts` | **2 passed** |
| `cascadeDeletes.test.ts` | **10 passed** |

## Regression

| Suite | Result |
|-------|--------|
| `commercialLimitOccupancy.guards.test.ts` | **6 passed** |
| `commercialLimitOccupancy.domainRaces.guards.test.ts` | **10 passed** |
| `commercialLimitOccupancy.test.ts` | **5 passed** |

## Guards prove

- Parent lock before cascade child deletes; RC isolation; cascade does not call occupancy helper or `GET_LOCK`.
- Occupancy helper has no restaurant lifecycle symbols.
- Category/item/POS/order callers take the parent lock.
- No 0095, no FK on `0091_pos_terminals`, 0094 unchanged.

## Build / check

- `pnpm build` **PASS**
- `pnpm check` **193** `error TS*` — same as G-08 post-helper baseline; **0** new errors in `restaurantRowLock` / TOCTOU files

## Git / deploy

NONE (forbidden this program).
