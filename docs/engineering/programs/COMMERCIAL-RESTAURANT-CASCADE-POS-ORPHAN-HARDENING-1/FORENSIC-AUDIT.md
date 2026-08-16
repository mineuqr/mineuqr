# FORENSIC AUDIT

Verified in code, not only the comprehensive audit.

## Restaurant delete is hard delete

`restaurants.isActive` exists but **production delete** is `deleteRestaurantCascade` → `DELETE` the restaurant row. Not soft-delete.

## Call chain

```
trpc.restaurant.delete
  → getRestaurantById
  → assertRestaurantAccess(..., "restaurant.delete")
  → deleteRestaurantCascade(id)
      → db.transaction
          → deleteRestaurantCascadeTx(tx, id)
```

Admin UI (`CustomerSuccessTenantsSection`) and owner Dashboard both call the **same** `restaurant.delete` procedure.

## Second production path

```
admin.deleteUser
  → deleteUserCascade
      → db.transaction
          → for each owned restaurant: deleteRestaurantCascadeTx(tx, restaurantId)
          → then user invoices / tokens / user row
```

Fixing `deleteRestaurantCascadeTx` covers **both** paths.

## Cascade before this program

Children deleted: order items, orders, tables, holidays, offers, menu items, categories, restaurant-scoped subscriptions (+ invoices/notifications), then restaurant.

**Omitted:** `pos_terminals`, `pos_permission_grants`, `pos_sale_idempotency`.

## Alternate paths searched

No maintenance script, job, or repository `delete(restaurants)` outside cascade. Image delete is not restaurant wipe. `isActive=false` is not the delete API.
