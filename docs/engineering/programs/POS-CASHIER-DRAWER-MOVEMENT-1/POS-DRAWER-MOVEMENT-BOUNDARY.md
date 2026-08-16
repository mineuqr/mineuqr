# POS DRAWER MOVEMENT BOUNDARY

## POS

- Authenticated user
- `PosAccessContext`
- `POS_ACCESS` + `REGISTER_ADJUST`
- POS Terminal (existing cashier command contract)
- Restaurant scope
- Thin forward to CRMP

## CRMP

- Drawer Movement aggregate child of Financial Shift
- Register load in restaurant scope
- Active Shift resolution
- Movement identity
- Idempotency
- OCC concurrency
- Expected cash
- Persistence (`crmp_drawer_movements`)

## Not POS

Drawer Movement, cash ledger, Register balance, Shift expected cash, cash reconciliation, financial authority, Settlement, Revenue, Check, Order, Reporting writes.
