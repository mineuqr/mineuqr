# TENANT ISOLATION

All POS deletes are `WHERE restaurantId = :deletedId`.

Restaurant A cannot delete Restaurant B terminals, grants, or sale-idempotency rows.

Commercial occupancy for B is unchanged (COUNT is still B’s terminals).

Existing cascade already scoped orders/menu the same way; that behavior is preserved.
