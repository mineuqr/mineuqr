# API DESIGN

| Path | Gate | Purpose |
|------|------|---------|
| `pos.settlement.initiate` | `verifiedProcedure` + PosSettlementInitiateService | Initiate settlement for the existing Check of a POS Order |

Input:

- `restaurantId`
- `terminalId` (UUID)
- `orderId`
- `idempotencyKey`

Not accepted as authority: `cashierId`, `userId`, `channel`, `totalAmount`, tax, discount, tender, payment method, currency, settlement state, `registerId`, `shiftId`.

Result: `checkId`, `orderId`, `restaurantId`, `outcome: "paid"`, Check-owned `grandTotal`, `settlementRecordId` (from Check/Settlement Record, nullable on CAS replay), `sessionId` (from Check), `orderingChannel: cashier_pos`, server terminal/cashier, `replayed`.

Not reused: public `order.settlePaid`.
