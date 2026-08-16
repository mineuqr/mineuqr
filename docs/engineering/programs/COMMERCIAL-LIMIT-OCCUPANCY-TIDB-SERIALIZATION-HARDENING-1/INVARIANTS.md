# INVARIANTS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  

1. `occupancy <= commercial cap` under concurrent same-tenant creates.
2. Cap authority is `checkLimit()` / `decide`. Occupancy is caller COUNT (current read in the occupancy txn).
3. Mutex identity is `scopeKind + scopeId + limitKey`. Not global. Not POS-specific.
4. Mutex row is **committed** before occupancy `BEGIN`.
5. Occupancy txn is READ COMMITTED so COUNT is not a Repeatable-Read snapshot from `BEGIN`.
6. Domain create and occupancy decision share one occupancy transaction.
7. Rollback of that transaction does not keep the domain row. Mutex row may remain (token, not a counter).
8. Cross-tenant and distinct `limitKey` values do not share a mutex.
9. `occupancyDelta: 0` serializes without consuming a slot.
10. G-06: limit exceeded vs occupancy unavailable stay distinct.
