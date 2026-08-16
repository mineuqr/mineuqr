# POS CHANNEL ATTRIBUTION

Direct POS Sale stamps:

`orderingChannel = cashier_pos`

Server-authoritative. Client `channel` / `orderingChannel` are not accepted.

`cashier_pos` is the existing registry entry (`registered`, `reportingVisible: false`). No second channel system.

Existing channels are unchanged:

| Origin | Channel |
|--------|---------|
| Table / QR | `table_session` / `qr` |
| Waiter | `waiter_tablet` |
| Kiosk | `kiosk` |
| Direct POS Sale | `cashier_pos` |

A later cashier interaction with an existing Table/QR Order does not rewrite that Order to `cashier_pos`. Settlement does not write `orderingChannel`.
