# INVARIANTS

- I-POS-CHECK-01 Intake consumes a canonical POS Order (`cashier_pos`).
- I-POS-CHECK-02 Check is created/enrolled only through `ensureCheckForOrder`.
- I-POS-CHECK-03 No POS Check table or POS monetary aggregate.
- I-POS-CHECK-04 Intake requires PosAccessContext + `POS_ACCESS` + `CHECK_INTAKE`.
- I-POS-CHECK-05 Restaurant, terminal, and Order are server-authoritative.
- I-POS-CHECK-06 Order channel is not rewritten.
- I-POS-CHECK-07 Check remains `open` and sessionless.
- I-POS-CHECK-08 Duplicate active Checks are not created for the same Order.
- I-POS-CHECK-09 No settlement, payment, Register, Shift, or Reporting write.
- I-POS-CHECK-10 Client totals are not authoritative.
