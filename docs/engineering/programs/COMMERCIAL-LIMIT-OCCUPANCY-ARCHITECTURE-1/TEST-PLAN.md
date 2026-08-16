# TEST PLAN

## This program

No new occupancy tests (no implementation). Regression only.

Concurrency **cannot** be certified from mocked `checkLimit` or in-memory POS stores. Those tests prove the check-then-act **policy**, not engine serialization.

## Future implementation suite (must use a real mysql2/TiDB transaction)

1. Below cap → create succeeds  
2. At cap → create denied  
3. Concurrent creates below cap → all succeed, occupancy = N  
4. Concurrent creates exactly filling cap → occupancy == cap, none over  
5. Concurrent creates that would exceed → extras denied  
6. Restaurant A at cap + restaurant B empty, concurrent → B succeeds  
7. Delete/release then create → slot reusable  
8. Deadlock/retry of the occupancy tx → at most one extra slot, never over cap  
9. Duplicate POS code → winner, no extra slot  
10. Plan cap lowered → new create denied; rows remain  
11. Expired subscription inside locked tx → deny  
12. Insert error after lock → rollback, COUNT unchanged  

Optional: two connections, same owner, `restaurants` cap 1.

Do not treat Vitest unit mocks as this suite.
