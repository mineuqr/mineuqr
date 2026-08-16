# API DESIGN

| Path | Permission | CRMP façade |
|------|------------|-------------|
| `pos.cashier.register.open` | `SHIFT_OPEN` | `CrmpRegisterOperationsService.open` |
| `pos.cashier.register.close` | `SHIFT_CLOSE` | `CrmpRegisterOperationsService.close` |
| `pos.cashier.financialShift.open` | `SHIFT_OPEN` | `CrmpFinancialShiftOperationsService.open` |
| `pos.cashier.financialShift.close` | `SHIFT_CLOSE` | `CrmpFinancialShiftOperationsService.close` |
| `pos.registerShift.context` | `POS_ACCESS` | existing read (unchanged) |

Existing `crmp.*` owner/admin APIs remain.

Not accepted as identity: `cashierId`, `operatorUserId`, `actorUserId`.

`openingFloatAmount` / `actualCashAmount` / `currencyCode` are operational CRMP inputs (same as CRMP APIs), not POS-calculated totals.

No `pos.cashier.cashIn` / `cashOut`.
