# TIDB EVIDENCE

**Connection:** `G07_DATABASE_URL` only (never `DATABASE_URL`).  
**Verdict:** `ACCEPT_NON_PRODUCTION`  
**sameSqlUserAsProductionMain:** false  
**User prefix:** `3BUSFE99csVhDLu`  
**Host:** TiDB Cloud gateway (same region hostname as Production; isolation is SQL user prefix)  
**Database:** mineuqr  
**Expected branch:** mineuqr-stagIn  
**VERSION():** `8.0.11-TiDB-v8.5.3-serverless`  
**txn mode:** pessimistic  
**session isolation:** REPEATABLE-READ  
**occupancy txn:** READ COMMITTED (helper)  
**0094 PK:** `scopeKind,scopeId,limitKey` (existed; not re-applied)

## Actors

- Pool A (`tidb.db`) and pool B (`tidb.dbB`), `connectionLimit: 8` each
- Two OS processes via `occupancyG08Worker.ts` (`tsx`)

## Authoritative COUNT

After every race: `SELECT COUNT(*)` on `restaurants` / `categories` / `menu_items` / provisioned fixture terminals. API counts were not used.

## Last-run evidence (G08_EVIDENCE, 2026-08-16)

```
createRestaurants: fulfilled 1 / exceeded 1 / occupancy 2 / cap 2
createCatalog: categories occupancy 2, items occupancy 2
atCap: fulfilled 0 / exceeded 3 / occupancy 1
createThenDelete occupancy 1; deleteThenCreate occupancy 1; bothConcurrent occupancy 1
atCapCreateDelete occupancy 2 remaining [570034, 570035]
hardDeleteCategory occupancy 1 orphanItems 0
replaceVsReplace occupancy 1 (1 fulfilled / 1 lifecycle_conflict)
replaceVsHardDelete occupancy 1
idempotencyReplay occupancy 1 (2 fulfilled replay)
idempotencyConflict failedClosed occupancy 0
onboarding distinctOwners fulfilled 2; sameEmail 1/1; occupancyA 1 occupancyB 1
planChange occupancy 1 newCap 0 occupancyMayExceedNewCap true create rejected
cascadeToctou architectureGap true orphanCategories 1 restaurantRemaining 0
crossTenant occupancy a=1 b=1 c=1 lockScopes 980801801,980801802,980801803
failureInjection afterInsertOccupancy 0 afterRelatedInsertOccupancy 0
twoProcesses A COMMERCIAL_LIMIT_EXCEEDED (1188ms) B ok id 570046 (945ms) occupancy 2
deactivateVsProvision occupancy 1 provision fulfilled
```

Production mutation: **0**.
