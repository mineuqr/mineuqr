# TEST PLAN

Covered by `commercialOccupancyTrpc.test.ts`, guards, POS domain/entitlement, G-04 onboarding tests, plan-limits tests.

1–4 Mapper: FORBIDDEN vs INTERNAL_SERVER_ERROR; not auth copy; not `limit_exceeded` for unavailable  
5–8 Fail-closed: create not called on limit exceeded; helper still throws Commercial classes  
9 G-04 guards still pass  
10 Restaurant/item/POS consumers on shared mapper (guards)  
11 Tenant isolation unchanged (auth still `غير مصرح بالوصول` for restaurant_not_found)  
12 No SQL/lock leakage in client message  
13–14 Validation/conflict POS mappings untouched  
