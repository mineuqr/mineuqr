# DATABASE DESIGN

## Decision

**No new migration.**

Existing persistence is sufficient:

- `operational_checks` — Check aggregate
- `check_order_membership` — Order enrollment uniqueness
- `check_order_settlements` — pending order settlement created by `ensureCheckForOrder`

POS command idempotency is an in-memory orchestration map. It is not a POS Check table and is not required for financial uniqueness.

## Production

Production remains at `0093_pos_sale_idempotency`. This program does not apply migrations.

LOCAL DATABASE MUTATION: **0**  
PRODUCTION DATABASE MUTATION: **0**
