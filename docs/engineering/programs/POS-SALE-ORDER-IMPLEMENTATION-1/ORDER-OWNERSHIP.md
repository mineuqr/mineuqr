# ORDER OWNERSHIP

Order Domain remains the sole owner of Order truth.

| Concern | Owner |
|---------|--------|
| Order id / number / tracking | Order |
| Lines, qty, modifiers, notes | Order |
| Pricing / tax policy | Order / existing pricing ports |
| Lifecycle / status | Order |
| Persistence | `orders` via IdentityPlaceOrder |
| Channel stamp | Order (`cashier_pos` supplied by POS command) |
| Business Identity sequence | Existing BI (`identityScope = POS`) |
| POS access / SALE_CREATE | POS |
| Terminal / cashier attribution | POS command + existing fulfilment / opsLog |
| Sale idempotency map | POS (`pos_sale_idempotency`) |

No `POSOrder`, `pos_sales`, or `pos_order_lines`.

The router does not import IdentityPlaceOrder. `PosSaleService` is orchestration only.
