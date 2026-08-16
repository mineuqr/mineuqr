# MIGRATION 0093 RESULT

| Field | Value |
|-------|--------|
| File | `drizzle/0093_pos_sale_idempotency.sql` |
| Hash | `778caa62a7bb57ad8dd461abab7f34b82633e0608cb289b22c35d8998859236b` |
| Journal id | 6174104 |
| Table | `pos_sale_idempotency` |
| Exists | **yes** |
| Rows | **0** |

## Schema

Columns: `id` PK varchar(36), `restaurantId`, `terminalId`, `userId`, `idempotencyKey`, `fingerprint`, `orderId`, `orderNumber`, `trackingToken`, `displayReference`, `totalAmount`, `itemCount`, `createdAt`.

Indexes:

- PRIMARY (`id`)
- unique `pos_sale_idempotency_unique` (`restaurantId`,`terminalId`,`userId`,`idempotencyKey`)
- `pos_sale_idempotency_order` (`orderId`)

Not a POS Order table. No idempotency rows created. No Order rows inserted.
