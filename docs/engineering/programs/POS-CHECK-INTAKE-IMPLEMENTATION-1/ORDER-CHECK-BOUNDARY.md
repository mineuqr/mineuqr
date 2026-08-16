# ORDER ↔ CHECK BOUNDARY

POS Sale creates the Order. POS Check Intake consumes that Order.

Eligibility:

- Order exists
- `order.restaurantId` matches PosAccessContext restaurant
- `orderingChannel === cashier_pos`
- Order is not cancelled
- Existing blocking membership, if any, must be on an **open** Check

Channel is not rewritten. Order lifecycle is not rewritten.

Existing Check invariant: one blocking membership per Order (`open|paid|complimentary`). Intake reuses that invariant.
