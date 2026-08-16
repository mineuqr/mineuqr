# TENANT ISOLATION

## Lock granularity

Serialization is **per** `(scopeKind, scopeId, limitKey)`, not global, not per Live Plan.

| Operation | Blocks |
|-----------|--------|
| Owner 1 creating a restaurant | other restaurant creates for owner 1 |
| Restaurant A creating a category | other category creates for restaurant A |
| Restaurant A creating a POS terminal | other POS slot-consuming provision for restaurant A |
| Restaurant A category create | does **not** block restaurant A item create |
| Anything on A | does **not** block B |

## Cross-tenant proof

Isolated MySQL: A and B each occupancy 1 / cap 2; concurrent creates **both succeed**. Final occupancy 2 per tenant.

## Cap isolation

`checkLimit` still reads **owner** Live Plan limits. Category/item occupancy uses `restaurant.userId`, so a staff actor cannot apply a different owner’s cap.

## Authorization still separate

Tenant RBAC (`assertRestaurantAccess`) runs before occupancy. A user who cannot see restaurant A cannot take restaurant A’s lock through these APIs.
