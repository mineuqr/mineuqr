# MIGRATION 0091 RESULT

| Field | Value |
|-------|--------|
| File | `drizzle/0091_pos_terminals.sql` |
| Hash | `05872dc0400bf5857760ef35dea1d7b5e7a9200ad5b375861f8b2138b9f01c21` |
| Journal id | 6174102 |
| Table | `pos_terminals` |
| Exists | **yes** |
| Rows | **0** |

## Schema

Columns: `id` PK varchar(36), `restaurantId`, `code`, `lifecycle` enum(registered/active/deactivated/replaced), `replacedByTerminalId`, `optionalDeviceId`, `version` default 1, `createdAt`, `updatedAt`.

Indexes:

- PRIMARY (`id`)
- unique `pos_terminals_restaurant_code_unique` (`restaurantId`,`code`)
- `pos_terminals_restaurant_lifecycle` (`restaurantId`,`lifecycle`)

No existing business rows modified. No unrelated table changed.
