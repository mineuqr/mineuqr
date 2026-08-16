# MIGRATION 0092 RESULT

| Field | Value |
|-------|--------|
| File | `drizzle/0092_pos_permission_grants.sql` |
| Hash | `e7bf4f7392e66eeae9c8b3aa953e3db12dc483f5e667f3702ec94cb3e3efcd5e` |
| Journal id | 6174103 |
| Table | `pos_permission_grants` |
| Exists | **yes** |
| Rows | **0** |

## Schema

Columns: `id` PK varchar(36), `restaurantId`, `userId`, `permission`, `version` default 1, `createdAt`, `updatedAt`.

Indexes:

- PRIMARY (`id`)
- unique `pos_permission_grants_unique` (`restaurantId`,`userId`,`permission`)
- `pos_permission_grants_restaurant_user` (`restaurantId`,`userId`)

No grant rows created. No existing business rows modified.
