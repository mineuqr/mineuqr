# FAILURE RECOVERY

Current check-then-act (no shared tx):

| Scenario | What happens | Inflate occupancy? |
|----------|----------------|--------------------|
| Limit read OK, create fails | No row | No |
| Create OK, client response fails | Row exists; retry may create a **second** row (restaurant/category/item have no idempotency key) | Duplicate resource, may also exceed cap on retry |
| Tx retries | N/A (no occupancy tx) | — |
| Duplicate request | POS same code: unique + return winner. Others: two rows | Possible |
| Concurrent requests | Both pass check | **Yes, over cap** |
| Delete during provision | Count stale high or low | Usually deny extra; not cross-tenant |
| Plan change during provision | Cap snapshot stale | Possible extra row vs new cap |
| Subscription expires during provision | Cap snapshot stale | Possible create after expiry |
| DB connection failure after insert | Row may exist | Duplicate on naive retry |
| Deadlock | Not on these paths today | — |
| Retry after deadlock | N/A | — |

Future locked transaction:

- Insert fail → rollback → lock released → no row.  
- Deadlock → retry whole tx (COUNT + checkLimit + insert).  
- Duplicate restaurant create still needs an **optional** client idempotency key (SAFE TO DEFER; not a global commercial idempotency table).  
- POS register already identity-idempotent on code.

Do not silently increment a counter without a domain row (argument against Option B as the first design).
