# DATABASE DESIGN

**Mutation: 0**

Reuse `crmp_drawer_movements` (migration `0077_crmp`).

| Column | Role |
|--------|------|
| `movementId` | Immutable identity + idempotency unique |
| `financialShiftId` | Shift aggregate |
| `restaurantId` | Tenant |
| `movementType` | Canonical CRMP type |
| `amount` | `decimal(10,2)` |
| `currencyCode` | From shift |
| `reason` | Operator reason |
| `actorUserId` | Authenticated actor |
| `recordedAt` | Timestamp |

Unique: `crmp_drawer_movements_movement_id_unique`.

No `idempotencyKey` column. No `pos_*` table. No `0094`. Production journal remains `0093_pos_sale_idempotency`.
