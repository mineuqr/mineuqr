# POS CHANNEL

## Identity

`cashier_pos` is registered in `shared/ordering-platform/orderingChannelRegistry.ts`.

| Field | Value |
|-------|--------|
| id | `cashier_pos` |
| lifecycle | `registered` |
| reportingVisible | `false` |
| orderingBehavior | `staff_assisted` |

No second channel registry.

## Preservation

Table/QR orders keep their original Order Channel when a cashier settles them.

Settlement does **not** write `orders.orderingChannel`.

Therefore:

```
Table/QR order + cashier settlement → Channel = table_session | qr
Future direct POS sale             → Channel = cashier_pos
```

Revenue remains Paid Check `grandTotal`. `cashier_pos` is a future read dimension only. Reporting write-side is unchanged.
