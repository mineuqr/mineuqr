# SAFE-DELETE-ASSESSMENT.md

## Can `subscription_plans` now be removed?

**NO**

Historical customer retention is **not** a blocker (no real contracts).

Live code still is.

| # | Condition | Met? |
|---|-----------|------|
| 1 | Zero live application reads | **FAIL** — MRR, DTO, webhook, invoice, fallbacks, CRS |
| 2 | Zero live application writes | **FAIL** — unused `createSubscriptionPlan` + seed script |
| 3 | Zero Checkout **price** reads | **PASS** (this program) |
| 4 | Zero MRR reads | **FAIL** |
| 5 | Zero binding reads of the table | **PASS** (bind uses bridge + Live Plan; integer is not a SQL join) |
| 6 | Zero entitlement reads | **PASS** |
| 7 | Zero admin writes | **PASS** (no plan editor write) |
| 8 | Zero API dependencies | **FAIL** — DTO, listPlans fallback, invoice, stats |
| 9 | Zero webhook dependencies | **FAIL** |
| 10 | Zero background jobs | **PASS** |
| 11 | Zero scripts requiring it | **FAIL** — reset preserve lists; seed |
| 12 | Zero FK/runtime ORM | **FAIL** — schema + accessors still live |
| 13 | Zero active-architecture tests | **FAIL** |
| 14 | Test/seed migrated | **FAIL** |
| 15 | Live Plan catalog complete | **PASS** |
| 16 | Charged Terms independent | **PASS** |
| 17 | Production validation of zero dep | **FAIL** |
| 18 | No real customer contracts affected | **PASS** |
| 19 | Rollback for drop defined | **FAIL** |
| 20 | AA deletion approval | **FAIL** |

## Exact blockers

1. MRR (`CanonicalMetricsService`)  
2. Webhooks `getSubscriptionPlanById`  
3. `getCurrentSubscription` / `getByRestaurant`  
4. `listPlans` fallback  
5. Trial fallback  
6. Admin invoice amount  
7. Admin notification names  
8. CRS unbound name  
9. Deprecated admin statistics / revenue-by-month  
10. ORM + seed/reset scripts  
11. Tests that still mock the accessors as architecture  
