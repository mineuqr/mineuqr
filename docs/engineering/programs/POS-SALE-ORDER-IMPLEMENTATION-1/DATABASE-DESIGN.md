# DATABASE DESIGN

## Change

New table `pos_sale_idempotency` via `drizzle/0093_pos_sale_idempotency.sql`.

Journal: idx 93. Governance tail advanced to `0093` / 94 entries.

## Purpose

Map a POS Sale idempotency key to the canonical Order result. Not Order persistence.

## Ownership

POS-owned idempotency. Restaurant + terminal + user scoped. No FK rewrite of `orders`. No Check / Settlement / Register tables.

## Columns

| Column | Convention |
|--------|------------|
| `id` | varchar(36) PK |
| `restaurantId` | tenant key |
| `terminalId` | canonical POS Terminal UUID |
| `userId` | authenticated cashier |
| `idempotencyKey` | client key (8–128) |
| `fingerprint` | sha256 of sale body |
| `orderId` / `orderNumber` / `trackingToken` / `displayReference` / `totalAmount` / `itemCount` | replay snapshot from Order result |
| `createdAt` | Order createdAt |

## Indexes

- unique `(restaurantId, terminalId, userId, idempotencyKey)`
- `(orderId)`

## Existing data

None. Additive `CREATE TABLE` only. No `ALTER TABLE orders`.

## Rollback

`DROP TABLE pos_sale_idempotency` after a controlled apply. Not authorized here.

## Production

Not applied. Runtime uses the in-memory store. `0091` / `0092` also remain unapplied.
