# TRANSACTION BOUNDARY

`deleteRestaurantCascade` / `deleteUserCascade` already open `db.transaction`.

POS deletes use that `tx`. They do not call `getDb()` again. They do not go through POS stores/services (no provisioning).

Order inside `deleteRestaurantCascadeTx`:

1. Existing order/menu/category children  
2. `pos_sale_idempotency` (restaurantId)  
3. `pos_permission_grants` (restaurantId)  
4. `pos_terminals` (restaurantId)  
5. restaurant-scoped subscriptions  
6. `restaurants` row  
