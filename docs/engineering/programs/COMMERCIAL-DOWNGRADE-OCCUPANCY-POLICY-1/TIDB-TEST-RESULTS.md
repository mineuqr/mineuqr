# TIDB TEST RESULTS

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

**File:** `server/subscription-runtime/__tests__/commercialDowngradeOccupancy.tidb.test.ts`  
**Result:** 15 / 15 PASS  
**Identity:** ACCEPT_NON_PRODUCTION; sameSqlUserAsProductionMain=false; userPrefix `3BUSFE99csVhDLu`  
**Engine:** 8.0.11-TiDB-v8.5.3-serverless; pessimistic; session isolation REPEATABLE-READ (occupancy txn READ COMMITTED)

## Evidence (G11_EVIDENCE)

| Case | Result |
|------|--------|
| createAfterDowngrade | occupancy 2, newCap 1, create rejected |
| deleteAfterDowngrade | create at occupancy 1 / cap 1 rejected; occupancy 0 allowed |
| inactiveAfterDowngrade | occupancy 2 after hide |
| catalogReactivate | occupancy 2 |
| multiResource | restaurants 1, items 2, item create rejected |
| upgradeAfterDowngrade | occupancy 3, cap 3 |
| ownerAdmin | occupancy 2, rejected 2 |
| posDowngrade | after reject 2; after deactivate 1; reactivate at cap rejected |
| posReplaceOverCap | occupancy 2, newCap 1, replace allowed |
| crossTenant | A=2 B=2 |
| sequentialPlanChange | downgrade-then-create rejected; create-then-downgrade occupancy 2 > cap 1 |
| concurrentPlanChange | occupancy 1, newCap 1, create rejected, occupancyMayExceedNewCap false |
| failureInjection | occupancy 0 |
| errorSemantics | FORBIDDEN / INTERNAL_SERVER_ERROR |

## Census (read-only, stagIn)

restaurants 5 (0 inactive), categories 5 (0 inactive), items 20 (0 unavailable), `pos_terminals` absent, `subscriptions` absent, `commercial_subscription_bindings` absent.

Over-cap tenants: **not computable** on this branch (no subscription/binding tables). No repair performed.

## Regressions

| Suite | Result |
|-------|--------|
| G-07 P8 | PASS (`fulfilled:1 rejected:1 finalOccupancy:2`) |
| G-08 P12 | PASS (`orphanCategories:0`) |
| TOCTOU category | PASS (`restaurant:0 categories:0`) |
| G-09 owner∥admin | PASS (`occupancy:2 fulfilled:1 exceeded:1`) |
| G-10 inactive category | PASS (`occupancy:1 cap:1`) |
