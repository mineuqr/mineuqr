# SETTLEMENT INITIATION ARCHITECTURE

```
Authorized POS cashier
  → verifiedProcedure
  → PosAccessContext
  → POS_ACCESS + SETTLEMENT_INITIATE
  → validate restaurant / terminal / Order
  → resolve existing Check for that Order
  → validate Check is open and restaurant-scoped
  → settleCheckPaidByIdDetailed (existing Check Domain)
  → canonical paid Check result
```

POS Settlement Initiation is a **command**, not a financial aggregate.

There is no distinct Check `settling` / `initiated` state. Existing Check outcomes remain:

`open | paid | complimentary | voided`

This program does not invent a new lifecycle. “Initiate” means: POS-authorized command that invokes the existing complete-settle authority (`settleCheckPaidByIdDetailed` → `finalizeOpenCheckById({ outcome: "paid" })`).

POS does **not** pass client tenders, totals, payment method, cashierId, channel, registerId, or shiftId. Omitting `settlements` lets Check own `defaultPaidSettlementLine(grandTotal)`.

Do not reuse public `order.settlePaid` (tracking-token / `publicProcedure`). Wrong authorization contract.

Do not reuse `StaffCounterPickupSettlementService` (that façade requires Register + Shift).
