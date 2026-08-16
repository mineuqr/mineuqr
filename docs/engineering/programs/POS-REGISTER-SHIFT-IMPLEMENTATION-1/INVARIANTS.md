# INVARIANTS

- I-POS-RS-01 CRMP `CashRegister` is the only Register entity.
- I-POS-RS-02 CRMP `FinancialShift` is the only Shift entity.
- I-POS-RS-03 No POS Register, Shift, cashbox, or cash-drawer table.
- I-POS-RS-04 POS Terminal remains distinct from Operational Device and Register.
- I-POS-RS-05 POS settlement requires resolved CRMP Register + active Financial Shift.
- I-POS-RS-06 POS does not accept client `registerId` / `shiftId` as authority.
- I-POS-RS-07 Check remains financial authority; hints are operational context only.
- I-POS-RS-08 `POS_ACCESS` does not grant Register or Shift control.
- I-POS-RS-09 CRMP authorization is not weakened.
- I-POS-RS-10 No Reporting write from POS.
- I-POS-RS-11 Production schema remains `0093_pos_sale_idempotency`.
