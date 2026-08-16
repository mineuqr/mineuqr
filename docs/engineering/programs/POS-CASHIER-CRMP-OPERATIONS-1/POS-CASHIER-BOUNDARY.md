# POS CASHIER BOUNDARY

POS owns:

- Terminal
- POS permissions / PosAccessContext
- Thin command adapters

POS does not own:

- Cashier accounts
- Register / Shift / Drawer
- Check money
- Reporting

Entering POS still requires `POS_ACCESS`. Opening a shift additionally requires `SHIFT_OPEN`. Closing requires `SHIFT_CLOSE`.
