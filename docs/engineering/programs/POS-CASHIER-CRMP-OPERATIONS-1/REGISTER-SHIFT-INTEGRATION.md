# REGISTER / SHIFT INTEGRATION

Reuses POS-REGISTER-SHIFT-IMPLEMENTATION-1.

Flow:

```
POS access + POS Terminal + authenticated cashier
  → validate register (restaurant-scoped CRMP get)
  → optional terminal.optionalDeviceId ↔ register.deviceId
  → CrmpRegisterOperationsService / CrmpFinancialShiftOperationsService
```

POS does not write `crmp_registers` / `crmp_financial_shifts` directly.

Close shift resolves the **active** shift on the register. Client `financialShiftId` is a non-authoritative hint and is rejected on mismatch.
