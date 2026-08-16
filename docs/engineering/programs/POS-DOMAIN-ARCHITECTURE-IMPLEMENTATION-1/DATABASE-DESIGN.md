# DATABASE DESIGN

## Change

New table `pos_terminals` via `drizzle/0091_pos_terminals.sql`.

## Ownership

POS-owned. Restaurant-scoped. No FK to `operational_devices` (association is optional and not identity). No Order / Check / Settlement / Register / Shift tables.

## Columns

| Column | Convention |
|--------|------------|
| `id` | varchar(36) PK |
| `restaurantId` | tenant key |
| `code` | unique per restaurant |
| `lifecycle` | `registered\|active\|deactivated\|replaced` |
| `replacedByTerminalId` | historical replacement pointer |
| `optionalDeviceId` | nullable association |
| `version` | optimistic row version |
| `createdAt` / `updatedAt` | timestamps |

## Indexes

- unique `(restaurantId, code)`
- `(restaurantId, lifecycle)`

## Existing rows

None. Additive `CREATE TABLE` only.

## Rollback

`DROP TABLE pos_terminals` after a controlled apply. Not authorized here.

## Production risk

Applying `0091` without a `posTerminals` Live Plan seed leaves quantity fail-closed at 0. Seed and apply belong to `POS-DOMAIN-PRODUCTION-APPLY-1`.

## Local status

SQL + journal + governance tail updated. **Not applied** to any environment by this program.
