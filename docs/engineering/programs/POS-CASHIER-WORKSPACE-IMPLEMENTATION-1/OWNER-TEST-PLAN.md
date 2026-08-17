# OWNER TEST PLAN

**Program:** POS-CASHIER-WORKSPACE-IMPLEMENTATION-1  
UX is not final. This is product discovery: BUILD → USE → OBSERVE → ADJUST → HARDEN.

Local: Dashboard → restaurant → **الكاشير / Cashier**  
URL: `/dashboard?restaurant={id}&section=cashier`

## What is usable now

1. Dedicated Cashier tab, distinct from Register Ops.
2. Catalog browse (`pos.read.catalog.listItems`) and ticket.
3. Place sale (`pos.sale.create`) when a terminal is active and `POS_ACCESS` + `SALE_CREATE` are granted.
4. Active orders, detail, timeline via `pos.read.orders.*`.
5. Settlement projection via `pos.read.orderSettlement.listByOrder`.
6. Open check / initiate settlement via existing POS commands.
7. RTL (AR) / LTR (EN), touch-sized controls, loading / empty / error / forbidden states.

## Setup the owner should expect

1. Dashboard login as restaurant owner does **not** open cashier automatically.
2. If no active POS terminal: **Create** or **Activate** (uses certified occupancy path).
3. If access is denied: **Enable cashier access for my account** (explicit `pos.access.grant` for current user). Not automatic.
4. Full paid settlement may still require an open financial shift in **Register Ops**.

## What to test manually

- [ ] Cashier tab appears after Orders and is not Register Ops.
- [ ] Arabic RTL and English LTR.
- [ ] Tablet / touch: catalog tap, qty, place sale.
- [ ] Owner without grant sees forbidden, not the catalog.
- [ ] After explicit enable + active terminal, catalog and ticket work.
- [ ] Placing a sale creates an order visible in Active orders (and Orders tab / Order Read).
- [ ] Order detail / timeline match the order.
- [ ] Settlement panel shows projection or empty — not a fabricated total.
- [ ] Initiate settlement without an open shift fails loudly (document the message).
- [ ] Register Ops still has no unpaid-order cashier queue.

## Open UX decisions (do not freeze)

- Category chips labeled by id until catalog names exist.
- Ticket is local until `pos.sale.create` (not a second order aggregate).
- Whether kitchen status belongs on Cashier.
- Whether settlement initiate should deep-link to Register Ops when shift is missing.
