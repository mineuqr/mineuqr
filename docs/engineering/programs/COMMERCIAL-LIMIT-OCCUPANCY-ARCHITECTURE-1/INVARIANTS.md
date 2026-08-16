# INVARIANTS

1. `checkLimit` is the cap oracle. It is not occupancy.  
2. Occupancy is COUNT of current domain rows (POS: provisioned lifecycle), not a second commercial table of usage — unless COUNT is proven impossible.  
3. Cap lives in Live Plan `commercial_limit_values`. Never lock those rows for occupancy.  
4. Serialization, when implemented, is tenant-scoped `(scope, limitKey)`, never global, never plan-wide.  
5. COUNT + INSERT without a lock target does not guarantee `occupancy <= cap`.  
6. A normal `db.transaction` does not serialize occupancy by itself.  
7. POS consumes the shared primitive; POS does not own occupancy.  
8. `devices` quantity is not occupancy today; devices are a **feature**.  
9. Orphan limit keys are not occupancy resources.  
10. Plan downgrade preserves rows and blocks new creates; freeze is not occupancy.  
11. Subscription expiry is lifecycle + `checkLimit`, not an occupancy freeze flag.  
12. Tenant A’s lock/count must not consume tenant B’s cap.  
13. No POS/Order/Check/Settlement/CRMP/Reporting commercial occupancy store.  
14. Unique identity constraints are not quantity caps.  
15. Implementation of the lock primitive requires either additive DDL or an approved parent-row lock; this program does neither.
