# CASHBOX OPERATIONS FORENSICS

There is **no** separate cashbox / cash-drawer table.

Drawer is owned **inside** Financial Shift (`drawerId` on the shift row).

Child tables:

- `crmp_drawer_movements` — `opening_float | paid_in | paid_out | safe_drop | manual_adjustment`
- `crmp_drawer_counts`

Façade: `DrawerDomainService` → `FinancialShiftDomainService.recordMovement` / `recordCount`.

**Daily expenses:** no dedicated entity. Closest model is `paid_out` (reason required). **No public** `crmp.financialShift.recordMovement` API.

UI “Cash Drawer” / “Daily expenses” is presentation over CRMP drawer movements, not a second domain.

POS does not implement cash reconciliation, paid_out, or expense APIs in this program.
