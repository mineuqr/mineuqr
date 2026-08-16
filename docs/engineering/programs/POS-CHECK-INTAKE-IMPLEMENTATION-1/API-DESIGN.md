# API DESIGN

| Path | Gate | Purpose |
|------|------|---------|
| `pos.check.intake` | `verifiedProcedure` + PosCheckIntakeService | Enroll a POS Order into the existing Check |

Input:

- `restaurantId`
- `terminalId` (UUID)
- `orderId`
- `idempotencyKey`

Not accepted as authority: `cashierId`, `userId`, `channel`, financial totals, settle/pay fields.

Result: `checkId`, `orderId`, `restaurantId`, `outcome: "open"`, `sessionId: null`, `orderingChannel: cashier_pos`, server terminal/cashier, `replayed`.
