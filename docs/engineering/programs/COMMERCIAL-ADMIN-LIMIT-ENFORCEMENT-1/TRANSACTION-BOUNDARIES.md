# TRANSACTION BOUNDARIES

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## Category / item create (owner and admin)

Same transaction as G-07 + G-08:

```
Authenticate / authorize / requireRestaurantPlanFeature("menuManagement")
  → getRestaurantById (non-locking lookup for owner id)
  → INSERT IGNORE occupancy mutex (committed)
  → BEGIN READ COMMITTED
       SELECT mutex FOR UPDATE
       SELECT restaurants … FOR UPDATE   # parent exists
       COUNT(*) domain rows
       checkLimit()
       INSERT child
  → COMMIT
```

Admin no longer uses a second RC txn that only locked the parent and inserted.

## Restaurant create (admin-for-owner)

Unchanged: occupancy on owner scope `(owner, ownerUserId, restaurants)`.

## POS

Unchanged: no role skip.

## Onboarding

Unchanged: own register transaction; not wrapped in occupancy helper (G-04).

## Lock order

Occupancy mutex **then** restaurant row. Delete still takes restaurant only. No new lock.

## Bulk

No category/item bulk create. `table.createMultiple` is not a Commercial quantity key (C).
