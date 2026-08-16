# ARCHITECTURE GUARDS

## Tests

`server/subscription-runtime/__tests__/commercialLimitOccupancy.guards.test.ts`

Asserts:

- lock table exists and is not a counter (`occupied` absent)  
- helper uses `FOR UPDATE` + `ON DUPLICATE KEY UPDATE`  
- helper does not `SELECT` from `commercial_limit_values`  
- helper does not use `GET_LOCK`  
- cap via `decide` / occupancy via caller COUNT / create via caller  
- restaurants, categories, items, POS consume the helper  
- POS has no `PosOccupancyService`  
- `staffAccounts` / `branches` / `devices` are not invented as occupancy keys on the helper  

## POS journal guards (updated)

Former POS tests asserted `journal.not.toContain("0094_")`. They now require:

- `0094_commercial_limit_occupancy_locks` present  
- `0094_pos_` absent  
- occupancy SQL does not create `pos_` tables  

Files: `posPersistence`, `posCashierDrawerMovement`, `crmp.drawerMovement`, `posCashierCrmp`, `posRegisterShift`, `posSettlementInitiate` architecture guards.

## Invariants encoded

- Commercial owns occupancy coordination  
- Domain owns entity insert  
- No second occupancy counter  
- No global lock  
- No POS-specific commercial lock
