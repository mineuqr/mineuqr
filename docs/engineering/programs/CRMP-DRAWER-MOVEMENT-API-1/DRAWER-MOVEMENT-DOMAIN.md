# DRAWER MOVEMENT DOMAIN

Use existing CRMP types. Do not invent CASH_IN / CASH_OUT aliases.

| Type | Meaning | Amount | Reason |
|------|---------|--------|--------|
| `opening_float` | Created on shift open | ≥ 0 | Not a public movement |
| `paid_in` | Non-settlement cash added | > 0 | Required |
| `paid_out` | Non-settlement cash removed | > 0, ≤ expected cash | Required |
| `safe_drop` | Cash moved to safe | > 0, ≤ expected cash | Required |
| `manual_adjustment` | Signed correction | non-zero | Required |

Each persisted movement already has:

- `movementId` (immutable identity)
- `restaurantId`
- `financialShiftId` (implies Register)
- `movementType`
- `amount` (opaque decimal string, 2 dp)
- `currencyCode` (from Shift)
- `reason`
- `actorUserId`
- `recordedAt`

Idempotency key is **not** a new column. Public API derives `movementId` so the existing unique index is the retry constraint.

Correction = another `manual_adjustment` or compensating `paid_in` / `paid_out`. No UPDATE/DELETE of historical rows via API.

Drawer movement is **operational cash**. It is not Settlement, Check money, Order totals, or Revenue.
