# TENANT ISOLATION AUDIT

## Lock key

`(scopeKind, scopeId, limitKey)` unique. No global row. No Live Plan lock. No `commercial_limit_values` lock. No `GET_LOCK`. No process-memory mutex.

| Scope | Isolation |
|-------|-----------|
| `owner` + owner user id + `restaurants` | per owner |
| `restaurant` + restaurant id + `categories`/`items`/`posTerminals` | per restaurant per limit key |

Restaurant A’s POS lock does not block restaurant B. Categories vs items on the same restaurant do not share a lock row.

## Capacity isolation

`checkLimit(ownerId)` uses the **resource owner’s** Live Plan (`restaurant.userId` for menu/POS; `data.userId` for restaurants). A staff actor cannot apply a different owner’s cap.

Admin category/item insert still targets `input.restaurantId` after `assertRestaurantAccess` — tenant of the resource is correct; **quantity** is not owner-capped.

## Cross-tenant proof

MySQL occupancy suite: A and B concurrent creates both succeed. **PROVEN** on isolated MySQL. **NOT PROVEN** on TiDB.

## Rejected designs (absent)

Global occupancy lock · locking `commercial_limit_values` · Live Plan row lock · POS-named lock table · application-memory locks · distributed locks.
