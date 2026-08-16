# INVARIANTS

- I-POS-CASHIER-01 Cashier identity is the authenticated user with POS grants.
- I-POS-CASHIER-02 No `pos_cashiers` / `pos_staff` table.
- I-POS-CASHIER-03 Register and Financial Shift remain CRMP-owned.
- I-POS-CASHIER-04 POS adapters call CRMP façades; they do not write CRMP tables.
- I-POS-CASHIER-05 `SHIFT_OPEN` / `SHIFT_CLOSE` are enforced; `REGISTER_ADJUST` is not (cash GAP).
- I-POS-CASHIER-06 Owner/admin/PLATFORM_OWNER are not cashiers by role.
- I-POS-CASHIER-07 Client cashier/operator ids are not authoritative.
- I-POS-CASHIER-08 Cross-restaurant Register/Shift is rejected.
- I-POS-CASHIER-09 Check remains financial authority.
- I-POS-CASHIER-10 Production schema remains `0093_pos_sale_idempotency`.
