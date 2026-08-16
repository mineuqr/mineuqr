# POS CHECK FINANCIAL BOUNDARY

Intake result `outcome` is always `open`.

Not created:

- payment / tender
- settlement transaction
- Settlement Record
- Register movement
- Shift mutation
- Reporting write

Client `subtotal` / `tax` / `grandTotal` are ignored. Check money is computed inside `ensureCheckForOrder`.
