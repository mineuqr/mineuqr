# TRANSACTION BOUNDARIES

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

## Quantity-governed child create (category, item, POS)

One occupancy transaction (`withCommercialLimitOccupancy`, already RC):

1. Committed `INSERT IGNORE` mutex (outside this txn; G-07).
2. `BEGIN READ COMMITTED`
3. `SELECT` mutex `FOR UPDATE`
4. Optional `resolveExisting` (POS idempotent peek)
5. `countOccupancy`: `SELECT restaurants … FOR UPDATE` → COUNT domain rows
6. `checkLimit` / decide
7. Domain INSERT
8. `COMMIT` or rollback on `RestaurantGoneError` / `CommercialLimitExceededError`

`getRestaurantById` **before** the helper remains a non-locking lookup for owner id / RBAC. It is **not** the commit-time parent check.

Do **not** lock the restaurant in an outer transaction and then call the occupancy helper (second txn / lock-wait on self).

## Admin category / item (G-09 skip occupancy)

Own RC transaction in `createCategory` / `createMenuItem`:

1. `BEGIN READ COMMITTED`
2. `requireRestaurantRowForUpdate`
3. INSERT
4. COMMIT

## Order create

Existing order persist transaction. `requireRestaurantRowForUpdate` immediately before `tx.insert(orders)`.

## Restaurant delete

`deleteRestaurantCascade`:

1. `BEGIN READ COMMITTED`
2. `lockRestaurantRowForUpdate`
3. Existing cascade order (orders/items/tables/holidays/offers/menu/categories/POS sale/grants/terminals/subscriptions)
4. `DELETE restaurants`
5. COMMIT

`deleteUserCascade` uses the same isolation and calls `deleteRestaurantCascadeTx` per owned restaurant inside one user transaction.

## Why delete is READ COMMITTED

Session default is REPEATABLE-READ. After waiting on the parent `FOR UPDATE`, an RR snapshot can miss a child committed by the create that just released the row (G-07 E2 pattern). Cascade DELETE must be a current read.

## Outbox / events

Category/item/POS provision inserts audited here do not write an outbox inside the occupancy txn. Cascade audit `emitCascadeAuditEvent` runs **outside** the SQL txn (start/completed logs). SQL rollback is independent of those logs.

## Test harness (stagIn)

`deleteRestaurantLockedCascade` mirrors lock → delete menu_items/categories/`occupancy_g07_terminals` → delete restaurant. It does not call full `deleteRestaurantCascadeTx` because stagIn has no `pos_terminals`.
