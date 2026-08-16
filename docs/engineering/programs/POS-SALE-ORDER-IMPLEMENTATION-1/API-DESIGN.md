# API DESIGN

Existing `pos` router, still thin.

| Path | Gate | Purpose |
|------|------|---------|
| `pos.sale.create` | `verifiedProcedure` + PosSaleService | Create canonical Order from a POS Sale command |

Input (server derives the rest):

- `restaurantId`
- `terminalId` (UUID)
- `items[]` (`menuItemId`, `quantity` ≥ 1, optional notes/modifiers)
- optional `notes`
- optional `sessionId` (validated, not attached)
- `idempotencyKey`

Not accepted as authority:

- `userId` / `cashierId`
- `channel` / `orderingChannel`
- `subtotal` / `tax` / `grandTotal` / `discountTotal`
- settle / markPaid / payment fields

Result: canonical Order identifiers + `orderingChannel: cashier_pos` + server terminal/cashier + `replayed`.

No payment, settlement, refund, Register, or Shift APIs.
