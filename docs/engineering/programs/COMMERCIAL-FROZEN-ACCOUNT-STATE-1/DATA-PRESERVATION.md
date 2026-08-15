# DATA-PRESERVATION.md

Frozen is a lifecycle projection. Expiry code paths in this program do **not** delete:

- users
- restaurants
- menus / menu items / configuration
- QR identity / slug / references
- historical orders
- settlement history
- invoices / payments
- subscription history

No destructive cleanup job was added.

`NONE` (never subscribed) is also non-destructive; it is simply not FROZEN.
