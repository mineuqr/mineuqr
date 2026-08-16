# POS INTEGRATION DESIGN

```
POS cashier + POS Terminal
  → PosAccessContext (userId, restaurantId, terminalId, permissions)
  → PosRegisterShiftContextService
       → terminal.optionalDeviceId (optional)
       → resolveSettlementContextForSettle({ operatorUserId, deviceId })
  → canonical registerId + financialShiftId
  → pos.settlement.initiate
       → settleCheckPaidByIdDetailed({ settlementContextHints })
  → Check money TX
  → existing CRMP attribution (post-commit, fail-open)
```

**Derived, never trusted from the client:** restaurantId, cashier, terminal, registerId, shiftId.

Discovery order is existing CRMP: explicit register (not used by POS) → device → operator’s active shift.

Sale and Check Intake remain Register-optional (they do not settle). Settlement initiation now requires resolved CRMP context.

POS does not call `RegisterDomainService` / `FinancialShiftDomainService` lifecycle methods.
