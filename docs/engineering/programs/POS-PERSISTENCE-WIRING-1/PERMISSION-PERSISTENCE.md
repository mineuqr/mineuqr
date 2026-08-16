# PERMISSION PERSISTENCE

Table: `pos_permission_grants` (0092). Ownership: POS Authorization / POS Access. Not restaurant RBAC.

## Operations

| Method | Behavior |
|--------|----------|
| `listByRestaurantUser` | Restaurant + user; unknown permission strings are dropped via `isPosPermission()` |
| `hasGrant` / `hasAnyGrant` | Same scope |
| `upsert` | Insert; duplicate unique `(restaurantId, userId, permission)` returns the existing grant |
| `remove` | Delete in restaurant/user/permission scope |

## Invariants

- Namespace is the POS catalog only (`POS_ACCESS`, `SALE_CREATE`, â€¦)
- Owner / admin / PLATFORM_OWNER still do not imply cashier grants
- Duplicate grant is idempotent, not an overwrite of another permission
- Revocation is `remove` â€” supported by the existing contract

## Isolation

A Restaurant A grant cannot satisfy Restaurant B lookups. User B cannot inherit User A grants. No restaurant-wide role table was added.
